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

    if (a.node === "invoice" && a.status === "done") {
      patch.status = "invoiced";
    } else if (a.node === "deliver" && a.status === "done") {
      patch.status = "delivered";
      patch.finishedAt = now;
      if (job.startedAt) patch.durationS = Math.round((now - job.startedAt) / 1000);
    } else if (job.status === "queued") {
      patch.status = "working";
    }
    await ctx.db.patch(a.jobId, patch);

    // On delivery, snapshot the metric that feeds the live delta banner.
    if (patch.status === "delivered" && job.vertical) {
      const prior = await ctx.db
        .query("skillMetrics")
        .withIndex("by_vertical", (q) => q.eq("vertical", job.vertical!))
        .collect();
      await ctx.db.insert("skillMetrics", {
        vertical: job.vertical,
        jobN: prior.length + 1,
        durationS: (patch.durationS as number) ?? 0,
        costUsd: ((patch.costUsd as number) ?? job.costUsd) ?? 0,
        jobId: a.jobId,
      });
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
    if (job && job.status !== "delivered") await ctx.db.patch(pay.jobId, { status: "paid" });
  },
});

// Dodo webhook path: the Dodo payment carries metadata.job_id (create_invoice.sh sets it) and there
// is no payments row, so /dodo-webhook flips the job to paid directly by its id.
export const markJobPaid = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (job && job.status !== "delivered") await ctx.db.patch(jobId, { status: "paid" });
  },
});
