import { apiError } from "@/lib/admin/admin-api";
import { legacyStudentCopierRouteRetired } from "@/lib/student-copier/legacy-copier-routes";

export async function POST(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  void params;
  try {
    return await legacyStudentCopierRouteRetired(request);
  } catch (error) {
    return apiError(error);
  }
}
