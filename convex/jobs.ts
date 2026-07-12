import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Client (phone) submits a brief → enqueued FIFO.
export const enqueueJob = mutation({
  args: {
    brief: v.string(),
    clientName: v.string(),
    vertical: v.optional(v.string()),
    skillLoaded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const queued = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
    return await ctx.db.insert("jobs", {
      brief: args.brief,
      clientName: args.clientName,
      vertical: args.vertical,
      skillLoaded: args.skillLoaded ?? false,
      status: "queued",
      queuePos: queued.length + 1,
      costUsd: 0,
      lastEventAt: Date.now(),
    });
  },
});

// The local worker claims the oldest queued job (transactional → safe with a small worker pool).
export const claimNextJob = mutation({
  args: {},
  handler: async (ctx) => {
    const next = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .order("asc")
      .first();
    if (!next) return null;
    await ctx.db.patch(next._id, {
      status: "working",
      startedAt: Date.now(),
      lastEventAt: Date.now(),
    });
    return { jobId: next._id, brief: next.brief, vertical: next.vertical ?? null, skillLoaded: next.skillLoaded ?? false };
  },
});

export const listJobs = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("jobs").order("desc").take(20),
});

// The worker calls this when a run ends without delivering (docker error / timeout / crash),
// so the DAG shows a failure (STUCK ✕) instead of freezing on a job that stays "working" forever.
export const markStuck = mutation({
  args: { jobId: v.id("jobs"), note: v.optional(v.string()) },
  handler: async (ctx, { jobId, note }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return;
    if (job.status !== "delivered" && job.status !== "paid") {
      await ctx.db.patch(jobId, { status: "stuck", lastEventAt: Date.now() });
      await ctx.db.insert("events", { jobId, node: "deliver", status: "failed", note: note ?? "run ended without delivery", ts: Date.now() });
    }
  },
});

export const getJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => await ctx.db.get(jobId),
});

export const jobEvents = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) =>
    await ctx.db.query("events").withIndex("by_job", (q) => q.eq("jobId", jobId)).order("asc").collect(),
});

export const jobArtifacts = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) =>
    await ctx.db.query("artifacts").withIndex("by_job", (q) => q.eq("jobId", jobId)).collect(),
});

// The two most-recent completed jobs in a vertical → the delta banner (job 1 vs job 2).
export const deltaForVertical = query({
  args: { vertical: v.string() },
  handler: async (ctx, { vertical }) => {
    const m = await ctx.db
      .query("skillMetrics")
      .withIndex("by_vertical", (q) => q.eq("vertical", vertical))
      .order("asc")
      .take(2);
    return m;
  },
});

// The agent classifies the brief's vertical at intake and patches it here.
// Without this the delta banner is BLANK (skillMetrics is only written when job.vertical is set).
export const setVertical = mutation({
  args: { jobId: v.id("jobs"), vertical: v.string() },
  handler: async (ctx, { jobId, vertical }) => {
    await ctx.db.patch(jobId, { vertical });
  },
});

// Cross-track signups — the /lead Worker on every shipped site posts here.
export const captureLead = mutation({
  args: {
    email: v.string(),
    sourceUrl: v.string(),
    jobId: v.optional(v.id("jobs")),
    consent: v.boolean(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("leads", { ...a, ts: Date.now() });
  },
});

export const listLeads = query({ args: {}, handler: async (ctx) => await ctx.db.query("leads").order("desc").take(50) });
export const leadCount = query({ args: {}, handler: async (ctx) => (await ctx.db.query("leads").collect()).length });

// Hero DAG: newest working job, with a defined tie-break so it never flickers when MAX_CONCURRENT>1.
export const getActiveJob = query({
  args: {},
  handler: async (ctx) => {
    const working = await ctx.db.query("jobs").withIndex("by_status", (q) => q.eq("status", "working")).collect();
    if (working.length === 0) return null;
    working.sort((a, b) => (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0) || b._creationTime - a._creationTime);
    return working[0];
  },
});

// The delta banner self-selects the newest vertical that has >=2 completed jobs.
export const latestVerticalWithDelta = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("skillMetrics").collect();
    const byV = new Map();
    for (const m of all) { const arr = byV.get(m.vertical) ?? []; arr.push(m); byV.set(m.vertical, arr); }
    let best = null as null | { vertical: string; rows: any[]; latest: number };
    for (const [vertical, rows] of byV) {
      if (rows.length < 2) continue;
      rows.sort((a, b) => a.jobN - b.jobN);
      const latest = Math.max(...rows.map((r) => r._creationTime));
      if (!best || latest > best.latest) best = { vertical, rows: rows.slice(0, 2), latest };
    }
    return best ? { vertical: best.vertical, rows: best.rows } : null;
  },
});
