# Mercury Works — app

Autonomous creative agency on Hermes. Provider-agnostic: every credential + provider lives in `.env`, so switching (e.g. Gemini→gpt-5.6-sol on provider openai-api for event day) is a one-value edit. See `../SETUP-PERSONAL.md` to run it and `../docs`/root docs for strategy, architecture, and the demo script.

## Structure
```
app/
  convex/      # backend + spine: schema, mutations, httpActions (/report, /dodo-webhook), FIFO queue, dispatch
  web/         # Mission Control (big screen: job board + live DAG + delta) + client page (mobile brief→pay→deliver)
  worker/      # local Node poller: subscribes to Convex (outbound), drives Hermes one-shot via docker exec hermes hermes -z "<prompt>" --yolo, writes events back
  hermes/      # skill files + scripts → copied/symlinked to ~/.hermes/skills/agency/ on the personal laptop
    skills/agency/launch-kit/       SKILL.md + scripts/ (report_progress, linkup_search, codex_build, deploy_page, voiceover, create_invoice)
    skills/agency/launch-kit-playbook/   (its SKILL.md written LIVE by the agent — the learning beat)
  scripts/     # smoke-test.sh (verify every provider in one command)
  .env.example # single source of truth for all credentials/providers
```

## Connection model (no tunnel, no VPS — outbound only)
Hermes runs locally inside the Rancher Desktop (dockerd/moby) Linux VM; everything is outbound from the laptop. `worker` subscribes to Convex for `status=queued` jobs and drives Hermes locally via `docker exec`; the running skill's `report_progress.sh` pushes `events` back to Convex. Mission Control (Cloudflare Pages / localhost) and audience phones read Convex reactively. Only requirement: stable internet (phone hotspot).

## Build order (each step independently demoable)
1. Convex: schema + `dispatchJob` (enqueue) + `/report` httpAction + reactive queries.
2. web: client brief form (inserts job) + Mission Control job board & activity feed rendering live events.
3. hermes: `launch-kit` SKILL.md (pipeline) + `report_progress.sh` + `linkup_search.sh`. Worker wires Convex↔Hermes.
4. Full pipeline: deploy_page + voiceover + logo (OpenAI GPT Image) + codex_build (engineer) + create_invoice; Dodo Payments webhook → PAID → unlock.
5. DAG view (9 fixed nodes, model-labelled) + FIFO race + LIVE A/B delta from Langfuse tokens.
6. Polish (per `../10-DESIGN-SPEC.md`), backup video, rehearse.

Tech: React+Vite+Tailwind, Convex, Node worker (convex client), bash scripts. No auth, no graph lib, no over-abstraction — demo-first.
