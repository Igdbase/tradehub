const FIXTURE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Stage 15H fixture order/gi, "Testnet order"],
  [/Stage 15F bounded routing fixture/gi, "Bounded routing check"],
  [/Stage 15F paper beta audit event/gi, "Paper Auto-Copy audit event"],
  [/Stage 15F fixture metadata only; no API secrets are stored\./gi, "Connection metadata only; no API secrets are shown."],
  [/Default Stage 15F fixture rail\./gi, "Default Paystack rail."],
  [/\b(Binance|Bybit) Stage 15F sandbox\b/gi, "$1 sandbox/testnet connection"],
  [/\b(Binance|Bybit) Stage 15F production\b/gi, "$1 production connection"],
  [/Stage 15F Paper Beta/gi, "Crypto Auto-Copy Beta"],
  [/Stage 15F Influencer/gi, "Workspace owner"],
  [/Stage 15F Super Admin/gi, "Super Admin"],
  [/Stage 15F/gi, ""],
  [/Stage 15H/gi, ""],
  [/\bfixture\b/gi, "QA"],
  [/\s+([.,;:])/g, "$1"],
  [/\s{2,}/g, " "]
];

export function productSafeText(value?: string) {
  if (!value) {
    return "";
  }

  return FIXTURE_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value
  ).trim();
}

export function productionBetaStatusLabel(status: string, productionEnabled: boolean) {
  if (productionEnabled) {
    return status.replace(/_/g, " ");
  }

  switch (status) {
    case "dry_run_live":
      return "production dry-run";
    case "ready_for_live":
    case "queued_live":
    case "submitting_live":
    case "submitted_live":
    case "partially_filled_live":
    case "filled_live":
      return "gated preview";
    case "blocked_live":
      return "gated";
    case "failed_live":
    case "rejected_live":
      return "recorded beta check";
    case "cancelled_live":
    case "expired_live":
      return "closed beta check";
    case "reconcile_required":
      return "review needed";
    default:
      return status.replace(/_/g, " ");
  }
}
