import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  getStudentMessagingPreferences,
  updateStudentMessagingPreferences
} from "@/lib/messaging/message-intent-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await getStudentMessagingPreferences(actor));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentMessagingPreferences(actor, payload));
  } catch (error) {
    return apiError(error);
  }
}
