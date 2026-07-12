---
name: web-motion
description: Add tasteful, premium, degrade-safe motion (GSAP reveals + optional shader-gradient hero + optional one Lottie accent) to an already-shipped static landing page — all CDN, no build step.
version: 0.1.0
metadata:
  hermes:
    tags: [design, motion, frontend, progressive-enhancement]
    category: design
    requires_toolsets: [terminal]
---

# When to Use
The launch-kit **engineer** stage has ALREADY published a static HTML landing page and there is a **live URL**. This skill layers motion on top of that finished page as pure progressive enhancement. It is OPTIONAL polish, never on the critical path: if any part of it is skipped or fails, the already-shipped page is unchanged and still live.

Load this skill only after CORE publish succeeded. Never let it delay, re-block, or gate the live URL.

# Non-Negotiable Rules (encode these in every edit)
1. **CDN only, no build step.** Add `<script>`/`<style>` tags to the existing HTML. Never introduce npm, a bundler, `type="module"` bundling, or a compile step. Pin exact versions (never `@latest`). For a live demo you MAY self-host the same pinned file instead of the CDN — equally allowed and more reliable on stage.
2. **Degrade gracefully, always.** Every effect is additive over content that is fully visible and usable with JS off, the CDN unreachable, or WebGL absent. The final state of every element is its natural, fully-visible state — motion only changes how it *arrives*. Never leave content permanently hidden behind an animation that might not run.
3. **Respect `prefers-reduced-motion`.** Gate all animation behind a reduced-motion check. Reduced-motion users get the static, final page instantly.
4. **Never block first paint or the live URL.** Scripts load at end of `<body>` with `defer`/`async`; they must not stall the HTML parser or delay meaningful paint. If a CDN 404s, the page renders normally.
5. **Keep added weight small.** Budget ~35 KB gzip for GSAP core+ScrollTrigger, ~10–13 KB for the shader, and lazy-load the single Lottie only if used. Do not add libraries you don't call. If you only need load/hover reveals and no scroll work, drop ScrollTrigger and ship GSAP core alone (~23 KB).
6. **Motion serves the brand, never slop.** 2–4 restrained effects total. Short durations (0.6–0.9s), gentle eases (`power2/3.out`), small offsets (16–40px). No spinning logos, no bounce spam, no gratuitous parallax, no continuous distracting loops. If in doubt, do less. Nothing in the rubric rewards animation for its own sake — it only helps demo quality indirectly, so cheap-looking motion is a net negative.

# What It Adds (three tiers — do Tier 1, then optionally 2 and/or 3)
- **Tier 1 (default, always safe): GSAP reveals.** Hero text/CTA staggered fade-up on load; each below-the-fold section fades/slides in on scroll. Highest impact, lowest risk.
- **Tier 2 (optional): shader/canvas gradient hero background.** Animated Stripe-style mesh gradient behind the hero, with a CSS-gradient fallback painted underneath so WebGL/JS failure is invisible.
- **Tier 3 (optional): ONE Lottie accent.** A single small, on-brand micro-animation (e.g. a success check, a subtle hero glyph). Exactly one — never a page full of loops. Lazy-loaded so it never blocks paint.

# Procedure
Work directly on the already-published `index.html` (the file that was deployed), then re-run the existing deploy step to re-publish the same slug. Do not fork the page or change its content, copy, or layout — only add motion hooks and the enhancement tags.

## Step 0 — Guard head flag (prevents hidden-content-if-JS-fails)
Add this as the FIRST thing in `<head>` so start-hidden CSS only applies when JS is alive:
```html
<script>document.documentElement.className += ' js';</script>
```

## Step 1 — Tier 1: GSAP reveals (always)
Add reveal hooks to existing markup (no new content): put `data-reveal` on hero children (headline, subhead, CTA) and `class="reveal-on-scroll"` on each major section below the fold. Add `class="btn-lift"` to primary buttons if you want the hover micro-interaction.

