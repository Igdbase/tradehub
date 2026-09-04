# Prompt 04 — Marketing Landing Page and Application Flow

You are building **TradeHub Stage 04**. Stages 01-03 already created the Next.js scaffold, locked design system, reusable UI primitives, typed domain models, and realistic mock data. Your job now is to turn the public homepage into a polished influencer-facing marketing landing page with a credible application flow.

Build on the current codebase. Do not replace the Stage 02 design system. Do not undo the Stage 03 typed mock layer.

This stage should feel like a serious launch page, not a placeholder and not a generic SaaS template. Make it cool, fluent, premium, and convincing while staying faithful to the PRD.

---

## Read First

Before writing code, read these files in the repository:

- `files/tradehub-01-overview.md`
- `files/tradehub-02-features.md`
- `files/tradehub-03-tech.md`
- `files/tradehub-04-design.md`
- `files/tradehub-05-policies.md`
- `files/tradehub-06-setup.md`
- `files/tradehub-07-security-review.md`
- `files/tradehub-marketing-blueprint.md`
- `files/tradehub-landing.html`
- `files/tradehub-prototype-student.html`
- `files/tradehub-prototype-influencer.html`
- `asset/tradehub-colors.html`
- `prompt/01-project-scaffold.md`
- `prompt/02-locked-design-system.md`
- `prompt/03-mock-data-domain-models.md`
- `prompt/promptsumary.md`
- `src/styles/tokens.css`
- `src/app/globals.css`
- `src/app/(public)/page.tsx`
- `src/app/(public)/join/[handle]/page.tsx`
- `src/app/(public)/design-system/page.tsx`
- `src/types/*`
- `src/data/*`
- `src/lib/mock-selectors.ts`
- `src/components/ui/*`
- `src/components/layout/*`

Treat `files/tradehub-landing.html` as the strongest layout/content prototype for this stage.
Treat `files/tradehub-marketing-blueprint.md` as the messaging source of truth.
Treat `files/tradehub-04-design.md` as locked visual law.
Treat Stage 03 mock data as the domain source of truth.

---

## Stage Goal

Replace the Stage 03 public overview homepage with a production-shaped marketing page for trading influencers.

The page must sell this promise:

> TradeHub gives trading educators a fully branded course, signals, and journal platform they can launch in days, with Paystack/local payments by default, optional Solana Pay / USDC checkout, and prop-firm-safe signal routing built in.

At the end of this stage:

- `/` should be a polished influencer acquisition landing page.
- The page should explain the product clearly without overpromising trading results.
- The application form should collect realistic onboarding CRM data matching Stage 03 application types.
- The form should validate locally and show a credible success/next-step state.
- `/join/[handle]` should remain a student invite route, not be confused with the influencer application flow.
- The design should stay locked to the existing dark/light TradeHub visual system.
- Prompt 05 should be able to add auth and real backend persistence without rewriting the public flow.

---

## What This Stage Should NOT Do

Do **not**:

- add Firebase SDK wiring,
- add real Firestore writes,
- add real authentication,
- add real Paystack or Solana SDKs,
- send email,
- create a fake backend that pretends data is persisted,
- collect real payment details,
- collect real wallet private keys or seed phrases,
- add Telegram bot token collection here,
- create admin-only data leaks on the public page,
- introduce new brand colors outside the locked tokens,
- use hype copy like guaranteed profit, passive income, win rate promises, or get-rich messaging.

This is still a frontend-first stage. It should be ready for real backend wiring later, but it must not pretend the backend exists now.

---

## Core Messaging Requirements

The landing page is for **influencers**, not students.

Lead with the white-label platform promise:

- "Your platform. Your brand. Your students never see ours."
- fully branded course, signals, and journal platform,
- launch in days, not months,
- no code required from the influencer,
- pay when students pay,
- serious compliance posture around prop-firm students.

The strongest differentiator is the **Signal Alerts vs Auto-Copy split**:

- Personal/live accounts can use Auto-Copy where allowed.
- Prop-firm/funded accounts receive Signal Alerts only.
- This protects students from accidental prop-firm ToS violations.
- The platform understands funded-account risk instead of treating every account the same.

