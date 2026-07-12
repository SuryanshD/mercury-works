// Local worker — the bridge. Makes ONLY outbound connections:
//   subscribes/polls Convex for queued jobs → runs Hermes locally via `docker exec` → the
//   launch-kit skill reports every stage back to Convex directly (report_progress.sh).
// No inbound tunnel, no VM, no OpenAI-compatible HTTP API (this image has none on :8642 —
// see SETUP-FRESH-MAC.md Gotcha #4 / Phase 3.5). The integration is a per-job one-shot:
//   docker exec hermes hermes -z "<prompt>" --provider gemini -m gemini-flash-latest --yolo
// The skill runs its stages SEQUENTIALLY inside that single agent (Gotcha #9: top-level
// delegate_task is async and loses results under one-shot -z, so we do NOT fan out here).
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import "dotenv/config";

const CONVEX_URL = process.env.CONVEX_URL;
const CONTAINER = process.env.HERMES_CONTAINER || "hermes";
const PROVIDER = process.env.LLM_PROVIDER || "gemini";
const MODEL = process.env.LLM_MODEL || "gemini-flash-latest";
const MAX = Number(process.env.MAX_CONCURRENT || 1); // 1 for SCORED runs (reliability); raise to 3 only for the optional RACE flourish after clean runs are banked

// Rancher's docker CLI lives at ~/.rd/bin/docker; fall back to PATH / common prefixes.
const DOCKER =
  process.env.DOCKER_BIN ||
  [`${process.env.HOME}/.rd/bin/docker`, "/usr/local/bin/docker", "/opt/homebrew/bin/docker"].find((p) => existsSync(p)) ||
  "docker";

if (!CONVEX_URL) {
  console.error("CONVEX_URL missing — set it in ~/mercury-proto/.env");
  process.exit(1);
}
const convex = new ConvexHttpClient(CONVEX_URL);

function runJob(job) {
  const prompt =
    `JOB_ID=${job.jobId}\n` +
    `CLIENT BRIEF: ${job.brief}\n\n` +
    `You are the Managing Director of Mercury Works, an autonomous creative agency. ` +
    `Run the /launch-kit skill for this brief. Report EVERY stage to Convex via the skill's ` +
    `report_progress.sh script (that is what the audience sees). ` +
    (job.skillLoaded
      ? `A launch-kit-playbook skill exists — load it and skip rediscovery.`
      : `No playbook exists yet — do the full discovery, then write one with skill_manage(action='create').`);

  // execFile with an args array → the brief is passed as one argv element (no shell, no injection).
  const args = ["exec", CONTAINER, "hermes", "-z", prompt, "--provider", PROVIDER, "-m", MODEL, "--yolo"];
  return new Promise((resolve) => {
    // timeout is the demo lifesaver: a hung agent (model wait, docker wedge, network stall) would
    // otherwise never resolve, pinning `active` at MAX and freezing the whole queue for the session.
    execFile(DOCKER, args, { maxBuffer: 64 * 1024 * 1024, timeout: 12 * 60 * 1000, killSignal: "SIGKILL" }, async (err, stdout, stderr) => {
      if (err) {
        console.error(`job ${job.jobId} failed: ${err.message}`);
        if (stderr) console.error(stderr.slice(0, 500));
        // Never leave the job "working" forever — mark it stuck so Mission Control shows the failure
        // (red ✕) instead of a frozen DAG, and the operator can re-queue.
        try { await convex.mutation(anyApi.jobs.markStuck, { jobId: job.jobId, note: `worker: ${String(err.message).slice(0, 80)}` }); }
        catch (e) { console.error("markStuck failed:", e.message); }
      } else {
        console.log(`job ${job.jobId} done`);
      }
      resolve();
    });
  });
}

let active = 0;
let ticking = false; // guard: a slow claim must not let two overlapping ticks exceed MAX_CONCURRENT
console.log(`worker: polling ${CONVEX_URL} for queued jobs (max ${MAX} concurrent) → docker exec ${CONTAINER} hermes -z (${PROVIDER}/${MODEL})`);
setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    while (active < MAX) {
      let job;
      try {
        job = await convex.mutation(anyApi.jobs.claimNextJob, {});
      } catch (e) {
        console.error("claim error:", e.message);
        break;
      }
      if (!job) break;
      active++;
      console.log(`claimed ${job.jobId} (active ${active})`);
      runJob(job)
        .catch((e) => console.error("run error:", e.message))
        .finally(() => {
          active--;
        });
    }
  } finally {
    ticking = false;
  }
}, 1000);
