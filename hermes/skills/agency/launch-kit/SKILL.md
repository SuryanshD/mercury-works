---
name: launch-kit
description: Autonomous brand-identity pipeline — turns a one-line client brief into a live, deployed launch kit (named brand + cited market brief + live landing site + optional logo/voice/invoice)
version: 1.0.0
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
---

# When to use
A request supplies `JOB_ID` and a one-line client brief (a "launch this product/brand for me" request). You are the **Managing Director of Mercury Works**, an autonomous creative agency. Ship a real, live launch kit.

# Setup
- `SK=/opt/data/skills/agency/launch-kit` (this skill's dir; scripts in `$SK/scripts`, template in `$SK/templates`).
- Report EVERY stage, at its start and end:
  `bash $SK/scripts/report_progress.sh "$JOB_ID" <node> <started|done|failed|rejected|revised> "<=80-char note>"`
  Node ids: `intake research naming review copy engineer publish voice invoice qa deliver learn`.
- **Reporting outranks output quality — the big screen must never go blank.** A failed tool -> report `failed`, degrade, and continue. CORE (name + tagline + copy + live site) must never depend on a premium stage.

# Procedure (CORE — must always complete)
1. **intake** — Parse `JOB_ID` and the brief. Classify the **vertical** (one word: e.g. `tea`, `saas`, `fitness`, `fashion`). POST it:
   `curl -s -m 5 -X POST "$CONVEX_SET_VERTICAL_URL" -H 'Content-Type: application/json' -d "{\"job_id\":\"$JOB_ID\",\"vertical\":\"<vertical>\"}"`
   Report `intake done "<vertical>: <one-line read of the brief>"`.
2. **research** — Run a cited market scan and reason from it:
   `bash $SK/scripts/linkup_search.sh "<vertical> market 2025: positioning gaps + top competitors for: <brief>" standard`
   If it prints `LINKUP_UNAVAILABLE`, report `research failed`, then reason from prior knowledge and continue. Otherwise report `research done "<one-line insight; has citations>"`.
3. **naming** — Propose **3** name + tagline options that fit the brief and the positioning gap. Report `naming done "<the 3 candidates>"`.
4. **review** — Score each candidate 1-5 on {distinctiveness, availability, brief-fit}. Run a name-availability check on your top pick:
   `bash $SK/scripts/linkup_search.sh "Is '<top name>' an existing brand/company and is <slug>.com likely taken?" standard`
   If the top pick scores < 4 or the name is clearly taken: report `review rejected "<reason>"`, redo naming **once** with that reason, then report `review revised "<new winner>"`. Otherwise report `review done "<winner + why>"`. Lock the **winning name + tagline**.
5. **copy** — Write the site copy: a punchy `HEADLINE`, a 1-2 sentence `HERO_COPY`, three `FEATURE` title+body pairs, a `CTA_TEXT`, and a `SIGNUP_PROMPT`. Report `copy done`.
6. **engineer** — Write a complete, self-contained `index.html` for the brand into a fresh workdir:
   - `mkdir -p /tmp/job-$JOB_ID`
   - Use `$SK/templates/landing-page/index.html` as the **design reference** (same dark aesthetic, the email **signup form**). Fill it with the real name/tagline/headline/hero/features/CTA. Keep the signup `<form>` (it feeds cross-track signups). Write the result to `/tmp/job-$JOB_ID/index.html`.
   - Report `engineer done`.
7. **publish** — Deploy it live:
   `bash $SK/scripts/deploy_page.sh "<winning name>" /tmp/job-$JOB_ID`
   Capture the `DEPLOYED https://...pages.dev` URL. Report `publish done "<live URL>"` (put the URL in the note). This is the scored real-live-surface.
8. **qa** — Confirm the URL returns 200: `curl -s -o /dev/null -w '%{http_code}' "<live URL>"`. If not 200, re-run publish once. Report `deliver done "<live URL>"` (the `deliver` event drives the celebratory flood-fill).

# Premium upgrades (each degrades on failure, never blocks CORE)
- **logo** — generate a brand logo (image tool), reference it in the site, re-publish.
- **voice** — `bash $SK/scripts/voiceover.sh "<30s ad script naming the brand>" /tmp/job-$JOB_ID/ad.mp3`, embed as the site's `<audio>` src, re-publish. Report `voice done`.
- **invoice** — `bash $SK/scripts/create_invoice.sh "$JOB_ID" "<brand> launch kit" 900` -> a Dodo checkout URL; surface it. Report `invoice done "<checkout URL>"`.

# learn
After delivery, write a `<vertical>-identity` playbook so the next same-vertical brief is faster: create `/opt/data/skills/agency/<vertical>-identity/SKILL.md` capturing the winning positioning, naming pattern, and copy structure. Report `learn done "<vertical>-identity written"`.

# Verification
Vertical set; a real `*.pages.dev` site is live and 200; every stage reported; CORE never blocked by a premium failure.
