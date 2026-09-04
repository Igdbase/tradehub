# Prompt 02 — Locked Design System Implementation

You are building **TradeHub Stage 02**. Stage 01 already created the Next.js 14 App Router scaffold, route groups, environment template, and placeholder surfaces. Your job now is to turn that scaffold into a real **shared design system foundation** that matches the locked TradeHub visual language.

This is not the full landing page yet. This is not auth yet. This is not mock-data-heavy product work yet. This stage should make the app feel unmistakably like TradeHub while staying reusable for later prompts.

Do not start from scratch. Build on the current scaffold.

---

## Read First

Before writing code, read these files in the repository:

- `files/tradehub-04-design.md`
- `files/tradehub-prototype-student.html`
- `files/tradehub-prototype-influencer.html`
- `files/tradehub-landing.html`
- `asset/tradehub-colors.html`
- `prompt/01-project-scaffold.md`
- `src/styles/tokens.css`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/layout/site-footer.tsx`
- `src/components/ui/placeholder-page.tsx`
- `src/components/ui/policy-page.tsx`
- `src/components/ui/surface-card.tsx`

Treat `files/tradehub-04-design.md` as the locked source of truth.
Treat the prototype HTML files as design reference only, not copy-paste source.
Treat the current scaffold files as the codebase you must extend, not replace.

---

## Stage Goal

Convert the prototype color grading, typography rules, glass surfaces, hero card, progress bars, pills, app-shell feel, tab bar styling, motion rules, and focus states into reusable CSS/Tailwind-backed building blocks.

At the end of this stage:

- the app should look and feel much closer to the TradeHub prototype,
- the main placeholder routes should visibly use shared design primitives,
- there should be a clear **design-system preview surface** for checking progress,
- Prompt 03 should be able to plug mock data into strong reusable UI without rewriting styling.

---

## What This Stage Should NOT Do

Do **not**:

- rebuild the entire production landing page from the marketing prototype,
- add Firebase, Paystack, Solana, Telegram, or exchange integrations,
- add role protection or auth logic,
- hardcode one workspace as a permanent architecture decision,
- paste large raw HTML prototype blocks into React pages,
- introduce new brand colors, extra accent colors, neon effects, or generic template styling.

---

## Design Rules To Preserve

These are locked unless the PRD explicitly says otherwise:

- True black dark mode and soft neutral light mode.
- Frosted glass cards as the default elevated surface.
- Titanium / brushed-silver hero cards.
- Champagne gold accent used sparingly.
- Tabular numerals for money, percentages, and stats.
- Focus-visible outlines in the accent color.
- Reduced-motion support across CSS and JS-triggered animations.
- Mobile-first app-shell feel for student and influencer product surfaces.

Do not change the core token values already established in `src/styles/tokens.css` unless they are objectively inconsistent with the locked design doc.

---

## Current Scaffold Context

Stage 01 already gives you:

- route groups for public, Super Admin, influencer, and student surfaces,
- global theme tokens and a basic theme toggle,
- reusable metadata/config helpers,
- placeholder pages and shared shell structure,
- working lint/build/dev verification.

Your job is to deepen that foundation rather than replacing it.

---

## Implementation Requirements

### 1. Strengthen The Global Design Foundation

Refine `src/app/globals.css` and any related theme utilities so the app has a stronger locked-system base for:

- typography roles,
- spacing rhythm,
- interactive states,
- focus states,
- reduced-motion handling,
- tabular numeral utilities,
- glass / elevated surface variants,
- app-shell behavior where appropriate.

Keep the token definitions centralized in `src/styles/tokens.css`.

### 2. Build Shared Reusable UI Primitives

Create reusable components for the design language instead of repeating long Tailwind strings across pages.

At minimum, add components in `src/components/ui/` and `src/components/layout/` for ideas like:

- `glass-card`
- `hero-card`
- `stat-chip`
- `badge` or `status-pill`
- `progress-bar`
- `section-heading`
- `surface-frame`
- `mobile-app-shell`
- `tab-bar`

You may adjust exact filenames if the structure is cleaner, but the result should clearly separate primitives from page-level composition.

### 3. Upgrade The Existing Placeholder Routes

Refactor the current route pages so they visibly use the shared design system instead of only generic placeholder blocks.

The pages should still remain scaffold-friendly, but they should now feel like:

- a real premium TradeHub public shell,
- a real platform-owner dashboard direction,
- a real influencer workspace direction,
- a real student mobile-app direction.

Do not turn Stage 02 into the final marketing page. Keep content minimal and product-shaped.

### 4. Add A Dedicated Design-System Preview Route

Add a route specifically for visual progress and proof, such as:

```text
src/app/(public)/design-system/page.tsx
```

This route should let a human quickly inspect:

- dark and light theme appearance,
- hero card,
- glass card variants,
- buttons,
- pills/badges,
- progress bars,
- stat chips,
- typography hierarchy,
- tab bar styling,
- focus-visible treatment,
- motion / reduced-motion behavior where practical.

This preview route is the easiest place for the user to start seeing progress while later prompts are still incomplete.

### 5. Preserve Mobile-First Product Surfaces

For student and influencer routes, the design should start moving toward the prototype app-shell feel:

- tighter vertical rhythm,
- more app-like panels,
- more obvious mobile card composition,
- optional max-width mobile shell framing,
- no fake phone bezel,
- safe-area-aware spacing patterns when useful.

The public and Super Admin routes can be wider desktop-friendly layouts, but the student route especially should feel like the beginning of a real mobile product.

### 6. Motion And Accessibility

Implement the motion and accessibility requirements from the design doc:

- `:focus-visible` accent outlines,
- reduced-motion support,
- no unnecessary idle animation noise,
- hero sheen behavior only where it makes sense,
- signal-style entrance motion only where reusable and not overused,
- text contrast that remains readable in both themes.

### 7. Keep Prompt 03 Ready

Do not bury data assumptions inside the components.
Components should accept props cleanly so Prompt 03 can feed them typed mock data instead of rewriting their structure.

---

## Suggested Source Additions

Use this as a guide, adjusting only if the codebase needs a cleaner shape:

```text
src/
  components/
    layout/
      mobile-app-shell.tsx
      route-section.tsx
    ui/
      badge.tsx
      button.tsx
      glass-card.tsx
      hero-card.tsx
      progress-bar.tsx
      section-heading.tsx
      stat-chip.tsx
      tab-bar.tsx
      theme-toggle.tsx
  app/
    (public)/
      design-system/page.tsx
