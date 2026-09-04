# Prompt 15I Production Live Beta QA Notes

Stage 15I implements a fail-closed production live beta gate. Automated QA must not submit real production exchange orders.

## Commands

```bash
npm run stage15i:seed
npm run stage15i:qa
npm run firebase:rules:test
npm run typecheck
npm run lint
npm run build
```

Run Stage 15F and 15H checks too before real sandbox/testnet or production credential QA:

```bash
npm run stage15f:qa
npm run stage15h:qa
```

## Fixture IDs

- Workspace: `ws_stage15f_paper_beta`
- Production dry-run intent: `live_prod_stage15i_dry_run_ready`
- Unsettled production attempt: `live_prod_attempt_live_prod_stage15i_submitted_unsettled_1`
- Production connection metadata: `conn_stage15i_binance_production`
- Withdrawal-enabled negative fixture: `conn_stage15i_withdrawal_enabled`
- Stale-permission negative fixture: `conn_stage15i_stale_permission`

## What Is Proven

- Default production order controls are disabled.
- Production dry-run is active in fixtures.
- Production consent is separate from paper/testnet consent.
- Funded-account students are not production allowlisted.
- Sandbox/testnet records are not production worker-consumable.
- Full exchange order IDs are not present in safe production fixture attempts.
- Missing production vault, withdrawal-enabled keys, and stale permission checks are blocked with support-safe live gate decisions.
- Production reconciliation candidates are bounded to unsettled production attempts; filled terminal attempts are excluded.

## Hidden Records

Student and influencer surfaces must not show:

- API key
- API secret
- credential ref
- encrypted secret blob
- raw balance
- raw exchange payload
- signature or signed payload
- full exchange order ID

## Production Vault Status

The local repo does not implement a real KMS/cloud-secret production credential vault adapter. `local_encrypted` remains development-only and is rejected in `NODE_ENV=production`. Production order submission is therefore fail-closed until a real vault adapter is added and explicitly configured.

## Real Production Beta

Do not run a real production beta from automated QA. A human must separately approve one tiny run with dedicated accounts, withdrawal-disabled keys, a 10 to 25 USDT cap, dry-run evidence, active kill switches, immediate reconciliation, and post-run shutdown evidence.

## Stage 15J Follow-Up

Stage 15J adds student-visible production consent, pause, resume, and revoke controls plus market-aware crypto symbol validation. Consent acceptance still does not enable production order calls while Stage 15I dry-run, vault, order-env, allowlist, cap, and Super Admin gates remain blocked.
