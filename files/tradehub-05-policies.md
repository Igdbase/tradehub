# TradeHub — Policy Documents
**Document:** 05 of 06  
**Version:** 2.5 | **Last Updated:** July 2026

> **v2.5:** Adds policy coverage for optional Solana Pay / USDC checkout alongside Paystack.

All five documents below must be live at their respective URLs before any student can sign up. Have each reviewed by a Nigerian lawyer before going live — this document provides the content framework, not finalized legal copy.

---

## Document 1: Platform Terms of Service
**Live at:** `tradehub.com/terms`  
**Also shown:** during student signup, during influencer workspace activation

---

**TradeHub Platform Terms of Service**

*Last updated: [Date]*

**1. About TradeHub**

TradeHub ("the Platform", "we", "us") is a technology platform that allows trading educators and content creators ("Influencers") to offer courses, trade signal ideas, and trading tools to their subscribers ("Students"). TradeHub is operated by [Your Company Name], registered in [Jurisdiction].

TradeHub is a technology intermediary only. It is not a registered investment advisor, portfolio manager, broker, or financial institution. Nothing on TradeHub constitutes investment advice, financial advice, or a recommendation to buy or sell any financial instrument.

**2. Eligibility**

You must be at least 18 years old to use this platform. By creating an account, you confirm you meet this requirement and that you are legally permitted to use trading-related platforms in your jurisdiction.

**3. Accounts**

You are responsible for maintaining the confidentiality of your login credentials. You are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access.

**4. Influencer Workspaces**

Each workspace on TradeHub is independently operated by its Influencer. TradeHub does not vet, endorse, or guarantee the accuracy, quality, or profitability of any content, signal, or advice provided by any Influencer. Your relationship with an Influencer's platform is governed by that Influencer's own terms and pricing.

**5. Payments and Subscriptions**

Payments are processed by Paystack and, where enabled for a workspace, Solana Pay / USDC on Solana. Subscription fees are set by each Influencer independently. Refund policies are set by each Influencer and displayed at checkout. Crypto payments may be final at the payment-rail level and may require manual refund handling. TradeHub is not responsible for refund disputes between Students and Influencers — these are resolved through the in-platform dispute process.

**6. Trade Signals and the Trade Copier**

Trade signals delivered through the platform are for informational purposes only. They do not constitute investment advice. Auto-Copy (where available for personal accounts) executes trades automatically into your connected account at your direction, based on settings you configure. You remain solely responsible for all trades executed in your account. Trading involves risk of substantial loss.

**7. Prop Firm Accounts**

If you use a prop firm funded account, you are solely responsible for ensuring that your use of TradeHub's signal features complies with your prop firm's Terms of Service. TradeHub does not auto-execute trades into prop firm accounts. Signal Alerts are delivered for your manual consideration only. TradeHub is not responsible for any account suspension, breach of contract, or loss of capital resulting from your use of the platform in connection with a prop firm account.

**8. Prohibited Conduct**

You may not use the platform to: post false or misleading information, guarantee trading returns, manipulate markets, violate any third-party Terms of Service, or engage in any fraudulent activity.

**9. Intellectual Property**

Course content remains the property of the Influencer who created it. You may not reproduce, distribute, or share course content outside the platform.

**10. Limitation of Liability**

To the maximum extent permitted by applicable law, TradeHub shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform or any trading activity taken based on content delivered through it.

**11. Governing Law**

These Terms are governed by the laws of the Federal Republic of Nigeria.

**12. Changes**

We may update these Terms at any time. Continued use of the platform after notice of a change constitutes acceptance of the updated Terms.

---

## Document 2: Privacy Policy
**Live at:** `tradehub.com/privacy`  
**Also shown:** during student signup (checkbox acceptance)

---

**TradeHub Privacy Policy**

*Last updated: [Date]*

**1. What We Collect**

- **Account data:** email address, display name, password (hashed — never stored in plaintext).
- **Payment data:** Paystack customer code, Solana payment reference/signature, and wallet address where applicable. We never store card numbers, bank account numbers, private keys, seed phrases, or any raw payment instrument data — Paystack and the student's wallet handle this.
- **Trading data:** trade history synced from your connected exchange or broker account, or entered/imported manually. Trade data is stored in Firebase Firestore, encrypted in transit (HTTPS) and at rest.
- **Broker API credentials:** if you connect an exchange account for Auto-Copy, your API key and secret are encrypted using AES-256 before being stored. They are never returned to any client-side application — they are used only server-side by Firebase Cloud Functions to execute trades at your direction.
- **Usage data:** lesson progress, quiz scores, course completion percentages, login timestamps.

