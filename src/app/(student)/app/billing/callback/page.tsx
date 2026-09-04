import { BillingCallbackClient } from "@/components/billing/billing-callback-client";
import { buildMetadata } from "@/config/app";

export const metadata = buildMetadata({
  title: "Billing Verification",
  description: "Verify a Paystack checkout reference for TradeHub student access.",
  pathname: "/app/billing/callback"
});

function normalizeReference(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim().length > 0)?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

export default function BillingCallbackPage({
  searchParams
}: {
  searchParams?: { reference?: string | string[]; trxref?: string | string[] };
}) {
  const reference =
    normalizeReference(searchParams?.reference) || normalizeReference(searchParams?.trxref);

  return <BillingCallbackClient reference={reference} />;
}
