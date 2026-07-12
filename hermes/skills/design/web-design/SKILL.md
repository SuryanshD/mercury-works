---
name: web-design
description: Repeatable method for designing a BESPOKE, funded-startup-grade landing page per brand — derive a visual identity from the brief (vertical → mood pair → type pairing + OKLCH palette + layout archetype + one signature move), apply tasteful motion, and pass a hard anti-slop checklist. Use at the copy/engineer stage so every shipped site looks premium AND different, never templated.
version: 1.0.0
metadata:
  hermes:
    tags: [design, frontend, branding]
    category: design
    requires_toolsets: [terminal]
---

# When to use
You are building the landing page for one brand (a `JOB_ID` + brief already produced a name, tagline, positioning, and copy). Your job here is the **look**: turn this specific brand into a page a funded startup would ship, and make it look like **no other brand you have shipped**. The failure mode this skill exists to kill is the "averaged AI-slop" page — same fonts, same off-white paper, same three equal cards, same amber accent on every job.

**One rule above all: derive, never default.** Every choice below is computed from *this* brief. If two different briefs produce the same fonts, palette, and layout, you have failed even if each page looks fine alone. Removing the logo, a viewer should be able to tell two of your pages apart.

**Never blank the screen.** This is a premium layer on the CORE pipeline. If any derivation is uncertain, fall back to a *still-distinct* minimum (a derived type pairing + a derived palette on the base template) and keep going. Design polish never gates the live URL.

---

# The method — 8 steps, one pass

## 1 — Brief → positioning vector
From the brief extract four things (infer confidently from one line; never land on "generic SaaS"):
- **vertical** — devtool / fintech / health / DTC-consumer / AI-infra / climate / fashion / legal / education / hospitality / crypto / creative-SaaS …
- **audience** — developers / enterprise buyers / consumers / creatives
- **positioning signal** — premium / accessible / technical / playful
- **one emotion** the product should evoke — trust, speed, calm, craft, power, warmth.

## 2 — Positioning → MOOD PAIR (the tiebreaker)
Compress vertical + emotion into a **two-word mood pair**. This pair breaks every later tie; every element must satisfy BOTH words. Examples:
`precise + warm` (fintech for humans) · `raw + technical` (dev infra) · `editorial + confident` (AI research / thesis startup) · `organic + premium` (wellness DTC) · `monolithic + fast` (data platform) · `delicate + luxe` (beauty/fashion) · `bold + kinetic` (consumer launch/events).
Write the pair down. It is your north star.

## 3 — Pick ONE layout archetype (commit fully)
Premium pages execute **one** strong idea everywhere, not five trends sampled. Pick the archetype that matches the mood pair; it dictates grid + density + hero *before* any styling. Committing fully to one named archetype (rather than a vibe) is what prevents the mushy averaged look — the same lesson the anchor-and-lock skills teach.

| Archetype | Feel | Grid / hero | Best for |
|---|---|---|---|
| **Oversized-Type Manifesto** | editorial + confident | full-viewport display headline 8–12vw, tiny eyebrow above, ONE CTA below; sparse type-led sections, hairline rules, numbered sections | brand-led / thesis / pre-product |
| **Editorial Split (Magazine)** | trust + craft | asymmetric 12-col (5/7 or 4/8), visible column rules, pull-quotes, marginalia labels, images bleeding gutters | AI research, fintech, content/trust-critical |
| **Restrained Bento Showcase** | clear + capable | hero with real product UI, then ONE bento with deliberately varied cell sizes (2×2 hero cell, tall stat, wide quote), 1px tinted borders not shadows | multi-feature SaaS needing scannability |
| **Technical Spec-Sheet / Brutalist** | raw + technical | mono labels, uppercase micro-eyebrows, hairline-bordered tables, index numbers 01/02/03, terminal demo block, near-mono + one hot accent, radius 0–2px | dev tools, infra, APIs, crypto/compute |
| **Atmospheric Depth Hero** | calm + premium | ONE bespoke ambient background (OKLCH gradient mesh + 0.05 grain), layered content planes, glass used once (hero card only), flat solid sections after | consumer AI, wellness, creative — only when the ambient asset is truly custom, never a stock purple blob |

Rotate archetypes across jobs — if the last few builds were all Bento, deliberately reach for Manifesto or Spec-Sheet when the mood allows.

## 4 — Pick the TYPE PAIRING (all Google-Fonts-available)
The **display face carries ~80% of brand personality**; the body face disappears into legibility. Use **one display moment per viewport**. Add a mono face ONLY for technical verticals, and only for labels/eyebrows/data — never paragraphs. Pick by mood, not habit:

