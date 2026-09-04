# TradeHub — Sponsor Interview Script
**Use with:** `TradeHub-Pitch-Deck.pptx`  
**Target time:** 8-10 minutes, then Q&A  
**Purpose:** Tell the truth clearly, show what is already real, and explain why Solana matters without pretending it is the only rail.

---

## Before You Share Your Screen

Say this first:

> "Before I show the deck, I want to frame this properly. TradeHub is not just an idea deck. The core product surfaces are already built and working locally. We have authenticated admin, influencer, and student flows, real Paystack test checkout working end-to-end, and an optional Solana / USDC rail that we have already verified locally on-chain. What is not done yet is public deployment, production hardening, and the first live paying workspaces. So this conversation is about accelerating something real, not funding a blank page."

That opening matters because it instantly removes the "is this just mockup talk?" question.

---

## Slide 1 — Title

> "TradeHub is a white-label operating system for trading educators. Instead of running a paid signal business through WhatsApp, Telegram, screenshots, and manual follow-up, each educator gets a branded workspace for onboarding, billing, courses, signals, and student visibility."

> "The important point is this: the student sees the educator's brand, not ours."

---

## Slide 2 — The Problem

> "Trading educators already have audience attention, but most of them run the business side badly because the tools are fragmented. Payments are informal, onboarding is manual, signals are delivered in inconsistent ways, and there is almost no operational visibility."

> "That means good educators still look unstructured, and students are left in a low-trust experience."

---

## Slide 3 — The Solution

> "TradeHub gives each educator a branded operating layer: onboarding, pricing, student access, course delivery, signal delivery, and progress tracking in one system."

> "The vision is simple: help trading educators run like real businesses without making them hire a product team first."

---

## Slide 4 — Product Walkthrough

> "There are three core surfaces. The super admin surface is for workspace review and platform operations. The influencer workspace is where an educator manages onboarding, pricing, courses, and signals. The student app is where the learner consumes the experience."

> "Each workspace is isolated. Auth, routing, workspace data, and payment records are scoped per tenant."

If possible, switch briefly to the live app here.

---

## Slide 5 — How It Works

> "The flow is straightforward. First, the educator onboards and configures branding, conduct, pricing, and checkout readiness. Second, students subscribe. Third, the educator publishes signals and learning content. Fourth, the payment rail updates access and records the business logic behind the scenes."

> "Today, Paystack is the default local recurring rail for Nigeria. Solana / USDC is the optional secondary rail for approved workspaces."

> "On the signal side, we also distinguish between personal live-account style delivery and safer prop-firm-aware delivery, because we do not want to design the product in a way that pushes students into ToS violations."

---

## Slide 6 — Business Model

> "The current commercial model is simple: educator pricing sits on the workspace tier, and TradeHub takes a platform share. In our current MVP logic we are modeling a 90 / 10 split."

> "For Paystack, the split can be enforced through Paystack payout configuration. For Solana, we already record the 90 / 10 accounting cleanly in a settlement ledger after a verified payment, even though automatic on-chain payout is not yet the live behavior."

That last sentence is important because it is honest and technically mature.

---

## Slide 7 — Market Opportunity

> "Nigeria is the right launch market because local checkout trust matters, and Paystack already solves the first commercial rail cleanly there."

> "Africa is the next natural layer because the same informal-signals pattern exists in multiple markets."

> "And beyond local processors, Solana matters because it gives us a credible borderless payment path for approved workspaces that want USDC checkout without waiting for a local processor in every geography."

---

## Slide 8 — Why This Can Compound

> "TradeHub is stronger than a single-educator tool because every onboarded workspace improves the platform's operational base. We build reusable onboarding, reusable payout logic, reusable compliance posture, reusable course delivery, and reusable student lifecycle tooling."

> "That is what turns this from one branded site into platform infrastructure."

---

## Slide 9 — Where We Are Today

> "This is the most important reality slide. The core product is already built and locally verified."

