import "server-only";

import { apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function legacyStudentCopierRouteRetired(request: Request) {
  await requireStudent(request);

  return apiJson(
    {
      ok: false,
      code: "legacy_copier_route_retired",
      message: "Use the current Copier setup page to manage this action."
    },
    { status: 410 }
  );
}