| Mood / vertical | Display | Body | Mono (opt) |
|---|---|---|---|
| warm-premium DTC, wellness, food, craft | **Fraunces** (use SOFT/WONK axes, high opsz; italic for inline emphasis) | Hanken Grotesk | — |
| modern creative SaaS, design tools | **Instrument Serif** (esp. italic, 6rem+) | Instrument Sans | — |
| indie dev tool, AI product w/ editorial voice | **Bricolage Grotesque** (tight −0.03em) | Newsreader | — |
| fintech, legal, enterprise trust | **Schibsted Grotesk** | Source Serif 4 | — |
| luxury, fashion, high-end marketplace | **Gloock** or **DM Serif Display** | Geist | — |
| dev infra, APIs, CLI | **Geist** | Geist | **Geist Mono** |
| AI / creative / geometric edge | **Syne** (700–800) | Manrope | — |
| beauty, fashion, hospitality | **Cormorant Garamond** (300–500, 4rem+ only) | Figtree | — |
| industrial, climate, hardware, logistics | **Archivo** (variable WIDTH: Expanded heroes, normal body) | Spectral | — |
| friendly consumer, education, community | **Young Serif** | Onest | — |
| bold data / crypto / compute | **Unbounded** (hero only, once) | IBM Plex Sans | IBM Plex Mono |
| sports, events, bold launch | **Anton** or **Big Shoulders** (uppercase) | Public Sans | — |

