import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// The live roster the Managing Director staffs the pipeline from. Mission Control reads this
// reactively; the Hermes skill reads it at intake via GET /roles.
export const listRoles = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db.query("agentRoles").withIndex("by_active", (q) => q.eq("active", true)).collect(),
});

// Add or update a role. UPSERT by roleName so seeding and a spawned role re-posting are idempotent
// (the org converges, it never accumulates duplicates). Defaults to active:true.
export const addRole = mutation({
  args: {
    roleName: v.string(),
    mission: v.string(),
    allowedTools: v.array(v.string()),
    guardrails: v.array(v.string()),
    maxRetriesBeforeEscalate: v.number(),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("agentRoles")
      .withIndex("by_roleName", (q) => q.eq("roleName", a.roleName))
      .first();
    const doc = {
      roleName: a.roleName,
      mission: a.mission,
      allowedTools: a.allowedTools,
      guardrails: a.guardrails,
      maxRetriesBeforeEscalate: a.maxRetriesBeforeEscalate,
      active: a.active ?? true,
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert("agentRoles", doc);
  },
});

// Seed the base roster ONCE (no-op if any roles already exist) so a fresh deploy has an org to staff.
export const seedRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const any = await ctx.db.query("agentRoles").first();
    if (any) return { seeded: 0 };
    const roster = [
      {
        roleName: "Managing Director",
        mission: "Own the brief end-to-end: staff the pipeline from the roster, sequence every stage, and ship a live launch kit.",
        allowedTools: ["web", "terminal", "file"],
        guardrails: ["never let a premium stage block CORE", "report every stage start and end"],
        maxRetriesBeforeEscalate: 2,
      },
      {
        roleName: "Researcher",
        mission: "Run a cited market scan for the vertical and surface the positioning gap the brand should own.",
        allowedTools: ["web", "terminal"],
        guardrails: ["cite sources", "degrade to prior knowledge if search is unavailable"],
        maxRetriesBeforeEscalate: 2,
      },
      {
        roleName: "Namer",
        mission: "Propose three distinctive name + tagline options that fit the brief and the positioning gap.",
        allowedTools: ["web"],
        guardrails: ["no trademarked names", "keep taglines under 8 words"],
        maxRetriesBeforeEscalate: 2,
      },
      {
        roleName: "Reviewer",
        mission: "Score naming candidates on distinctiveness, availability and brief-fit, then lock the winner.",
        allowedTools: ["web"],
        guardrails: ["reject picks scoring under 4", "redo naming at most once"],
        maxRetriesBeforeEscalate: 2,
      },
      {
        roleName: "Copywriter",
        mission: "Write the site copy: headline, hero, three feature pairs, CTA and a signup prompt.",
        allowedTools: ["file"],
        guardrails: ["match the locked brand voice", "keep the signup form intact"],
        maxRetriesBeforeEscalate: 2,
      },
      {
        roleName: "Designer",
        mission: "Optionally generate a brand logo and reference it in the site without blocking CORE.",
        allowedTools: ["image_gen", "file"],
        guardrails: ["degrade silently if image generation fails", "never overwrite working copy"],
        maxRetriesBeforeEscalate: 2,
      },
      {
        roleName: "Publisher",
        mission: "Engineer the self-contained index.html and deploy it live to a real pages.dev URL.",
        allowedTools: ["terminal", "code_execution", "file"],
        guardrails: ["keep the page self-contained", "capture the live URL in the report note"],
        maxRetriesBeforeEscalate: 2,
      },
      {
        roleName: "QA",
        mission: "Confirm the deployed site returns 200 and re-publish once if it does not, then deliver.",
        allowedTools: ["terminal", "web"],
        guardrails: ["re-run publish at most once", "only deliver on a verified 200"],
        maxRetriesBeforeEscalate: 2,
      },
    ];
    for (const r of roster) await ctx.db.insert("agentRoles", { ...r, active: true });
    return { seeded: roster.length };
  },
});
