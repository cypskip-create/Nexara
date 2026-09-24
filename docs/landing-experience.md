# Landing experience upgrade

## Scope and audit

The former homepage lived inside `src/main.tsx` with short feature/pricing sections and
global pointer/reveal effects. The application uses handcrafted CSS, React and TypeScript;
there is no Tailwind or animation framework. Core screens are tightly coupled to the
existing app state. Those screens, services, database policies and authentication flows
have not been rebuilt. The existing analytics component is reused with separate demo data.

SpaceFS was reviewed as a reference for spacious typography, staged product storytelling,
sticky visual explanations and restrained interaction depth. No branding, wording, assets
or filesystem metaphor were copied.

## Components and content

- `src/marketing/LandingPage.tsx`: navigation, complete narrative, analytics disclosure,
  workflow explorer, industry selector, comparison, pricing, FAQ and informational dialogs.
- `src/marketing/Demos.tsx`: shared demo shell/lead card, seven-scene hero, four-chapter
  transformation, assistant questions, CRM filtering/assignment/addition, pipeline,
  six-step automation timeline and channel switching/human handoff.
- `src/marketing/content.ts`: fictional records, qualification fields, industry workflows,
  journey explanations and 15 FAQs.
- `src/marketing/motion.ts`: reduced-motion subscription, visibility-gated finite scene
  controller and scoped one-time IntersectionObserver reveals.
- `src/marketing/landing.css`: isolated `lf-` components, responsive layouts and motion tokens.
- `src/main.tsx`: connects the new homepage to existing authentication, onboarding and demo
  entry points. Analytics is lazy-loaded in both marketing and the workspace.
- `src/styles.css`: the same font families are now self-hosted instead of requested from Google.
- `index.html`, `public/favicon.svg`: local brand favicon.
- `eslint.config.js`, `playwright.config.ts`, `tests/landing.spec.ts`, package manifests:
  real lint and automated browser coverage. Generated reports/screenshots are ignored.

## Motion and performance

No animation library was added. CSS durations are 180ms / 320ms / 700ms / 1100ms, with
consistent easing and transform/opacity animations. Pointer depth is bounded and limited
to the desktop hero, using one requestAnimationFrame per pointer update. No document-wide
pointer handler or JavaScript scroll loop is used.

Hero, pipeline and automation sequences end once, with pause, previous, next and replay
controls. Timers stop when offscreen, paused, on a hidden tab, or when reduced motion is
requested. Reduced-motion visitors initially see completed scenes and can replay manually.
The sticky story uses IntersectionObserver chapter activation; below 901px and with
reduced motion, all four scenes are stacked instead. Charts animate once on reveal.

The full analytics report mounts only when requested and is a separate JavaScript chunk.
There are no video files, external images or heavyweight canvas/WebGL effects. Two local
Latin variable font files total about 64KB. The production build reports approximately
93KB gzip for entry JavaScript, 2KB gzip for analytics and 20KB gzip for CSS. These include
the existing core workspace, not just the new landing page.

Desktop browser inspection is not a physical mid-range phone benchmark or a 60fps guarantee.
Real-device profiling remains useful before public launch.

## Responsive and accessible behavior

Desktop has a compacting sticky navigation, two-pane hero, pinned story, full pipeline
and split demos. Tablet uses stacked story chapters and a mobile navigation menu. Phones
use a stacked hero, single-card pipeline, vertical workflow, stacked pricing and labeled
CRM records rather than a wide table. The detailed analytical table remains independently
scrollable where needed; the page itself must not overflow horizontally.

Buttons, anchors and inputs retain native semantics. FAQ panels expose expanded state and
relationships. Menu Escape and modal dismissal return focus to the opener. The workflow
supports keyboard focus as well as hover/click. A skip link and visible focus outlines are
provided. Automatic changes do not generate repeated screen-reader announcements.

## Validation

Run:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The 12 browser tests cover 1440, 1280, 1024, 768, 430 and 390px; screenshots of hero,
CRM, pipeline, automation, pricing and analytics; page overflow; anchor destinations;
console/page errors; scripted questions; isolated CRM changes; pipeline playback;
inbox channel/human handoff; industry/comparison choices; report filtering and CSV
download; all 15 FAQs; dialog focus restoration; mobile menu; reduced motion; pointer
reset; offscreen pause; and existing demo/auth entry points.

Manually inspect generated screenshots alongside the live journey. Automated layout
checks cannot prove visual quality, and the suite currently targets Edge/Chromium only.

## Owner attention before production

No credentials are needed for this public walkthrough. Live AI, channel delivery,
scheduled automations, billing, verified tenant isolation and complete role enforcement
remain core-product work. Pricing is explicitly proposed. Integration states are truthful.
No invented customers, testimonials, certification badges or revenue figures were added.

Provide a public support address and a real demo-booking destination when ready.
Current Contact/Book a demo dialogs explain that no request or appointment is submitted.
Privacy and Terms are clearly marked drafts for legal review, not finalized policies.
The Start free buttons preserve the existing demo-onboarding behavior; they do not create
an account or start a paid subscription.