```

You do not have to create every file above if a simpler version is better, but the end result should clearly look like a reusable system rather than a one-off page restyle.

---

## How The User Can Start Seeing Progress

Yes, the user should be able to start seeing progress during this stage.

Make that easy by ensuring:

1. `npm run dev` works throughout the implementation.
2. The user can open `http://localhost:3000/design-system` to inspect the visual system directly.
3. The user can also refresh these existing surfaces to watch the system spread:
   - `/`
   - `/admin`
   - `/workspace`
   - `/workspace/onboarding`
   - `/app`
4. The theme toggle still works so they can compare dark and light modes live.

If you add any especially useful preview route or visual test surface, mention it clearly in the final response.

---

## Verification

After implementation:

- run `npm run lint`
- run `npm run build`
- run `npm run dev`
- inspect the main routes
- inspect the new design-system preview route
- verify theme switching visually or with a minimal smoke check
- report anything that could not be verified

Expected commands will likely include:

```bash
npm run lint
npm run build
npm run dev
```

You may also use simple local route smoke checks such as `curl` if useful.

---

## Success Checks To Prove Everything Is OK

Before saying Stage 02 is complete, check all of the following and report the result clearly:

1. **Lint check:** `npm run lint` passes.
2. **Build check:** `npm run build` passes.
3. **Dev server check:** `npm run dev` starts successfully and shows the local URL.
4. **Route check:** confirm these routes load without a framework error page:
   - `/`
   - `/terms`
   - `/privacy`
   - `/risk-disclosure`
   - `/data-use`
   - `/join/apexfx`
   - `/admin`
   - `/workspace`
   - `/workspace/onboarding`
   - `/app`
   - `/design-system`
5. **Theme-system check:** confirm dark and light token usage is still grounded in the locked PRD values, not replaced with new arbitrary colors.
6. **Component check:** confirm reusable design primitives now exist and are actually used by the route pages.
7. **Interaction check:** confirm accent focus rings, theme toggle behavior, and reduced-motion handling still exist.
8. **Preview check:** confirm there is now a clear route the user can open to watch visual progress directly.
9. **No-secrets check:** confirm no secrets, private keys, wallet files, or real service credentials were created.
10. **Prompt 03 readiness check:** confirm the components are prop-driven enough for mock data and domain models to plug in next without rewriting the design layer.

If any check fails, do not mark the stage complete. Fix it, or explain the blocker precisely.

---

## Definition Of Done

Stage 02 is done when:

- the scaffold still builds and runs,
- the visual language clearly matches TradeHub more closely,
- reusable design components exist,
- the placeholder routes actually use the shared system,
- there is a dedicated visual preview route,
- dark/light theming remains locked to the PRD,
- Prompt 03 can add data models without redoing the visual foundation.

---

## Final Response Expected From The AI

When finished, respond with:

- what reusable design components were created,
- what routes were upgraded,
- where the user can view progress locally,
- the verification checklist with PASS/FAIL results,
- the next recommended prompt: **Prompt 03 — Mock data and domain models**.
