import { apiError, apiJson } from "@/lib/admin/admin-api";
import {
  assertTelegramWebhookRequestBoundary,
  receiveTelegramSignalWebhookUpdate,
  telegramSignalWebhookLimits
} from "@/lib/signals/telegram-signal-ingestion";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTelegramWebhookRequestBoundary(request);
    const body = await request.text();

    if (Buffer.byteLength(body, "utf8") > telegramSignalWebhookLimits.maxWebhookBytes) {
      return apiJson({ ok: false, code: "telegram_webhook_body_too_large" }, { status: 413 });
    }

    let update: unknown;

    try {
      update = JSON.parse(body);
    } catch {
      return apiJson({ ok: false, code: "telegram_webhook_malformed_json" }, { status: 400 });
    }

    const response = await receiveTelegramSignalWebhookUpdate(update);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  return apiJson({ ok: false, code: "method_not_allowed" }, { status: 405 });
}
