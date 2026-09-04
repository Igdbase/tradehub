# TradeHub — Security & Risk Review
**Document: 07 (Addendum) | Reviewed against PRD v2.6**

This is a vulnerability and gap pass across all six PRD documents — not a rewrite of any decision, just what needs to be tightened before this is trusted with real money and real broker credentials.

---

## Quick Reference

| # | Finding | Severity | Doc |
|---|---|---|---|
| 1 | `youtubeUrl` field-redaction rule doesn't work in Firestore | Critical | 03 |
| 2 | Single static broker encryption key, no rotation path | Critical | 03/06 |
| 3 | No sanity-check or kill switch before Auto-Copy execution | Critical | 02/03 |
| 4 | Single Firebase project + rules-only isolation, no rules testing | Critical | 03 |
| 5 | No fraud monitoring on Paystack settlement/bank changes | Critical | 02/03 |
| 6 | Super Admin service account: full bypass, no audit log | High | 03 |
| 7 | MFA required by policy but not enforced in Security Rules | High | 03 |
| 8 | No server-side check that broker API keys lack withdrawal rights | High | 02 |
| 9 | Stored XSS risk in influencer-authored lesson notes | High | 02 |
| 10 | No webhook idempotency / replay protection | High | 03 |
| 11 | Admin panel partly relies on URL secrecy, no lockout/rate-limit | High | 01 |
| 12 | Subdomain takeover risk on suspended/deleted workspaces | High | 01/05 |
| 13 | No Firestore backup / disaster-recovery plan | Medium | 03/06 |
| 14 | No dependency/supply-chain scanning | Medium | 06 |
| 15 | No CSP or security headers specified | Medium | 03 |
| 16 | No incident alerting/monitoring strategy | Medium | 03 |
| 17 | CSV exports vulnerable to formula injection | Medium | 02 |
| 18 | Ambiguous cutoff: does suspension kill live access immediately? | Medium | 05 |
| 19 | No rotation cadence for Paystack/Resend/Firebase secrets | Lower | 06 |
| 20 | No responsible-disclosure channel | Lower | — |
| 21 | Unbounded Firestore reads/writes can exhaust quota or force early paid usage | Medium | 03/06 |

---

## Critical — fix before launch

**1. `youtubeUrl` field redaction is non-functional as written**
The rule `!('youtubeUrl' in request.resource.data)` uses `request.resource`, which only exists on writes — it's empty on reads. Even fixed to `resource.data`, Firestore Security Rules can't redact individual fields from a document read; it's whole-document allow/deny only. As written, a student with the Firestore client SDK could read the lesson document directly and get the raw URL, defeating the stated goal in doc 03 and the checklist item in doc 06.
*Fix:* move `youtubeUrl` into a separate sub-document (`lessons/{id}/private/video`) with `allow read: if false` for students — same pattern already used correctly for `broker_keys`. Serve the embed via a server-side API route that resolves the ID without ever sending the URL field to the client.

