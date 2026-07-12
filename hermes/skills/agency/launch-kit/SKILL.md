---
name: launch-kit
description: Autonomous brand-identity pipeline for a client brief
version: 0.2.0
metadata:
  hermes:
    tags: [agency, pipeline]
    category: agency
    requires_toolsets: [terminal, web]
required_environment_variables:
  - {name: CONVEX_REPORT_URL}
  - {name: CONVEX_SET_VERTICAL_URL}
  - {name: LINKUP_API_KEY}
  - {name: ELEVENLABS_API_KEY}
---

<!-- ⚠️ SCAFFOLD / TEMPLATE ONLY (reference design). The real Procedure is authored IN THE ROOM
     on July 12 (Rule 04/05 — see 13-DISCLOSURE.md). This is the corrected blueprint to rebuild from.
     Master spec: 15-MASTER-BUILD-DOC.md §4. -->

# When to Use
An API request supplies `JOB_ID` and a client product brief (a "digital identity / brand" request).

# Procedure
Every stage starts AND ends with:
`bash ${HERMES_SKILL_DIR}/scripts/report_progress.sh "$JOB_ID" <node> <started|done|failed|rejected|revised> "<note>"`
Node ids: `intake research naming review copy engineer logo publish voice invoice learn`. `deliver` is reported as an event (drives the celebratory flood-fill), not a chip.

1. **intake** — parse JOB_ID + brief. **Classify the vertical** (e.g. "clothing", "saas", "food") and POST it to `$CONVEX_SET_VERTICAL_URL` — WITHOUT this the learning-delta banner stays blank. If a `<vertical>-identity` playbook skill exists, load it and skip rediscovery.
2. **research** (Linkup) — cited market scan + a **name-availability** query (is the candidate name a live brand / is the domain/slug free). Fallback: on timeout/error, report `failed`, skip, and reason from prior knowledge — never fail the run.
3. **naming** — propose 3 name + tagline options.
4. **review** (this is the org-structure L4 beat) — score the candidates 1–5 on {distinctiveness, availability, brief-fit}. If the top score < 4, report `naming rejected "<reason>"`, **re-delegate naming once** with the reason, then report `naming revised` and pick the winner. This produces the review→revise loop the DAG shows and the demo narrates.
5. **CORE publish (must succeed before any premium work):** copy → assemble a **static HTML** site from `templates/landing-page/` (name + tagline + copy; the CORE engine is gpt-5.6-sol emitting HTML in one call — NO Codex on the critical path) → `scripts/deploy_page.sh` → live URL → post as `site` artifact. `deploy_page.sh` must: probe the slug and **auto-suffix** on collision, fall back to the static template if engine output is missing/invalid, use a per-job `$JOB_ID` workdir, and a unique CF Pages project per job.
6. **PREMIUM upgrades** (each re-publishes on success, degrades on failure — never blocks CORE): **logo** (OpenAI GPT Image) · **voice** ad (ElevenLabs, embedded tap-to-play) · **engineer** (Codex `codex exec`, optional, with an inline-HTML fallback) · **invoice** (Dodo Payments TEST, optional).
7. **qa** — verify every declared artifact exists; fill any gap with a placeholder. Report `deliver done`.
8. **learn** — `skill_manage(action="create")` writes/patches the `<vertical>-identity` playbook so the next same-vertical brief is faster. Fallback: `execute_code` writes the SKILL.md. (Org-learning — kept SEPARATE from the Eval param.)

# Pitfalls
- A failed tool call never stops the pipeline: report `failed`, degrade, continue. Reporting outranks output quality — the big screen must never go blank.
- CORE (name+tagline+copy+live site) must never depend on a premium stage.
- Emit the IDENTICAL vertical string on the pre-staged and live A/B runs so the delta computes.

# Verification
Vertical set; CORE site live; all artifacts posted; delivered; playbook written; the review→revise loop visible; no stage unreported.
