import { apiError, apiJson } from "@/lib/admin/admin-api";
import { processPaystackWebhook } from "@/lib/billing/billing-repository";
import { parsePaystackWebhook, verifyPaystackSignature } from "@/lib/paystack/paystack-webhook";
import { processTradeCopierPaystackWebhook } from "@/lib/student-copier/student-copier-billing";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"));
    const payload = parsePaystackWebhook(rawBody);
    const tradeCopierReceipt = await processTradeCopierPaystackWebhook(payload);

    if (tradeCopierReceipt.handled) {
      return apiJson({ ok: true, receipt: tradeCopierReceipt });
    }

    const receipt = await processPaystackWebhook(payload);

    return apiJson({ ok: true, receipt });
  } catch (error) {
    return apiError(error);
  }
}
