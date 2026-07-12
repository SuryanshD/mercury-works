import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Progress reports from the Hermes skill (report_progress.sh) → animates Mission Control.
http.route({
  path: "/report",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await req.json().catch(() => null);
    if (!b || !b.job_id || !b.node || !b.status) return new Response("bad payload", { status: 400 });
    try {
      await ctx.runMutation(api.report.appendEvent, {
        jobId: b.job_id,
        node: String(b.node),
        status: String(b.status),
        note: b.note ?? undefined,
        model: b.model ?? undefined,
        costUsd: typeof b.cost_usd === "number" ? b.cost_usd : undefined,
        tokens: typeof b.tokens === "number" ? b.tokens : undefined,
      });
    } catch {
      // a bad/stale job_id must NOT 500 — that would freeze the live DAG for every later stage.
      return new Response("bad job_id", { status: 400 });
    }
    return new Response("ok", { status: 200 });
  }),
});

// Vertical classification from the skill's intake stage → sets jobs.vertical so the
// learning-delta banner (skillMetrics) can populate. Tolerant of job_id | jobId since the
// agent hand-writes this POST (no helper script, unlike report_progress.sh).
http.route({
  path: "/set-vertical",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await req.json().catch(() => null);
    const jobId = b?.job_id ?? b?.jobId;
    if (!b || !jobId || !b.vertical) return new Response("bad payload", { status: 400 });
    try {
      await ctx.runMutation(api.jobs.setVertical, { jobId, vertical: String(b.vertical) });
    } catch {
      return new Response("bad job_id", { status: 400 });
    }
    return new Response("ok", { status: 200 });
  }),
});

// Emergent-org roster. GET returns the active roles as JSON — the skill curls this at intake to
// staff the pipeline. POST persists a role the MD SPAWNED mid-brief (e.g. Compliance Reviewer) so
// the org "remembers" its new structure. Tolerant of hand-written payloads, like /set-vertical.
http.route({
  path: "/roles",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const roles = await ctx.runQuery(api.agentRoles.listRoles, {});
    return new Response(JSON.stringify(roles), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/roles",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await req.json().catch(() => null);
    const roleName = b?.roleName ?? b?.role_name;
    if (!b || !roleName || !b.mission) return new Response("bad payload", { status: 400 });
    const asArray = (x: unknown) =>
      Array.isArray(x) ? x.map(String) : typeof x === "string" && x.trim() ? x.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const maxRetries = b.maxRetriesBeforeEscalate ?? b.max_retries;
    try {
      await ctx.runMutation(api.agentRoles.addRole, {
        roleName: String(roleName),
        mission: String(b.mission),
        allowedTools: asArray(b.allowedTools ?? b.allowed_tools),
        guardrails: asArray(b.guardrails),
        maxRetriesBeforeEscalate: typeof maxRetries === "number" ? maxRetries : 2,
        active: typeof b.active === "boolean" ? b.active : undefined,
      });
    } catch {
      return new Response("bad payload", { status: 400 });
    }
    return new Response("ok", { status: 200 });
  }),
});

// Cross-track signups: every shipped *.pages.dev landing page's email form POSTs here.
// Cross-origin (pages.dev -> convex.site) so it needs CORS + an OPTIONS preflight.
const LEAD_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
http.route({
  path: "/lead",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: LEAD_CORS })),
});
http.route({
  path: "/lead",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await req.json().catch(() => null);
    if (!b || !b.email) return new Response("bad payload", { status: 400, headers: LEAD_CORS });
    const jobId = b.job_id ?? b.jobId;
    try {
      await ctx.runMutation(api.jobs.captureLead, {
        email: String(b.email),
        sourceUrl: String(b.sourceUrl ?? ""),
        jobId: jobId || undefined,
        consent: Boolean(b.consent ?? false),
      });
    } catch {
      // never fail a visitor's signup on a bad optional field (e.g. a stale jobId)
    }
    return new Response("ok", { status: 200, headers: LEAD_CORS });
  }),
});

// Razorpay webhook: on payment_link.paid, flip the job to PAID (unlocks deliverables live).
http.route({
  path: "/razorpay-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = await req.text();
    const sig = req.headers.get("X-Razorpay-Signature") ?? "";
    const ok = await verifyHmac(raw, sig, process.env.RAZORPAY_WEBHOOK_SECRET ?? "");
    if (!ok) return new Response("bad signature", { status: 400 });
    const body = JSON.parse(raw);
    if (body.event === "payment_link.paid") {
      const linkId = body?.payload?.payment_link?.entity?.id;
      if (linkId) await ctx.runMutation(api.report.markPaid, { linkId });
    }
    return new Response("ok", { status: 200 });
  }),
});

// Dodo Payments webhook (Standard Webhooks / Svix signature). On payment.succeeded, flip the job —
// identified by the metadata.job_id set at checkout in create_invoice.sh — to PAID (unlocks the
// deliverable + fires the celebratory beat). The secret lives in the CONVEX env, set with:
//   npx convex env set DODO_PAYMENTS_WEBHOOK_KEY whsec_...   (NOT ~/.hermes/.env).
http.route({
  path: "/dodo-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = await req.text();
    const ok = await verifyStandardWebhook(raw, req.headers, process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? "");
    if (!ok) return new Response("bad signature", { status: 401 });
    let body: any;
    try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
    const type = body?.type ?? body?.event_type;
    if (type === "payment.succeeded") {
      // metadata.job_id was set on the payment; Dodo may nest it under data / data.payment.
      const md = body?.data?.metadata ?? body?.data?.payment?.metadata ?? body?.metadata ?? {};
      const jobId = md.job_id ?? md.jobId;
      if (jobId) {
        try { await ctx.runMutation(api.report.markJobPaid, { jobId }); } catch { /* stale/absent job id — ignore */ }
      }
    }
    return new Response("ok", { status: 200 });
  }),
});

// Standard Webhooks (Svix) verify for Dodo. Secret is "whsec_<base64>"; signed content is
// `${webhook-id}.${webhook-timestamp}.${body}`; the webhook-signature header is a space-separated
// list of `v1,<base64 HMAC-SHA256>`. Empty secret → skip (local dev only).
async function verifyStandardWebhook(raw: string, headers: Headers, secret: string): Promise<boolean> {
  if (!secret) return true;
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;
  try {
    const b64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    // Standard Webhooks: only accept a v1 signature; a malformed secret can't crash the route.
    return sigHeader.split(" ").some((p) => { const [ver, s] = p.split(","); return ver === "v1" && s === expected; });
  } catch {
    return false;
  }
}

// HMAC-SHA256 verify via Web Crypto (available in Convex's runtime). Empty secret → skip (local dev only).
async function verifyHmac(raw: string, sig: string, secret: string): Promise<boolean> {
  if (!secret) return true;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === sig;
}

export default http;
