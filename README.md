<p align="center">
  <img src="assets/mercury-works-banner.png" alt="Mercury Works — the autonomous AI creative agency" width="100%">
</p>

> [!NOTE]
> **Mercury Works is a working system, not a mockup.** Give it one sentence — *"a cold-brew coffee for developers who code at night"* — and a team of AI agents research, name, design, illustrate, voice, and **deploy a real, live launch kit** in minutes. Built at the **GrowthX × Nous Hermes Buildathon**, running **on the Hermes agent**.

## What it is

**An autonomous creative agency that runs on [Hermes](https://github.com/NousResearch/hermes).** Someone scans a QR, types a one-line brief, and a **Managing Director** agent staffs a pipeline from a live org roster, then:

- **researches** the market (cited, via Linkup)
- **names** the brand + tagline — and catches naming/trademark clashes, then revises
- **designs** a bespoke premium landing page (never a template — a real design method per brand)
- **illustrates** it with a generated hero photo (+ a product shot for visual verticals) via `gpt-image-1`
- **records** a 30-second radio ad (ElevenLabs)
- **ships** a real, live `*.pages.dev` site with a working **Dodo Payments** checkout
- **writes itself a reusable skill** so the next brief in that vertical is faster

…and every stage animates live on a big-screen **Mission Control** board. It's a **managed, emergent org** (the MD spawns new roles — e.g. a *Compliance Reviewer* for a regulated brief — mid-run), fully **observable** (a Langfuse trace per run), with a **closed learning loop** (a measured job-2-beats-job-1 delta).

## See it

| | |
|---|---|
| **Mission Control** (big screen) | https://mercury-mission-control.pages.dev |
| **Client brief page** (phone) | https://mercury-mission-control.pages.dev/?client |
| **Org roster** (management UI) | https://mercury-mission-control.pages.dev/?roster |
| **Sample: coffee brand** it shipped | https://mw-mooncommit-2aaaa2.pages.dev |
| **Sample: finance app** it shipped | https://mw-offsheet-9301cc.pages.dev |
| **Sample: clothing brand** it shipped | https://mw-notyetworn-a73bbf.pages.dev |

*(Mission Control is a live instance — the board animates only while the worker + Hermes container run on the operator's machine; the sample sites above are permanently live.)*

## How it works

```
 phone / QR ──▶ Client page ──▶ Convex (queue)  ◀── Mission Control (live board, reactive)
                                     │
                                     ▼
                          worker/index.mjs   (local Node poller — outbound only)
                                     │  docker exec hermes hermes -z "<brief>" --yolo
                                     ▼
                          Hermes agent   (Docker)  ── runs the launch-kit skill
                                     │  research → name → design → images → voice → checkout → deploy → learn
                                     ▼
              real *.pages.dev site (Cloudflare)  +  events streamed back to Convex → the DAG animates
```

- **Hermes is the base harness** — the product *is* an agent run. Each brief is one `hermes -z` session executing the [`launch-kit` skill](hermes/skills/agency/launch-kit/SKILL.md) with real tools; every stage is POSTed to Convex, which is what the Mission Control DAG renders.
- **No tunnel, no VPS** — the worker only makes outbound connections; Hermes runs locally in Docker.
- **Provider-agnostic** — the model provider is one value in `.env` (built on Gemini, ran on `gpt-5.6-sol`).

## Run it yourself

**Prerequisites:** Docker (Rancher Desktop or Docker Desktop), Node 18+, and accounts for: an LLM provider (OpenAI or Google Gemini), [Convex](https://convex.dev), [Cloudflare](https://dash.cloudflare.com) — plus optional [ElevenLabs](https://elevenlabs.io), [Linkup](https://linkup.so), [Dodo Payments](https://dodopayments.com), [Langfuse](https://cloud.langfuse.com).

**1 — Clone + install**
```bash
git clone https://github.com/SuryanshD/mercury-works.git && cd mercury-works
npm install
cp .env.example .env          # fill in your keys
```

**2 — Backend (Convex)**
```bash
npx convex dev                # creates your deployment, generates convex/_generated, prints your URLs
# if using Dodo, set the webhook signing secret ON the deployment (not in .env):
npx convex env set DODO_PAYMENTS_WEBHOOK_KEY whsec_xxx
```
Put the printed `CONVEX_URL` and `CONVEX_REPORT_URL` (`https://<deployment>.convex.site/report`) into `.env`.

**3 — The Hermes agent (Docker)** — this is what actually ships the sites.
```bash
mkdir -p ~/.hermes/skills
cp -r hermes/skills/* ~/.hermes/skills/     # install the agency + design skills
cp .env ~/.hermes/.env                       # the container reads this env-file
```
Create `~/.hermes/config.yaml`:
```yaml
model:
  provider: openai-api        # your provider
  default:  gpt-5.6-sol       # your model
  api_mode: responses         # gpt-5.6-sol needs this for tools + reasoning
plugins:
  - observability/langfuse    # optional — traces every run
```
Build the image (Langfuse SDK baked in) + start the container:
```bash
bash scripts/hermes-up.sh
```
This builds `mercury-hermes` from the [`Dockerfile`](Dockerfile) and runs the `hermes` container with `~/.hermes → /opt/data` mounted on `127.0.0.1:8642`. Each brief then becomes one run:
`docker exec hermes hermes -z "<prompt>" --provider openai-api -m gpt-5.6-sol --yolo`.

**4 — The worker (the bridge)**
```bash
node worker/index.mjs          # polls Convex for queued jobs → drives Hermes → streams events back
```

**5 — The frontend (Mission Control + client page)**
```bash
npm run build
npx wrangler pages deploy dist --project-name=<your-project>
```
Open the deployed URL on a screen, scan the QR with your phone, type a brief, and watch the agency ship it.

> Verify every provider key in one shot: `bash scripts/smoke-test.sh`

## Payments

Checkout uses a **static Dodo product link** (`checkout.dodopayments.com/buy/<product>`) — it **never expires** and mints a fresh session on every click, carrying `metadata_job_id` so the webhook flips the job to **PAID** on the board. The link forces USD so the standard test card (`4242 4242 4242 4242`, exp `06/32`, CVV `123`) always clears. This holds for every generated site and every future build.

## Repo layout

```
convex/     backend spine — schema, FIFO queue, mutations, httpActions (/report, /dodo-webhook, /lead, /roles)
worker/     local Node poller → drives Hermes via docker exec (outbound-only bridge)
hermes/     the agent's skills — launch-kit (SKILL.md + scripts + template) + design (web-design, web-motion)
src/        Mission Control (live board + DAG) · Client brief page · Roster management UI
waitlist/   standalone waitlist landing page
scripts/    hermes-up.sh (build + run the container) · smoke-test.sh (verify providers)
Dockerfile  Hermes runtime + Langfuse SDK
```

## Powered by

OpenAI (`gpt-5.6-sol` + `gpt-image-1`) · Nous Research **Hermes** · Convex · Cloudflare Pages · ElevenLabs · Linkup · Dodo Payments · Langfuse

## Built by

**Suryansh Deoli** ([@SuryanshD](https://github.com/SuryanshD)) & **Piyush Rane** ([@PiyushRane](https://github.com/PiyushRane)) — at the GrowthX × Nous Hermes Buildathon.

## License

[MIT](LICENSE) © Suryansh Deoli & Piyush Rane
