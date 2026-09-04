# Stage 15E Paper Execution QA Notes

Stage 15E stays paper-only. Do not use production exchange secrets for these checks, and do not add fake secrets to repository files.

## Seed Scenarios

- Paystack-entitled active student with Auto-Copy access and `personal_account` risk posture.
- Paper opt-in preferences saved with `paperTradingOnly: true`.
- Verified sandbox Binance connection metadata with withdrawals confirmed disabled.
- Verified sandbox Bybit connection metadata with withdrawals confirmed disabled.
- Newer production connection plus older valid sandbox connection while platform or workspace `sandboxOnly` is active.
- Published crypto buy signal with entry, take-profit above entry, and stop-loss below entry.
- Published crypto sell signal with entry, take-profit below entry, and stop-loss above entry.
- Invalid directional levels blocked by `signal_directional_levels`.
- Funded-account student remains Signal Alerts only and receives no paper intent.
- Paused student receives a blocked risk decision and no paper intent.
- Workspace kill switch blocks paper intent creation.
- Platform kill switch blocks paper intent creation.
- Super Admin paper worker creates a paper attempt and marks the intent `completed_paper`.
- Non-paper intent with `ready_for_paper` is skipped, not executed.
- Super Admin worker run requires a workspace ID and shows a bounded result summary.

## Visibility Checks

- Student copier shows readiness, pause state, connections, recent paper intents, attempts, risk decisions, and audit events.
- Influencer workspace shows workspace-scoped paper routing and execution summaries only.
- Super Admin panel shows platform state, manual workspace worker controls, bounded run results, and support-safe execution previews.
- Execution, student, signal, application, audit, payment, settlement, and course list panels remain internally scrollable when more than four rows are visible.
- API responses and UI must not expose API keys, API secrets, credential refs, encrypted blobs, signed payloads, raw exchange payloads, or service-account material.
