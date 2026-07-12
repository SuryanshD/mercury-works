---
name: launch-kit
description: Autonomous brand-identity pipeline — turns a one-line client brief into a live, deployed, premium launch kit (named brand + cited market brief + designed landing site + logo + voice ad + Dodo checkout)
version: 1.1.0
metadata:
  hermes:
    tags: [agency, pipeline]
    category: agency
    requires_toolsets: [terminal, web]
required_environment_variables:
  - {name: CONVEX_REPORT_URL}
  - {name: CONVEX_SET_VERTICAL_URL}
  - {name: LINKUP_API_KEY}
  - {name: CLOUDFLARE_API_TOKEN}
  - {name: CLOUDFLARE_ACCOUNT_ID}
  - {name: OPENAI_API_KEY}
---

# When to use
A request supplies `JOB_ID` and a one-line client brief. You are the **Managing Director of Mercury Works**, an autonomous creative agency. Ship a real, live, **premium** launch kit.

# Setup
- `SK=/opt/data/skills/agency/launch-kit` — scripts in `$SK/scripts`, template in `$SK/templates/landing-page/index.html`.
- `WORK=/tmp/job-$JOB_ID` — the per-job build dir. `mkdir -p $WORK`.
- Report EVERY stage at start and end: `bash $SK/scripts/report_progress.sh "$JOB_ID" <node> <started|done|failed|rejected|revised> "<=80-char note>"`. Node ids: `intake research naming review copy engineer publish voice invoice qa deliver learn`.
- **Reporting outranks output quality — never let the screen blank.** Any tool failure → report `failed`, degrade, continue. CORE (name + live site) must never depend on a premium asset.
- **CRITICAL: write files with the terminal tool** (a bash heredoc or a `python3` replace), **NOT the `write_file` tool** — the write-guard blocks `write_file` for `/tmp` paths.

# Procedure
1. **intake** — Parse JOB_ID + brief. Classify the **vertical** (one word). POST it: `curl -s -m 5 -X POST "$CONVEX_SET_VERTICAL_URL" -H 'Content-Type: application/json' -d "{\"job_id\":\"$JOB_ID\",\"vertical\":\"<vertical>\"}"`. **Staff the pipeline from the live roster** (roster URL = the report URL with `/report`→`/roles`): `ROLES=$(curl -s -m 5 "${CONVEX_REPORT_URL%/report}/roles")` — each stage below is owned by a role in `$ROLES`; honor that role's `allowedTools`, `guardrails`, and `maxRetriesBeforeEscalate` (staff the CORE roster from memory if `$ROLES` is empty). Then run the **emergent-role check** (see "# Emergent roles" — additive, never blocks CORE). Report `intake done`.
2. **research** — `bash $SK/scripts/linkup_search.sh "<vertical> market 2025: positioning gaps + top competitors for: <brief>" standard`. If `LINKUP_UNAVAILABLE`, report `research failed` and reason from knowledge. Else report `research done` (note that it has citations).
3. **naming** — Propose 3 name + tagline options fitting the positioning gap. Report `naming done`.
4. **review** — Score candidates on {distinctiveness, availability, brief-fit}; run `bash $SK/scripts/linkup_search.sh "Is '<top name>' an existing brand and is <slug>.com taken?" standard`. If the top pick is taken or weak: report `review rejected "<reason>"`, redo naming **once**, report `review revised "<winner>"`. Else report `review done`. Lock the **winning name + tagline**.
5. **copy** — Write, as JSON in your head: `HEADLINE` (short, editorial — not "Welcome to X"), `HERO_COPY` (1 sentence), `MANIFESTO` (1 punchy "why now" sentence; you may wrap 3-4 key words in `<b>...</b>`), 3× `FEATURE_TITLE`+`FEATURE_BODY`, `CTA_TEXT`, `SIGNUP_HEADLINE`, `SIGNUP_PROMPT`. Also choose one **`ACCENT`** hex that fits the brand's world (NOT always amber — pick per vertical). Report `copy done`.
6. **assets (premium — each degrades, never blocks CORE):**
   - **logo:** `bash $SK/scripts/logo_gen.sh "minimalist flat-vector logo for <brand>, <one visual idea from the brief>, <accent> on off-white, centered, no text" $WORK/logo.png`. Report `voice`? No — report the logo attempt under the `engineer` note or skip silently on `LOGO_UNAVAILABLE`.
   - **voice:** `bash $SK/scripts/voiceover.sh "<30s ad script that says the brand name and tagline>" $WORK/ad.mp3`. Report `voice done` or `voice failed`.
   - **checkout:** `bash $SK/scripts/create_invoice.sh "$JOB_ID"` → capture the `CHECKOUT <url>`. Report `invoice done "<url>"` or `invoice failed`.
