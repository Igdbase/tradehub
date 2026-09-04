const DANGEROUS_CSV_PREFIX = /^[\t\r ]*[=+\-@]/;

function stringifyCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

export function sanitizeCsvCell(value: unknown): string {
  const raw = stringifyCsvValue(value);
  return DANGEROUS_CSV_PREFIX.test(raw) ? `'${raw}` : raw;
}

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCsvDocument(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.map((header) => escapeCsvField(header)).join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvField(sanitizeCsvCell(row[header]))).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}
