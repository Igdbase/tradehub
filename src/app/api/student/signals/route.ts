import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { listStudentSignalFeed } from "@/lib/student-app/student-signals-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const response = await listStudentSignalFeed(actor, request);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