Payments should be explained clearly:

- Paystack is the default Nigeria-first/local rail.
- Solana Pay / USDC is optional for approved workspaces and crypto-friendly audiences.
- Solana should appear as a payment/partner credibility card or checkout option, not as the main headline.
- Mention "Powered by Solana Pay / USDC checkout available" only where it makes strategic sense.

Avoid anything that sounds like:

- guaranteed returns,
- "make money automatically",
- "copy profitable trades",
- investment advice,
- bypassing prop-firm rules,
- risk-free trading.

---

## Page Structure Requirements

Build the landing page at:

```text
src/app/(public)/page.tsx
```

Use reusable components where possible. It is fine to add page-specific components under a clean folder such as:

```text
src/components/marketing/
```

Suggested sections:

1. **Sticky navigation**
   - TradeHub wordmark.
   - Links to page anchors such as `What you get`, `Safety`, `How it works`, `Model`, and `Apply`.
   - Theme toggle.
   - Primary CTA to the application section.

2. **Hero**
   - Influencer-facing headline.
   - Clear short description.
   - Primary CTA: `Apply for a workspace`.
   - Secondary CTA: `See how it works`.
   - Premium hero visual using the Stage 02 hero-card / signal-card language.
   - Do not create a fake phone bezel unless it is already in the design system.

3. **Value strip**
   - Days, not months.
   - Pay only when you earn.
   - Built around prop-firm rules.

4. **Problem section**
   - Telegram/WhatsApp/manual bank transfer is fragile.
   - Generic course platforms are not trading-native.
   - Generic signal bots can create prop-firm risk.

5. **What you get**
   - Course Hub.
   - Trade Signals.
   - Trading Journal.
   - Optional mention of calculators/analytics only if kept concise.

6. **Prop-firm safety differentiator**
   - Side-by-side cards:
     - Personal account: Auto-Copy eligible.
     - Funded / prop-firm account: Signal Alert only.
   - Use green/amber status language from the design system.

7. **Built for segments**
   - Telegram signal seller.
   - Course-only educator.
   - Prop-firm mentor.
   - Crypto trader.

8. **Payment and partner model**
   - Explain 90/10 default split as negotiable.
   - Paystack local checkout as default.
   - Solana Pay / USDC as optional approved rail.
   - Avoid making Solana feel bolted-on or dominant.

9. **How it works**
   - Apply.
   - Vetting call.
   - Workspace setup.
   - Launch to students.

10. **Application form**
   - See form requirements below.
   - Show success state and next steps after valid submit.

11. **Footer**
   - Privacy, Terms, Risk Disclosure, Data Use links.
   - Short risk-aware positioning line.

---

## Application Form Requirements

The form should collect realistic data that maps cleanly to `WorkspaceApplication` and the Super Admin onboarding CRM.

At minimum include:

- full name,
- email,
- primary platform and handle,
- audience size,
- market traded: forex, crypto, or both,
- how students mostly trade: personal accounts, prop-firm/funded accounts, or mixed,
- current monetization method,
- whether they currently sell courses, signals, mentorship, or a community,
- rough student/customer count if applicable,
- interest in Solana Pay / USDC checkout,
- notes about their audience and what they want to launch,
- required confirmation that they understand TradeHub does not promise trading results.

Local validation should include:

- required fields,
- valid email shape,
- clear inline errors,
- accessible error messaging,
- no submission success until required fields pass,
- disabled or loading state briefly on submit if useful.

After valid submit:

- Do not send data externally.
- Show a clear success panel explaining this is a Stage 04 frontend handoff.
- Show the captured application summary in a sanitized, React-rendered way.
- Include next-step copy: vetting review, short call, setup fee/manual approval, then workspace creation.
- Link to `/admin` as an internal demo route where the Super Admin CRM will later receive real applications.

Security note:

- React text rendering is enough for the mock success summary if you do not use `dangerouslySetInnerHTML`.
- Do not add `dangerouslySetInnerHTML`.
- Do not store the form in localStorage unless there is a clear reason.
- Do not log the full application payload to the browser console.

