# Stage 15F Paper Beta QA Checklist

Stage 15F validates the crypto paper Auto-Copy beta only. Do not use real Binance, Bybit, broker, wallet, service-account, or encrypted credential material in screenshots, fixtures, logs, or docs.

## Setup

1. Install dependencies with `npm install`.
2. Start local Firebase emulators with `npm run firebase:emulators`.
3. In a second terminal, seed Firestore fixtures with `npm run stage15f:seed`.
4. Seed Auth emulator users and claims with `npm run stage15f:seed-auth`.
5. Run the paper beta QA script with `npm run stage15f:qa`.
6. Run Firestore rules tests with `npm run firebase:rules:test`.
7. Start the app with `npm run dev:stage15f`.

Expected local Firestore fixture workspace:

- Workspace: `ws_stage15f_paper_beta`
- Influencer: `influencer_stage15f`
- Active Paystack personal-account student: `student_stage15f_paystack_active`
- Sandbox Binance student: `student_stage15f_binance_sandbox`
- Sandbox Bybit student: `student_stage15f_bybit_sandbox`
- Sandbox-preferred student: `student_stage15f_sandbox_preferred`
- Funded blocked student: `student_stage15f_funded_blocked`
- Paused student: `student_stage15f_paused`
- Unconnected student: `student_stage15f_unconnected`

All seeded Auth users use password `Stage15F!Pass123`.

## Student Copier Checks

- Sign in as a student fixture, such as `student_stage15f_binance_sandbox@example.test`.
- Open `http://localhost:3000/app/copier`.
- Confirm the page says paper routing, risk decisions, and simulated paper worker attempts are available.
- Confirm live exchange orders are clearly disabled.
- Confirm sandbox Binance and Bybit metadata is shown without API keys, API secrets, credential refs, signed payloads, or raw exchange responses.
- Confirm recent paper intents, order attempts, risk decisions, and audit events are visible in internally scrollable panels.
- Confirm funded, paused, and unconnected fixtures show locked or blocked reasons rather than executable live state.

## Influencer Workspace Checks

- Sign in as `stage15f.influencer@example.test`.
- Open `http://localhost:3000/workspace`.
- Confirm crypto paper ops shows bounded workspace counts.
- Expected state: verified sandbox connections exist, funded-account and paused students are not paper executable, and blocked risk decisions are visible.
- Confirm invalid buy levels are blocked by `signal_directional_levels`.
- Confirm workspace and platform kill-switch blocked decisions are visible as support-safe risk records.

## Super Admin Checks

- Sign in as `stage15f.admin@example.test`.
- Open `http://localhost:3000/admin`.
- In Crypto paper ops, enter `ws_stage15f_paper_beta`.
- Click `Load workspace preview`.
- Confirm the platform overview copy says it is zero-safe until a workspace is selected.
- Confirm the workspace preview shows support-safe paper intents, paper order attempts, risk decisions, and audit events.
- Click `Run paper worker`.
- Confirm the worker result is bounded and paper-only.
- Refresh the workspace preview and confirm the worker candidate intent is `completed_paper` with a paper attempt.
- Confirm the non-paper `ready_for_paper` fixture is skipped and does not create an order attempt.

## Firestore Rules Checks

Run `npm run firebase:rules:test`.

Expected result:

- Unauthenticated clients cannot read/write broker keys, platform/workspace controls, execution intents, order attempts, risk decisions, audit events, exchange connections, or execution preferences.
- Student clients cannot directly read/write those docs, including their own execution preferences and exchange connections.
- Influencer clients cannot directly read/write protected execution docs.
- Super Admin client SDK access is also denied; Super Admin access must go through Admin SDK API routes.

## Screenshots To Capture

- Student copier readiness and paper execution history.
- Influencer crypto paper ops section with bounded previews.
- Super Admin workspace preview before worker run.
- Super Admin worker result after run.
- Firestore rules test terminal output.
- Stage 15F QA script terminal output.

Final completed manual QA evidence is summarized in `prompt/15F-paper-beta-completion-note.md`.

## Expected Hidden Records

Never visible in UI, screenshots, API responses, or test output:

- Exchange API keys.
- Exchange API secrets.
- `credentialRefPath`.
- `encryptedSecretRef`.
- Raw signed request payloads.
- Raw Binance or Bybit exchange payloads.
- Firebase service-account values.
- Broker key documents.

## Known Limitations

- The seed uses metadata-only fake exchange connection fingerprints.
- The QA script does not require real Binance or Bybit sandbox credentials.
- The QA script validates repository-shaped Firestore records and a deterministic paper-worker simulation; browser checks use the local Auth emulator users seeded by `npm run stage15f:seed-auth`.
- Live trading, live order statuses, forex integrations, and exchange reconciliation remain deferred.
