import { apiError, apiJson } from "@/lib/admin/admin-api";
import { reconcilePaystackPaymentIntent } from "@/lib/billing/billing-repository";
import { parsePaymentIntentIdParam } from "@/lib/billing/billing-validation";
import { requireSuperAdmin } from "@/lib/firebase/admin-auth";

type PaystackReconcileRouteContext = {
  params: {
    paymentIntentId: string;
  };
};

export async function POST(request: Request, context: PaystackReconcileRouteContext) {
  try {
    const actor = await requireSuperAdmin(request);
    const safePaymentIntentId = parsePaymentIntentIdParam(context.params.paymentIntentId);
    const response = await reconcilePaystackPaymentIntent(actor, safePaymentIntentId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