**2. How We Use Your Data**

- To operate your account and deliver the platform features you have subscribed to.
- To process payments and manage your subscription via Paystack.
- To allow your Influencer to view your course progress and (subject to your privacy settings) your trading journal.
- To send transactional emails: signup confirmation, payment receipts, renewal reminders, and important account alerts.

**3. Who Can See Your Data**

| Data | Who sees it |
|---|---|
| Your course progress | You + your Influencer |
| Your trading journal | You + your Influencer (unless privacy is enabled) |
| Your journal (privacy on) | You only |
| Your broker API keys | You + platform server (Cloud Functions only — never any human) |
| Your payment information | You + Paystack |
| Your subscription status | You + your Influencer + us |

TradeHub staff (including the Super Admin) can access workspace-level data for trust & safety and platform operations purposes. We do not sell your data to any third party.

**4. Data Retention**

Your data is retained for as long as your account is active. If you cancel your subscription or your Influencer's workspace is deleted, you have 14 days to export your journal data before it is removed from our servers.

**5. Your Rights**

You may request access to, correction of, or deletion of your personal data at any time by contacting [support@tradehub.com]. We will respond within 14 days.

**6. Security**

We use AES-256 encryption for sensitive credentials, HTTPS across all platform URLs, Firebase Authentication for identity management, and 2FA for privileged accounts. No system is perfectly secure — we will notify you promptly if a breach affecting your data occurs.

**7. Third-Party Services**

We use: Firebase (Google) for database and authentication, Paystack for payment processing, Solana network/RPC infrastructure for optional USDC wallet checkout, Vercel for hosting, Resend for transactional email, Cloudinary for attachment storage. Each operates under its own privacy policy or network rules.

**8. Changes**

We will notify you of material changes to this policy via email and an in-app notice.

---

## Document 3: Trading Risk Disclosure
**Live at:** `tradehub.com/risk-disclosure`  
**When shown:** immediately before a student activates Signal Alerts or Auto-Copy — explicit checkbox, timestamped, versioned

---

**TradeHub Trading Risk Disclosure**

*Version 1.0 — [Date]*

Please read this disclosure carefully before activating any signal or trade copying feature.

**Trading involves substantial risk of loss.** Foreign exchange, cryptocurrency, and other financial instruments are highly volatile. You may lose some or all of your invested capital. Past performance of any signal, strategy, or trader is not indicative of future results.

**TradeHub is a technology platform, not a financial advisor.** We do not provide investment advice, portfolio management services, or financial planning. Signal ideas delivered through the platform are the independent views of Influencers, not TradeHub. We do not verify, endorse, or guarantee the accuracy, profitability, or suitability of any signal.

**You are solely responsible for your trading decisions.** By activating signal features, you confirm that you understand the risks, that you are trading with funds you can afford to lose, and that you will not hold TradeHub, its operators, or any Influencer liable for any losses incurred.

**Auto-Copy executes trades automatically.** If you connect a personal exchange or broker account for Auto-Copy, the platform will execute trades in your account on your behalf based on signals posted by your Influencer and the risk settings you configure. You remain responsible for monitoring your account and for all trades executed.

**Prop firm accounts.** If you use a funded account from a prop firm, Signal Alerts delivers trade ideas for your manual consideration only. Auto-Copy is not available for prop firm accounts. You are solely responsible for ensuring your use of signal features does not violate your prop firm's Terms of Service.

**Seek independent advice.** If you are unsure whether trading is appropriate for your financial situation, consult an independent financial advisor before proceeding.

*By checking the box below, you confirm that you have read, understood, and accept this Risk Disclosure. Your acceptance is recorded with a timestamp and the version number of this document.*

[ ] I have read and accept the TradeHub Trading Risk Disclosure (v1.0)

---

## Document 4: How We Use Your Trading Data
**Live at:** `tradehub.com/data-use`  
**When shown:** during broker/exchange account linking, as a standalone page linked in the Privacy Policy

---

**How TradeHub Uses Your Trading Data**

*Last updated: [Date]*

This document explains specifically what happens with your trading data — your trade history, journal entries, performance statistics, and broker API credentials. It is intentionally separate from our general Privacy Policy so you can find this answer quickly before connecting your account.