**2. One encryption key for every tenant's broker secrets**
`BROKER_API_ENCRYPTION_KEY` is a single static value, generated once, explicitly never rotated. If it leaks — via a dependency, a misconfigured log, a departing contractor — every connected Binance/Bybit key across every workspace is exposed at once, and there's no documented way to rotate without a full re-encryption migration.
*Fix:* envelope encryption — a per-workspace (or per-key) data key, itself encrypted by a root key held in a real KMS (Google Cloud KMS, since you're already on GCP/Firebase). Root key rotation then doesn't require touching every stored secret.

**3. No sanity-check or kill switch on Auto-Copy execution**
A parsed Telegram message goes straight to trade execution. There's no check against live market price, no per-workspace rate limit on signal frequency, and no emergency pause — at the influencer level or platform-wide. A hijacked Telegram account (SIM-swap, session theft) or a simple fat-fingered price/decimal posts directly into real student accounts before anyone can react.
*Fix:* reject signals where entry is more than X% from current market price; cap signals-per-minute per workspace; add an instant "pause all copier execution for this workspace" toggle for both the influencer and Super Admin.

**4. Single Firebase project, isolation enforced only by rules**
The cost trade-off in doc 01/03 (one project, namespace isolation) means Security Rules are the *only* thing standing between every tenant's data. There's no mention of automated rules testing (Firebase's emulator + rules unit tests) in CI. One bad rule change is a cross-tenant breach, not a contained one.
*Fix:* rules unit tests in CI, blocking merge on failure — test cross-workspace read denial explicitly, not just manually before launch.

**5. No fraud monitoring on payout/settlement changes**
Split-payment marketplaces are a classic target for a specific attack: compromise the influencer's Paystack account (or intercept onboarding), change the settlement bank, and drain the 90% before anyone notices. Nothing in the Trust & Safety scope (doc 02/03) monitors for this.
*Fix:* alert Super Admin on any subaccount settlement-detail change; consider a short hold/confirmation step before a changed bank detail becomes active.

---

## High — fix before scaling past the pilot cohort

**6. Super Admin service account has no audit trail**
It bypasses all Security Rules by design, which is correct for an admin panel — but nothing logs what it was used for. If `FIREBASE_SERVICE_ACCOUNT_KEY` (a single Vercel env var) leaks, it's unrestricted, unaudited access to every tenant's data.
*Fix:* log every Admin SDK read/write with actor + timestamp to a separate append-only collection; treat the key like the broker encryption key above (rotation plan, restricted access).

**7. MFA is policy, not enforced in the rules shown**
Doc 03/06 state MFA is required for influencers and broker-linked students, but the Security Rules only check `request.auth != null` and ownership — not whether the second factor was actually completed. A bypass of the client-side MFA prompt (or a token obtained before MFA enrollment) wouldn't be caught at the data layer.
*Fix:* check `request.auth.token.firebase.sign_in_second_factor != null` directly in rules for sensitive paths (broker key writes, payout config), not just at the UI.

**8. No validation that linked API keys are actually trade-only**
Doc 02 instructs students to generate a "Trade-Only" key, but nothing server-side confirms the key lacks withdrawal permission before it's accepted. This relies entirely on the student doing it correctly.
*Fix:* on link, make a harmless authenticated call that would reveal withdrawal permission (Binance/Bybit both expose this) and reject the key if withdrawal is enabled.

**9. Stored XSS via lesson notes**
Lesson notes are rich text, authored by influencers, rendered to students. No sanitization step is mentioned. A compromised or malicious influencer account could inject a script that runs in every student's browser on that workspace.
*Fix:* sanitize on write and on render (e.g., DOMPurify) — never trust stored rich text as safe HTML.

**10. No webhook idempotency / replay protection**
HMAC signature verification is specified, but not idempotency. Paystack (like most providers) can redeliver the same webhook event. Nothing stops `charge.success` or a chargeback event from being processed twice.
*Fix:* store processed Paystack event IDs and short-circuit duplicates before they touch subscription state.

**11. Admin path secrecy is being asked to do too much**
The non-public URL segment is a reasonable deterrent, but the doc frames it close to a primary control. There's no mention of rate-limiting or lockout on the admin login itself, so path-guessing/brute-force isn't addressed independent of the path being secret.
*Fix:* treat the hidden path as defense-in-depth only; add rate limiting and account lockout on the admin login regardless of whether the path is ever discovered.

**12. Subdomain takeover risk on offboarding**
Wildcard DNS (`*.tradehub.com` → Vercel) means every possible subdomain resolves. Doc 05's offboarding flow covers data export but not infrastructure cleanup — if a workspace alias is freed in Vercel without removing the routing, it can potentially be reclaimed and used to serve phishing content on a domain students already trust.
*Fix:* add explicit domain/alias deprovisioning as a hard step in the suspension/deletion flow, before — not after — the 14-day window closes.

---

## Medium — process gaps worth closing early

**13. No backup or disaster-recovery plan.** Nothing in doc 03/06 mentions Firestore point-in-time recovery or scheduled exports. A bad migration or bug deleting data has no documented recovery path.

**14. No dependency/supply-chain scanning.** A stack handling payment credentials and broker keys with no `npm audit`/Dependabot mentioned in doc 06's setup is a gap worth closing before it's carrying real money.

**15. No CSP or security headers specified.** With YouTube iframe embeds and externally-pasted Cloudinary/Drive links, a defined Content-Security-Policy (and HSTS, X-Frame-Options) belongs in the non-functional requirements alongside HTTPS.

**16. CSV exports aren't sanitized against formula injection.** Member lists and journal exports (doc 02) open in Excel/Sheets by most influencers — unescaped fields starting with `=`, `+`, `-`, `@` can execute formulas on open.

**17. Suspension timing is ambiguous.** Doc 05 says offboarding gives 14 days to export data, but doesn't say whether *live* access (logins, copier execution) is cut immediately on suspension or only after that window. If copier execution can still run during a "suspended for fraud" window, that's a real exposure.

**21. Firestore quota exhaustion risk.** Firestore is safe for the MVP, but unbounded dashboards, collection scans, noisy progress writes, or realtime listeners on every surface can burn through the free tier quickly and create availability/cost pressure before there is meaningful revenue.
*Fix:* enforce pagination at 25-50 records, use `/platform_summaries/current` and `/workspace_summaries/{workspace_id}` for dashboard totals, rely on custom claims for role/workspace checks where possible, use emulator-first development, save lesson progress only on milestones, and restrict realtime listeners to truly live surfaces such as active signals.

---

## Lower priority — fine to defer, but worth a line item

**18.** No documented rotation cadence for Paystack/Resend/Firebase keys.
**19.** No responsible-disclosure or bug-bounty contact — reasonable to skip at MVP, but worth a `security@` address before any public traction.
**20.** Data residency/GDPR posture is Nigeria-only by design now (consistent with doc 01's phased approach) — just flag it for revisit alongside the Phase 3 international expansion line.

---

*None of this changes the architecture decisions in doc 01 — the single-project, rules-based isolation and the static-key approach are reasonable cost/speed trade-offs for an MVP. The point is that several of them (1, 2, 3, 4, 6) are exactly the kind of thing that's cheap to fix now and very expensive to fix after the first real workspace is live with real money moving through it.*
