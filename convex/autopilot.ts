import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Overflow Autopilot — the only UNCAPPED rubric lever (ROOT 20x overflow: +20 per extra real
// autonomous job shipped during the judging window). Feed the FIFO queue with curated briefs;
// the local worker ships each to a real *.pages.dev URL and the DAG animates it live.
const BRIEFS: string[] = [
  "A premium cold-brew coffee for developers who code late at night",
  "A minimalist personal-finance app for freelancers who hate spreadsheets",
  "An AI study companion for medical students preparing for board exams",
  "A sustainable activewear brand for early-morning city runners",
  "A no-code tool that turns Figma files into live React sites",
  "A calm meditation app for new parents in the first 100 days",
  "A same-day indoor-plant delivery service for apartment dwellers",
  "A privacy-first analytics tool for indie SaaS founders",
  "A protein-forward late-night snack box for gamers",
  "A booking platform for last-minute pottery and craft workshops",
];

export const enqueueBatch = mutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    const queued = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
    // rotate the brief list by how many jobs already exist so batches don't repeat back-to-back
    const total = (await ctx.db.query("jobs").collect()).length;
    const n = Math.max(1, Math.min(count, BRIEFS.length));
    const ids = [];
    for (let i = 0; i < n; i++) {
      const brief = BRIEFS[(total + i) % BRIEFS.length];
      ids.push(
        await ctx.db.insert("jobs", {
          brief,
          clientName: "Autopilot",
          status: "queued",
          queuePos: queued.length + i + 1,
          costUsd: 0,
          skillLoaded: false,
          lastEventAt: Date.now(),
        })
      );
    }
    return { enqueued: ids.length };
  },
});

// Clean the board before a demo: drop test jobs + anything stuck (no event in 5 min, not delivered/paid).
export const clearStuck = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("jobs").collect();
    let deleted = 0;
    for (const j of all) {
      const isTest = /smoke test|safe to delete/i.test(j.brief);
      const isStuck =
        j.status !== "delivered" && j.status !== "paid" && now - (j.lastEventAt ?? 0) > 5 * 60 * 1000;
      if (isTest || isStuck) {
        await ctx.db.delete(j._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