**What trading data we collect:**
- Trade history synced from your connected exchange or broker (open time, close time, pair, direction, entry price, exit price, P&L, lot size).
- Tags, notes, and labels you add to trades manually.
- Performance statistics calculated from your trade history (win rate, R:R ratio, P&L by session/pair/date).
- Your broker or exchange API key and secret (encrypted — see below).

**What we do with it:**
- Power your personal Trading Journal and performance dashboard — this is the only use of your trade history.
- Allow your Influencer to view aggregate statistics across their student base (e.g. "% of students profitable this month") and, subject to your privacy settings, your individual journal.
- Generate AI-powered insights (Phase 2, opt-in) based solely on your own trade history.

**What we never do with it:**
- We do not sell your trading data to any third party.
- We do not share your individual trade history with any other student, any advertiser, or any data broker.
- We do not use your trade data to train any external AI model without a separate, explicit opt-in that you can withdraw at any time.
- We do not use your trade data for any purpose beyond delivering the features you signed up for.

**Your API keys:**
Your broker or exchange API key and secret are encrypted using AES-256 encryption before being written to our database. The encryption key is held server-side only. Your credentials are never transmitted to or stored in any client-side application. They are used exclusively by our server-side Cloud Functions to execute trades at your direction (Auto-Copy mode) or sync your trade history. No human at TradeHub can read your decrypted API credentials — only the server function that needs them can access them.

**Your privacy controls:**
- You can enable "Hide my journal" globally at any time — your Influencer will see only "This student's journal is private."
- You can mark individual trades as private — your Influencer sees all other trades but those specific entries show as [Hidden].
- You can disconnect your broker account at any time. Existing synced trade history remains in your journal unless you delete it.

**Deleting your data:**
You can request full deletion of your trading data at any time via account settings or by emailing [support@tradehub.com]. We will process the request within 14 days.

---

## Document 5: Influencer Code of Conduct
**When shown:** during workspace onboarding (Step 2) — must be read and accepted, logged with timestamp and version  
**Also:** re-acceptance required if the Code is updated

---

**TradeHub Influencer Code of Conduct**

*Version 1.0 — [Date]*

By accepting this Code of Conduct, you agree to operate your TradeHub workspace in accordance with the following standards. Violations may result in immediate workspace suspension, pending investigation, at TradeHub's sole discretion.

**1. No guaranteed-return claims**

You must not claim, imply, or suggest that any signal, strategy, or course will guarantee profits or specific returns. This applies to content published within your workspace, in your Telegram channels, in your social media, and in any marketing that references your TradeHub workspace.

**2. No undisclosed conflicts of interest**

If you hold a position in any instrument before posting a signal about it, you must disclose this clearly in the signal. You must not post signals designed primarily to benefit your own open positions.

**3. No signal front-running**

You must not enter a trade in your own account after composing but before posting a signal, in order to benefit from the price movement that may result from your students copying the trade. All personal trades must be placed before the signal is composed, or after students have had a reasonable opportunity to act on the published signal.

**4. Structured signal format**

Signals posted via Telegram or in-app must follow the platform's structured format. Free-form trade calls that cannot be parsed by the platform — and therefore cannot be delivered reliably to students — are not permitted as the primary signal method.

**5. Accurate track record**

You must not fabricate, cherry-pick, or misrepresent your trading track record in any content published through the platform. If you share performance statistics, they must be accurate and include losing periods, not only profitable ones.

**6. Respect for student autonomy**

You must not pressure, coerce, or emotionally manipulate students into maintaining subscriptions, taking trades, or increasing position sizes. Students have the right to cancel at any time and to exercise their own judgment on any signal.

**7. Compliance with applicable laws**

You are responsible for understanding and complying with any laws or regulations that apply to your activities, including any that govern the provision of financial advice or signals in your jurisdiction. TradeHub does not provide legal guidance on this.

**8. Tax obligations**

Revenue received through your TradeHub workspace is your income. You are solely responsible for declaring and paying any applicable taxes. TradeHub does not withhold taxes on your behalf.

**9. Violations**

TradeHub reserves the right to suspend or terminate your workspace immediately upon credible evidence of a violation of this Code, without prior notice in serious cases. You will be given an opportunity to respond in non-urgent cases.

*By accepting this Code of Conduct, you confirm that you have read and understood all of the above, and that you agree to operate your workspace accordingly. Your acceptance is recorded with a timestamp and the version number of this document.*

[ ] I have read and accept the TradeHub Influencer Code of Conduct (v1.0)
