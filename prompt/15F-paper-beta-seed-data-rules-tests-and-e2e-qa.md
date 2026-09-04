# Prompt 15F - Paper Beta Seed Data, Rules Tests, And End-To-End QA

Stage 15F is implemented as the paper-beta proof stage for TradeHub crypto Auto-Copy.

Implemented artifacts:

- `scripts/seed-stage15f-paper-beta.mjs`
- `scripts/stage15f-paper-beta-fixtures.mjs`
- `scripts/qa-stage15f-paper-beta.mjs`
- `scripts/firestore-rules-stage15f.test.mjs`
- `prompt/15F-paper-beta-qa-checklist.md`

Package scripts:

- `npm run stage15f:seed`
- `npm run stage15f:qa`
- `npm run firebase:rules:test`

Fixture workspace:

- `ws_stage15f_paper_beta`

Fixture students:

- `student_stage15f_paystack_active`
- `student_stage15f_binance_sandbox`
- `student_stage15f_bybit_sandbox`
- `student_stage15f_sandbox_preferred`
- `student_stage15f_funded_blocked`
- `student_stage15f_paused`
- `student_stage15f_unconnected`

Safety posture:

- Stage 15F seeds emulator-safe metadata only.
- No real exchange keys, API secrets, encrypted blobs, broker credential refs, or service-account material are seeded.
- Firestore client access to protected crypto execution paths remains denied.
- Stage 15 remains paper-only.