> "We now have role-based authentication, an admin CRM for onboarding, an influencer workspace with onboarding and course publishing, a student app with gated access, Paystack test checkout verified end-to-end, and a Solana / USDC flow that creates quotes, verifies payment server-side, and records settlement entries."

> "What is still ahead is production deployment, production operations hardening, first live customers, and real usage feedback."

---

## Slide 10 — Next 4 Months

> "The next phase is not guessing what to build. It is hardening what already exists."

> "Phase one is production hardening: deployment, operational checks, remaining indexes, webhook exposure, monitoring, and final QA. Phase two is pilot onboarding with real educators and real students. Phase three is the first paying cohort with repeatable commercial onboarding."

---

## Slide 11 — Team

> "The product has been built with a builder-led approach: product thinking, architecture, frontend, backend integration, auth, payments, and multi-tenant structure were all designed together so the system behaves like one product instead of disconnected features."

If asked who built what, answer directly from the README cheat sheet.

---

## Slide 12 — The Ask

> "This raise is not about discovering whether the problem exists. It is about accelerating production hardening, live deployment, pilot onboarding, and the move from local proof to public production."

> "The capital helps us close the gap between a locally verified operating system and a live, revenue-bearing platform."

If the Solana sponsor asks where Solana fits:

> "Solana fits as the optional borderless rail. We did not force it into the Nigeria-first default flow, but we did build and verify the integration path where it actually adds value."

---

## Slide 13 — Closing

> "TradeHub is building the operating rails behind trading education businesses: local checkout where that wins, stablecoin checkout where that matters, and workspace infrastructure that keeps the business side structured."

> "What I am showing you is already real enough to test. What we are raising for is the jump from local proof to production scale."

Then stop and take questions.

---

## Fast Answers For Likely Questions

### "What exactly is already working?"

> "Admin onboarding CRM, influencer onboarding wizard, workspace dashboard, course publishing, student access gating, Paystack test checkout and callback verification, and a locally verified Solana / USDC payment flow with settlement-ledger recording."

### "What stack did you use?"

> "Next.js 14 App Router, TypeScript, Tailwind CSS, Firebase Auth, Firestore through the server-side Firebase Admin SDK, Paystack APIs for local checkout, and Solana web3.js plus SPL Token utilities for the optional USDC rail."

### "How did you integrate Solana?"

> "Server-side quote creation builds a Solana Pay request with amount, mint, recipient wallet, and reference. Server-side verification then checks the reference and verifies the USDC payment before updating the student subscription and recording the split ledger."

### "Did you really test Solana locally?"

> "Yes. We used a local Solana validator, created a local USDC-style SPL token mint, created platform and influencer wallets, generated a quote from the app, sent the token payment, then verified the transaction from the app and recorded the settlement entry."

### "Is this production-ready today?"

> "The architecture is production-oriented, but the current state is locally verified and not yet fully production-deployed. Paystack is closer to direct production use once live keys, live webhook URL, and deployment are in place. Solana is safe as a platform-collect plus settlement-ledger flow, but automatic influencer payout is still an ops or future automation step."

### "Why Paystack first if you are pitching Solana?"

> "Because Nigeria-first requires the most trusted local checkout for the launch market. Solana becomes strategically important as the optional second rail for approved workspaces that need USDC and cross-border flexibility."

### "Why not auto-send the influencer's 90% on-chain immediately?"

> "Because accounting truth and payout automation are different maturity levels. We implemented the accounting truth first so every verified Solana payment creates a clean settlement record. That is the right foundation before automating live payouts."

---

## Delivery Reminders

- Do not say "65% built." That is stale now.
- Do not say Solana is the default rail. It is not.
- Do not say Solana auto-pays the influencer share on-chain today. It does not.
- Do say Paystack is production-first for Nigeria and Solana is the optional global-ready rail.
- Do say the product is already locally verified across admin, influencer, student, Paystack, and Solana flows.
- If asked something very technical, open `interviewSection/README.md` and answer from the code map instead of guessing.
