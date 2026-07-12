import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The spine. Mission Control reads all of this reactively (no polling in the UI).
export default defineSchema({
  jobs: defineTable({
    brief: v.string(),
    clientName: v.string(),
    clientId: v.optional(v.string()), // stable id for returning-client memory
    vertical: v.optional(v.string()), // SET at intake via setVertical — without it the delta banner is blank
    status: v.union(
      v.literal("queued"),
      v.literal("working"),
      v.literal("invoiced"),
      v.literal("paid"),
      v.literal("delivered"),
      v.literal("stuck"),
    ),
    queuePos: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    durationS: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    skillLoaded: v.optional(v.boolean()), // false = job ran cold (no playbook); true = playbook loaded
    lastEventAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  events: defineTable({
    jobId: v.id("jobs"),
    node: v.string(),   // intake|research|naming|copy|design|engineer|publish|voice|qa|invoice|deliver|learn
    status: v.string(), // started|done|failed|skipped
    note: v.optional(v.string()),
    model: v.optional(v.string()),
    costUsd: v.optional(v.number()),
    tokens: v.optional(v.number()),
    ts: v.number(),
  }).index("by_job", ["jobId"]),

  artifacts: defineTable({
    jobId: v.id("jobs"),
    kind: v.string(), // name|brief|logo|site|audio
    url: v.string(),
    meta: v.optional(v.any()),
  }).index("by_job", ["jobId"]),

  payments: defineTable({
    jobId: v.id("jobs"),
    linkId: v.string(),
    status: v.string(), // created|paid
    amount: v.optional(v.number()),
  })
    .index("by_job", ["jobId"])
    .index("by_link", ["linkId"]),

  // One row per completed job in a vertical → powers the LIVE delta banner.
  // durationS is REAL wall-clock. costUsd is honest ONLY if wired to Langfuse (see 15-MASTER §5); until then treat as self-reported.
  skillMetrics: defineTable({
    vertical: v.string(),
    jobN: v.number(),
    durationS: v.number(),
    costUsd: v.number(),
    jobId: v.id("jobs"),
  }).index("by_vertical", ["vertical"]),

  // NEW — powers the +50 cross-track (signups). Every shipped site posts here via the /lead Worker.
  leads: defineTable({
    email: v.string(),
    sourceUrl: v.string(),
    jobId: v.optional(v.id("jobs")),
    consent: v.boolean(),
    ts: v.number(),
  }),

  // The emergent org: the MD staffs the pipeline from this live roster and can SPAWN new roles
  // (e.g. Compliance Reviewer for a regulated brief) that the org then "remembers".
  // Read at runtime by the skill via GET /roles; edited live from Mission Control via addRole.
  agentRoles: defineTable({
    roleName: v.string(),
    mission: v.string(),
    allowedTools: v.array(v.string()), // subset of: web terminal image_gen tts file code_execution
    guardrails: v.array(v.string()),
    maxRetriesBeforeEscalate: v.number(),
    active: v.boolean(),
  })
    .index("by_active", ["active"])
    .index("by_roleName", ["roleName"]),
});
