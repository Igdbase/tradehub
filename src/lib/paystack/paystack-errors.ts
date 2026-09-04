import { AdminApiError } from "@/lib/firebase/admin-errors";

export class PaystackConfigurationError extends AdminApiError {
  constructor(message = "Paystack test mode is not configured yet.") {
    super(503, "paystack_not_configured", message);
    this.name = "PaystackConfigurationError";
  }
}

export class PaystackApiError extends AdminApiError {
  constructor(message = "Paystack could not complete that request.") {
    super(502, "paystack_api_error", message);
    this.name = "PaystackApiError";
  }
}
