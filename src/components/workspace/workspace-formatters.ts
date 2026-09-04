export function formatCurrencyNgn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value?: string) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function maskOpsReference(value?: string, prefix = "ref") {
  if (!value) {
    return `${prefix}_none`;
  }

  const normalized = value.replace(/[^a-zA-Z0-9]/g, "");

  if (normalized.length <= 8) {
    return `${prefix}_${normalized || "none"}`;
  }

  return `${prefix}_${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}