Companion CSS in `<head>` (scoped to `html.js` so content is visible if JS never loads, and disabled entirely under reduced-motion):
```html
<style>
  html.js .hero [data-reveal],
  html.js .reveal-on-scroll { opacity: 0; }
  html.js .hero [data-reveal] { will-change: transform, opacity; }
  @media (prefers-reduced-motion: reduce) {
    html.js .hero [data-reveal],
    html.js .reveal-on-scroll { opacity: 1 !important; }
  }
</style>
```

Scripts just before `</body>` — core FIRST, then plugin, then your code; pin exact versions:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js" defer></script>
<script defer>
window.addEventListener('DOMContentLoaded', function () {
  // If the CDN failed, GSAP is undefined — bail; CSS above keeps everything visible.
  if (!window.gsap) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // reduced-motion users already see the final page

  gsap.registerPlugin(ScrollTrigger);

  // 1) Hero reveal on load
  gsap.to('.hero [data-reveal]', {
    y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.12, delay: 0.1,
    startAt: { y: 24 }
  });

  // 2) Section reveals on scroll
  gsap.utils.toArray('.reveal-on-scroll').forEach(function (el) {
    gsap.to(el, {
      y: 0, opacity: 1, duration: 0.9, ease: 'power2.out', startAt: { y: 40 },
      scrollTrigger: { trigger: el, start: 'top 80%', once: true }
    });
  });

  // 3) Optional subtle button hover (keyboard-accessible)
  gsap.utils.toArray('.btn-lift').forEach(function (btn) {
    var enter = function () { gsap.to(btn, { y: -3, scale: 1.03, duration: 0.25, ease: 'power2.out' }); };
    var leave = function () { gsap.to(btn, { y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }); };
    btn.addEventListener('mouseenter', enter); btn.addEventListener('focus', enter);
    btn.addEventListener('mouseleave', leave); btn.addEventListener('blur', leave);
  });

  // Recompute triggers after fonts/images shift layout
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
});
</script>
```
Note: we animate `opacity` to 1 with `startAt` (not `gsap.from`) so the resting state is always fully visible even if a tween is interrupted, and the CSS start-state avoids FOUC.

## Step 2 — Tier 2 (optional): shader gradient hero background
Only add if the hero has a solid or gradient background you can safely sit a canvas behind. Keep a real CSS gradient painted underneath as the fallback; gate WebGL init.
```html
<style>
  .bg-wrap { position:absolute; inset:0; z-index:0; overflow:hidden;
             background:linear-gradient(135deg,#c3e4ff,#6ec3f4,#b9beff); } /* fallback — set to BRAND colors */
  #gradient-canvas { position:absolute; inset:0; width:100%; height:100%;
    --gradient-color-1:#c3e4ff; --gradient-color-2:#6ec3f4;
    --gradient-color-3:#eae2ff; --gradient-color-4:#b9beff; } /* palette = brand colors */
  .hero > * { position:relative; z-index:1; } /* hero content sits above the canvas */
</style>
<!-- inside .hero, as first child: -->
<div class="bg-wrap"><canvas id="gradient-canvas" data-transition-in></canvas></div>

<script src="https://cdn.jsdelivr.net/npm/stripe-gradient@1.0.1/dist/main.js" defer></script>
<script defer>
window.addEventListener('load', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var c = document.getElementById('gradient-canvas');
  if (!c) return;
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
  if (gl && window.Gradient && !reduce) {
    try { new Gradient().initGradient('#gradient-canvas'); }
    catch (e) { c.style.display = 'none'; } // reveal CSS fallback
  } else {
    c.style.display = 'none'; // WebGL missing / lib failed / reduced-motion → CSS fallback shows
  }
});
</script>
```
Critical: all four `--gradient-color-*` MUST be set (else the lib shows garish red/magenta defaults). Use the page's brand palette; give the wrapper real size (a 0×0 canvas renders nothing). It is a global UMD `Gradient` — don't wrap in `type="module"`. This is a continuous rAF loop, so it is skipped entirely under reduced-motion.

Pure-CSS alternative (0 KB JS, ~0.3 KB CSS, if WebGL is undesirable): three blurred, slowly-drifting radial-gradient "orbs" via `@keyframes` — looks premium, works everywhere, and is itself disabled under reduced-motion.

## Step 3 — Tier 3 (optional): ONE Lottie accent
Add at most one small animation, lazy-loaded, sized in CSS to avoid layout shift, hidden under reduced-motion. Use a `.lottie`/JSON from a source with a Free badge (Lottie Simple License — free commercial, no attribution). Prefer lottie-web light for a single simple JSON (no WASM, lightest):
```html
<div id="accent" style="width:220px;height:220px" aria-hidden="true"></div>
<style>@media (prefers-reduced-motion: reduce){ #accent{ display:none; } }</style>
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js" defer></script>
<script defer>
window.addEventListener('load', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.lottie) return; // CDN failed → box just stays empty, page fine
  var el = document.getElementById('accent'); if (!el) return;
  new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        lottie.loadAnimation({ container: el, renderer: 'svg', loop: true,
          autoplay: true, path: 'ACCENT_JSON_URL' }); // pin an on-brand asset
        obs.disconnect();
      }
    });
  }, { rootMargin: '200px' }).observe(el);
});
</script>
```
For a `.lottie` (zipped) asset or many animations, swap to `@lottiefiles/dotlottie-wc@0.5.0` (`<dotlottie-wc>`); it plays both formats but pulls a ~150–250 KB WASM renderer, so only use it when a plain JSON won't do. Never use the deprecated `<lottie-player>` / `@dotlottie/player-component`.

## Step 4 — Re-publish and verify
Re-run the existing deploy step to push the enhanced `index.html` to the SAME slug/URL. Then verify (Step: Verification). If anything looks off, the safe move is to ship Tier 1 only or revert to the pre-motion page — the live URL must never regress.

# Pitfalls
- **FOUC / stuck-hidden content:** start-hidden CSS is scoped to `html.js` and forced visible under reduced-motion; the resting animated state is always full opacity. Never ship a selector that can leave real content at `opacity:0` when JS fails.
- **Load order:** GSAP core before ScrollTrigger before your code; all with `defer` so order is preserved and paint isn't blocked.
- **Shader palette:** set all four `--gradient-color-*` or it renders default red/magenta; a 0×0 canvas renders nothing (give the wrapper real size); it's a global UMD `Gradient` — don't wrap in `type="module"`.
- **ScrollTrigger + late layout:** call `ScrollTrigger.refresh()` on `window load` (and after webfonts) so triggers recompute after images/fonts shift the page.
- **Weight creep:** don't add a library you don't call; drop ScrollTrigger if there are no scroll effects; lazy-load Lottie; never `@latest`.
- **Slop check:** if an effect doesn't make the brand feel more premium, cut it. Fewer, calmer, purposeful.
- **Provenance:** if you reuse any substantial pre-existing animation sequence or asset rather than authoring the motion here, flag it in the submission (honest flag survives; hidden origin risks DQ). Standard MIT/free libs (GSAP, stripe-gradient, lottie-web) need no flag.

# Verification
- Live URL still resolves and returns the enhanced page at the same slug.
- With JS disabled AND with the CDN blocked: all content is fully visible and readable (no blank hero, no hidden sections).
- With `prefers-reduced-motion: reduce`: the page appears in its final static state instantly, no animation, no gradient rAF loop, no Lottie.
- With motion allowed: hero reveals on load, sections reveal on scroll once, optional gradient animates, optional single Lottie plays when scrolled into view.
- No console errors that break rendering; added transfer weight within budget (Tier 1 ~35 KB gzip; +~12 KB if shader; Lottie lazy).
- Total effects are few and restrained — reads as premium, not busy.