---

## Data Usage Requirements

Use Stage 03 data to make the page feel real:

- Use mock workspace/payment/application data for aggregate proof points.
- Use existing selector helpers where sensible.
- Do not hardcode every stat if a selector already gives the value.
- Keep public data non-sensitive and aggregate.
- Do not expose mock internal admin notes as public page content.

Possible public stats:

- active mock workspaces,
- total active subscribers,
- current platform/payment rail examples,
- application pipeline count only if framed as a demo/pilot proof point.

Keep the page honest:

- Make it clear workspaces are vetted.
- Do not imply instant self-serve activation.
- Do not imply the public application form creates a live workspace yet.

---

## Join Route Requirement

Keep `/join/[handle]` as the **student invite route**.

Do not turn `/join/[handle]` into the influencer application route.

You may lightly upgrade `/join/[handle]` if needed so it visually matches the new landing page, but do not overbuild student onboarding before Prompt 05.

The public influencer application flow should live on `/` via the application section, or in a clearly linked route only if that is cleaner.

---

## Design Requirements

Preserve all locked Stage 02 visual rules:

- true black dark mode,
- soft neutral light mode,
- frosted glass surfaces,
- titanium/brushed-silver hero cards,
- champagne accent used sparingly,
- tabular numerals for stats and money,
- focus-visible accent outlines,
- reduced-motion support,
- clean mobile-first responsiveness.

The page should feel premium and specific to trading education:

- strong financial-product hero,
- clear hierarchy,
- restrained motion,
- tactile glass/metal surfaces,
- no purple SaaS gradients,
- no generic dashboard-template filler,
- no random new icon/color system.

If you add marketing components, keep them prop-driven and reusable.

---

## Accessibility And UX Requirements

Implement:

- semantic headings,
- accessible form labels,
- keyboard-friendly navigation,
- visible focus states,
- `aria-live` or equivalent for form success/error status where appropriate,
- responsive layout on mobile and desktop,
- no content hidden behind fixed nav on anchor jumps,
- reduced-motion-safe reveal/sheens if you use animation.

Manual QA should include:

- dark mode,
- light mode,
- mobile width around 375px,
- tablet width around 768px,
- desktop width around 1440px,
- keyboard tabbing through nav, CTAs, and form,
- invalid form submission,
- valid form submission.

---

## Suggested Implementation Shape

You may adjust if the current codebase suggests a better structure, but keep it clean:

```text
src/
  app/
    (public)/
      page.tsx
  components/
    marketing/
      application-form.tsx
      marketing-hero.tsx
      marketing-section.tsx
      payment-model.tsx
      prop-firm-safety.tsx
  lib/
    application-validation.ts
```

If the form needs client state, isolate only that component with `"use client"`.

Keep the rest of the landing page server-rendered where possible.

---

## Verification Requirements

Before closing Stage 04, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Then start the dev server:

```bash
npm run dev
```

Smoke test these routes:

- `/`
- `/admin`
- `/workspace`
- `/workspace/onboarding`
- `/app`
- `/join/apexfx`
- `/design-system`
- `/terms`
- `/privacy`
- `/risk-disclosure`
- `/data-use`

Expected:

- all routes return `200`,
- `/` is now the marketing landing page, not the Stage 03 overview,
- application form blocks invalid submissions,
- valid application form shows success/next-step state,
- theme toggle still works,
- no TypeScript errors,
- no ESLint warnings or errors,
- production build completes.

Also check:

- no real API keys,
- no real wallet addresses,
- no Paystack secret keys,
- no Solana private keys or seed phrases,
- no Telegram bot tokens,
- no raw YouTube lesson URLs added to public data,
- no `dangerouslySetInnerHTML` introduced for application/user text.

---

## Response Format When Finished

When you finish, reply with:

- the dev server URL and any port note,
- the main route to inspect first,
- the key files changed,
- a concise proof checklist with PASS/FAIL items,
- any parked notes for Prompt 05.

The recommended next prompt after this stage is:

**Prompt 05 — Authentication and Role Routing**

