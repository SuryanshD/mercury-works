import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Called (via the /report httpAction) by the Hermes skill's report_progress.sh on every stage.
export const appendEvent = mutation({
  args: {
    jobId: v.id("jobs"),
    node: v.string(),
    status: v.string(),
    note: v.optional(v.string()),
    model: v.optional(v.string()),
    costUsd: v.optional(v.number()),
    tokens: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const now = Date.now();
    await ctx.db.insert("events", { ...a, ts: now });
    const job = await ctx.db.get(a.jobId);
    if (!job) return;

    const patch: Record<string, unknown> = { lastEventAt: now };
    if (a.costUsd) patch.costUsd = (job.costUsd ?? 0) + a.costUsd;

    // Capture the deployed site URL the moment publish/deliver reports it, so the
    // queue + stage can link straight to the live *.pages.dev site (no digging in the feed).
    if ((a.node === "publish" || a.node === "deliver") && a.status === "done" && a.note) {
      const url = (a.note.match(/https?:\/\/[^\s"']+/) || [])[0];
      if (url) patch.liveUrl = url.replace(/[).,]+$/, "");
    }

    // Never regress a job that already reached a terminal state (a retried/duplicate
    // invoice-or-deliver event must not flip delivered/paid back to invoiced).
    const terminal = job.status === "delivered" || job.status === "paid";
    if (a.node === "invoice" && a.status === "done") {
      if (!terminal) patch.status = "invoiced";
    } else if (a.node === "deliver" && a.status === "done") {
      if (!terminal) {
        patch.status = "delivered";
        patch.finishedAt = now;
        if (job.startedAt) patch.durationS = Math.round((now - job.startedAt) / 1000);
      }
    } else if (job.status === "queued") {
      patch.status = "working";
    }
    await ctx.db.patch(a.jobId, patch);

    // On the FIRST delivery only, snapshot the metric that feeds the live delta banner.
    // Idempotent: a duplicate deliver event must NOT insert a second row (which would make
    // the banner compare the job to itself and fake a ~0% learning delta).
    if (patch.status === "delivered" && job.vertical) {
      const prior = await ctx.db
        .query("skillMetrics")
        .withIndex("by_vertical", (q) => q.eq("vertical", job.vertical!))
        .collect();
      if (!prior.some((m) => m.jobId === a.jobId)) {
        await ctx.db.insert("skillMetrics", {
          vertical: job.vertical,
          jobN: prior.length + 1,
          durationS: (patch.durationS as number) ?? 0,
          costUsd: ((patch.costUsd as number) ?? job.costUsd) ?? 0,
          jobId: a.jobId,
        });
      }
    }
  },
});

// The skill records the Razorpay link it created so the webhook can match it back to the job.
export const recordPayment = mutation({
  args: { jobId: v.id("jobs"), linkId: v.string(), amount: v.optional(v.number()) },
  handler: async (ctx, a) => {
    await ctx.db.insert("payments", { jobId: a.jobId, linkId: a.linkId, amount: a.amount, status: "created" });
  },
});

// Called by the /razorpay-webhook httpAction on payment_link.paid.
export const markPaid = mutation({
  args: { linkId: v.string() },
  handler: async (ctx, { linkId }) => {
    const pay = await ctx.db.query("payments").withIndex("by_link", (q) => q.eq("linkId", linkId)).first();
    if (!pay) return;
    await ctx.db.patch(pay._id, { status: "paid" });
    const job = await ctx.db.get(pay.jobId);
    // `paid` is the terminal celebratory state and the demo flow is deliver-THEN-buy,
    // so a delivered job MUST be allowed to flip to paid. Only skip if already paid.
    if (job && job.status !== "paid") await ctx.db.patch(pay.jobId, { status: "paid" });
  },
});

// Dodo webhook path: the Dodo payment carries metadata.job_id (create_invoice.sh sets it) and there
// is no payments row, so /dodo-webhook flips the job to paid directly by its id.
export const markJobPaid = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    // The site is delivered FIRST, then bought — so `delivered` must be allowed to
    // become `paid` (the celebratory ◆ beat). Idempotent: skip only if already paid.
    if (job && job.status !== "paid") await ctx.db.patch(jobId, { status: "paid" });
  },
});

// One-time backfill: set liveUrl on existing delivered/paid jobs from their events,
// so the queue shows the live link for jobs shipped before liveUrl was persisted.
export const backfillLiveUrls = mutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").collect();
    let patched = 0;
    for (const job of jobs) {
      if (job.liveUrl) continue;
      const evs = await ctx.db.query("events").withIndex("by_job", (q) => q.eq("jobId", job._id)).collect();
      const hit = [...evs].reverse().find(
        (e) => (e.node === "deliver" || e.node === "publish") && e.status === "done" && (e.note || "").match(/https?:\/\//)
      );
      const url = hit && (hit.note!.match(/https?:\/\/[^\s"']+/) || [])[0];
      if (url) { await ctx.db.patch(job._id, { liveUrl: url.replace(/[).,]+$/, "") }); patched++; }
    }
    return { patched };
  },
});