**Banned as the primary display face: Inter and Space Grotesk** (the #1 AI tell). They may appear only as a body face if nothing above fits.

**Type scale (set real values):** hero display `clamp(3.25rem, 8.5vw, 8rem)`, letter-spacing `−0.02em → −0.04em` (tighten as size grows — never leave default tracking on big type), line-height `0.95–1.05`. Body `1.0–1.125rem`, line-height `1.6`, max-width `65ch`. Use **extreme weight contrast** where the family allows — thin 100–300 against black 700–900, never a timid 400-vs-600.

**Single Google Fonts request**, `display=swap`, with `preconnect`. Example:
`<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,700;12..96,800&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">`

## 5 — DERIVE the palette (OKLCH, tinted neutrals, 60/30/10)
Do NOT pick colors — derive them from the mood pair. **Tinted neutrals are the single strongest "not-a-template" signal.**
1. **Base hue from mood:** trust/finance → deep blue-green / slate · craft/warmth → clay, ochre, cream · raw/technical → near-monochrome + one hot accent (orange-red, acid green, or electric blue) · wellness/organic → sage, moss, bone · luxury → espresso, ivory, oxblood · AI/compute → **avoid default purple** — reach for deep teal, warm charcoal + amber, or ink + signal-red.
2. **Define in OKLCH.** Build a 9-step neutral ramp where **every neutral is tinted toward the brand hue** at chroma `0.005–0.02`, e.g. `oklch(0.97 0.008 80)` not `#f5f5f5`. Off-black text `oklch(0.22 0.015 <hue>)` — never `#000`. Background `oklch(0.97–0.99 …)` — never pure `#fff`.
3. **One accent** at chroma `0.15–0.25` (this is the launch-kit `ACCENT` — set it per vertical, not always amber) + **one rare secondary** used <5% (inline italic highlight, or a single stat).
4. **Enforce 60/30/10:** 60% tinted background neutrals, 30% ink/text, 10% accent (primary CTA + links + one or two moments only).
5. **Commit light-first OR dark-first** by vertical (dev/infra → dark ink `oklch(0.18 0.01 <hue>)`; DTC/wellness → warm light). Derive the opposite theme by inverting the lightness ramp, keeping hue + chroma.
6. **Validate WCAG AA:** 4.5:1 body, 3:1 large type; check the accent against the chosen background.
7. **Ban list:** default Tailwind values, `#6366f1`/`#8b5cf6` indigo, blue→purple gradients, pure-gray ramps, pure `#000`/`#fff`.

## 6 — Design the hero as a standalone poster
The hero must work as a poster with the rest of the page cropped off:
- **Headline** = a specific claim, 7–12 words. Ban the copy tells: *Supercharge, Unlock the power of, Effortlessly, Seamlessly, Take X to the next level, In today's fast-paced world*. Not "Welcome to X".
- **One CTA** (never two of equal weight).
- **One proof element:** a real product visual, a live demo, or a single credible stat — **never fabricated logos, "10,000+ users", or invented testimonials** for an unlaunched brand.
- **Visual anchor:** oversized type, real UI in a device-accurate frame, or ONE bespoke graphic (generated SVG pattern, CSS OKLCH gradient mesh, or the generated logo) — never a stock 3D blob or floating geometric shapes.

## 7 — Sections: asymmetry + rhythm, and ONE signature move
- **Alternate density:** airy manifesto → dense proof → airy CTA. Vary column structure between sections (12-col split, then full-bleed, then offset 5/7). Vary heading scale and vertical padding (8–12rem desktop) — never the same container + padding every section. "Expensive whitespace" reads as funded.
- **Every feature gets a DIFFERENT presentation** — one diagram, one screenshot, one quote, one stat. Never three identical icon-title-blurb cards.
- Use hairline rules (1px, low-alpha tinted neutral) and section index numbers (01, 02…) **only when they encode something true** about the content, not as decoration.
- **Invent exactly ONE signature detail and repeat it 2–3× so it reads as identity**, e.g.: a cursor-following highlight; an animated wordmark; a ligature-heavy italic-serif emphasis word inline; giant-type footer; numbered marginalia; a background grid that reveals on hover; a single oversized pull-quote in the display face. One idiosyncrasy, deliberately repeated — that is what separates "designed" from "generated".
- Insert **at least one unconventional section** (a manifesto line, a changelog, a technical diagram, a founder note) so the page isn't hero→3 features→testimonials→pricing→CTA in template order.

## 8 — Motion pass (after layout is locked)
Motion clarifies hierarchy or rewards scroll — it never decorates. Favor **orchestrated page-load choreography over scattered micro-interactions**. **One easing site-wide: `cubic-bezier(0.16, 1, 0.3, 1)`**, durations 200–700ms, stagger 40–80ms, **no bounce easings**, everything wrapped in `@media (prefers-reduced-motion: reduce)`. Pick 2–3, not all:
- **Headline mask-reveal on load** — each line rises out of `overflow:hidden` clip, 60ms stagger, 600ms. Highest-value single premium signal.
- **Scroll entrances** — `translateY(24px)+opacity` via IntersectionObserver at ~20% visibility, **once only**, never re-animate on scroll-up.
- **CTA hover** — background wipe left→right (250ms) or underline-draw, not a color swap; +2px translate on the arrow glyph.
- **Real-number counters** easing out 1.2s when scrolled in (REAL numbers only).
- **Ambient drift** — hero mesh/noise animates hue or position over 20–40s (subconscious only; pause under reduced-motion). Atmospheric archetype only.
- **Magnetic primary CTA** (≤6px toward cursor, springs back) — as the signature detail, not site-wide.

---

# Anti-slop DON'Ts (self-critique against every item before shipping)
- Inter / Space Grotesk as display face + blue→purple gradient on dark — the #1 AI tell.
- Emoji as feature icons (🚀⚡✨🔒) — use inline SVG line icons at consistent stroke width, or no icons.
- Three identical equal-width icon-title-blurb cards — vary presentation per feature.
- Gradient text on headings (`background-clip:text`) more than zero times, unless it IS your one signature move.
- `rounded-2xl + shadow-lg` on every card — pick ONE radius token (0, 2px, or 8px) and prefer 1px tinted borders over drop shadows.
- Fabricated social proof: fake logos, "10,000+ happy users", invented testimonials, AI-avatar faces.
- Copy tells (see §6).
- Purple/indigo defaults and untouched Tailwind colors — always custom OKLCH tokens.
- Centered-everything at one container width — use asymmetry and varied columns.
- Glassmorphism sprinkled everywhere — one hero moment maximum.
- Stock 3D blobs, floating shapes, generic "abstract tech" hero art.
- Pure `#000` on `#fff` — always tint neutrals toward the brand hue.
- Uniform section rhythm — alternate density, scale, padding.
- Every element animating with bouncy easing — a few orchestrated moments only.
- Two competing CTAs of equal weight in the hero.
- Sparkle/star iconography and "AI-powered" badges as decoration.

# Quality checklist (all must pass before the URL ships)
- [ ] **Attribution test:** with the logo removed, this page is recognizably THIS brand and no other. No section could sit on a template marketplace.
- [ ] Mood pair satisfied by type, palette, layout, and motion — all four agree.
- [ ] Display face is NOT Inter/Space-Grotesk; type scale set with tightened tracking on large sizes; single Google Fonts request, `display=swap`, `preconnect`.
- [ ] Palette in OKLCH; neutrals tinted toward brand hue; 60/30/10 held; accent set per-vertical (not default amber); no banned colors.
- [ ] WCAG AA: 4.5:1 body, 3:1 large type — verify the accent on its actual background.
- [ ] One signature move, repeated 2–3×. One display moment per viewport. One primary CTA.
- [ ] Every feature presented differently; at least one unconventional section present.
- [ ] Motion: one easing, no bounce, `prefers-reduced-motion` fallback; nothing re-animates on scroll-up.
- [ ] Interactive elements: `cursor:pointer`, visible keyboard focus states, SVG (not emoji) icons.
- [ ] Responsive at 375 / 768 / 1024 / 1440px: hero headline never overflows at 375; bento/columns collapse to single column; body never scrolls horizontally.

---

# Fast path (overflow / CORE tier, ~60s)
For throughput/overflow jobs where premium stages are skipped, do NOT ship the identical default. Run the **cheap 3-decision version** and stop: (1) mood pair → one type pairing from §4, (2) one base hue → derived tinted-neutral palette + per-vertical accent from §5, (3) one archetype from §3 if time allows, else the base template with the derived fonts + palette swapped in. Even this minimum makes the page recognizably different per brand. Skip motion beyond the default rise, skip the signature move. Distinctiveness first, polish second.

# Degrade rules
- Font link fails / face unavailable → fall back to the body face for both roles; the page still ships.
- Any single derivation uncertain → use the base template but ALWAYS override at minimum `--accent` and the font `<link>` + faces so the page is never the stock Fraunces+Inter+amber look.
- Never let design work block or delay the live URL. Ship distinct-and-good over perfect-and-late.