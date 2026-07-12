import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Progress reports from the Hermes skill (report_progress.sh) → animates Mission Control.
http.route({
  path: "/report",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const b = await req.json();
    if (!b.job_id || !b.node || !b.status) return new Response("bad payload", { status: 400 });
    await ctx.runMutation(api.report.appendEvent, {
      jobId: b.job_id,
      node: String(b.node),
      status: String(b.status),
      note: b.note ?? undefined,
      model: b.model ?? undefined,
      costUsd: typeof b.cost_usd === "number" ? b.cost_usd : undefined,
      tokens: typeof b.tokens === "number" ? b.tokens : undefined,
    });
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
    const b = await req.json();
    const jobId = b.job_id ?? b.jobId;
    if (!jobId || !b.vertical) return new Response("bad payload", { status: 400 });
    try {
      await ctx.runMutation(api.jobs.setVertical, { jobId, vertical: String(b.vertical) });
    } catch {
      return new Response("bad job_id", { status: 400 });
    }
    return new Response("ok", { status: 200 });
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