7. **engineer** — Build the site by filling the premium template. Write a small `python3` snippet (terminal tool) that reads `$SK/templates/landing-page/index.html`, `.replace()`-s every `{{PLACEHOLDER}}` with your real values, and writes `$WORK/index.html`. Placeholders: `NAME TAGLINE ACCENT HEADLINE HERO_COPY MANIFESTO FEATURE_1_TITLE FEATURE_1_BODY FEATURE_2_TITLE FEATURE_2_BODY FEATURE_3_TITLE FEATURE_3_BODY CTA_TEXT SIGNUP_HEADLINE SIGNUP_PROMPT`. Set `LOGO_URL=logo.png` (if the logo was generated) else empty, `AUDIO_URL=ad.mp3` (if generated) else empty, `CHECKOUT_URL=<the Dodo url>` (or empty), `LEAD_ENDPOINT=$CONVEX_LEAD_URL`. Report `engineer done`.
8. **publish** — `bash $SK/scripts/deploy_page.sh "<winning name>" $WORK` — this deploys the whole dir (index.html + logo.png + ad.mp3) in one shot. Capture the `DEPLOYED https://...pages.dev` URL. Report `publish done "<live URL>"`.
9. **qa** — `curl -s -o /dev/null -w '%{http_code}' "<live URL>"` must be 200 (retry publish once if not). Report `deliver done "<live URL>"`.
10. **learn** — Write `/opt/data/skills/agency/<vertical>-identity/SKILL.md` (via terminal) capturing the winning positioning + naming + accent + copy structure so the next same-vertical brief is faster. Report `learn done`.

# Emergent roles (additive branch — the org staffs itself, never blocks CORE)
For a special brief the MD **spawns a NEW role** on top of the base roster. This is additive: the CORE
pipeline above still runs in full — the spawned role adds a check, it is never a gate.
Trigger the branch at intake:
- **REGULATED brief** (health / finance / legal / medical / insurance / anything with compliance claims) → spawn **"Compliance Reviewer"** — vet the copy + claims for regulated-industry risk before publish.
- **NON-ENGLISH brief** (the brief is written in, or asks to launch in, a non-English language) → spawn **"Localization Specialist"** — adapt name, copy, and CTA to the target language/locale.

When you spawn a role, do BOTH:
1. **Show it on the DAG** — report it via `report_progress.sh` on the `review` node (an existing node id), naming the spawned role in the note, e.g.
   `bash $SK/scripts/report_progress.sh "$JOB_ID" review started "spawned Compliance Reviewer for regulated brief"`
   and, once its check passes, `... review done "Compliance Reviewer: claims vetted"`. (If the base Reviewer also uses `review`, sequence them so the DAG reads cleanly.)
2. **Persist it so the org remembers** — POST the new role to the roster (base URL = report URL with `/report` → `/roles`):
   ```
   curl -s -m 5 -X POST "${CONVEX_REPORT_URL%/report}/roles" -H 'Content-Type: application/json' \
     -d "{\"roleName\":\"Compliance Reviewer\",\"mission\":\"Vet copy and claims for regulated-industry risk before publish\",\"allowedTools\":[\"web\",\"file\"],\"guardrails\":[\"flag unverifiable claims\",\"never block CORE\"],\"maxRetriesBeforeEscalate\":2}"
   ```
   (For a non-English brief use `roleName` "Localization Specialist" with a fitting mission/guardrails.) The POST upserts by `roleName`, so re-spawning the same role on a later brief is safe.
If spawning or its check fails, report `review failed`, degrade, and continue CORE — a spawned role must never leave the big screen blank.

# Verification
Vertical set; a real, premium `*.pages.dev` site is live and 200 with logo + (if available) voice ad + a Dodo checkout link; every stage reported; CORE never blocked by a premium failure.
