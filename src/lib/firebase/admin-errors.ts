export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export class AdminConfigurationError extends AdminApiError {
  constructor(message = "Firebase Admin SDK is not configured for this environment.") {
    super(503, "admin_sdk_not_configured", message);
    this.name = "AdminConfigurationError";
  }
}

export function getSafeErrorPayload(error: unknown) {
  if (error instanceof AdminApiError) {
    return {
      status: error.status,
      body: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: "internal_error",
        message: "TradeHub could not complete that request."
      }
    }
  };
}

export function isAdminConfigurationError(error: unknown): error is AdminConfigurationError {
  return error instanceof AdminConfigurationError;
}
