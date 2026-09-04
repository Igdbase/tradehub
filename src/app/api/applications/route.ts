import { apiError, apiJson, getDevelopmentPublicFallbackMessage, getPublicWriteRepository, publicAdminConfigurationError } from "@/lib/admin/admin-api";
import { toPublicApplicationReceipt } from "@/lib/admin/admin-mappers";
import { validatePublicApplicationPayload } from "@/lib/admin/admin-validation";
import { AdminApiError } from "@/lib/firebase/admin-errors";

async function readJsonPayload(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AdminApiError(400, "invalid_payload", "Send a valid application payload.");
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonPayload(request);
    const application = validatePublicApplicationPayload(payload);
    const repository = getPublicWriteRepository();

    if (!repository) {
      if (process.env.NODE_ENV === "production") {
        throw publicAdminConfigurationError();
      }

      return apiJson(
        {
          ok: true,
          source: "mock_fallback",
          persisted: false,
          message: getDevelopmentPublicFallbackMessage(),
          application: toPublicApplicationReceipt(application, false)
        },
        { status: 202 }
      );
    }

    const created = await repository.createApplication(application);

    return apiJson(
      {
        ok: true,
        source: "firestore",
        persisted: true,
        message: "Application submitted to the Super Admin onboarding queue.",
        application: toPublicApplicationReceipt(created, true)
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
