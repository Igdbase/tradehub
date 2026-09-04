import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  getStudentPracticeNotifications,
  updateStudentPracticeNotificationState
} from "@/lib/practice/practice-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await getStudentPracticeNotifications(actor));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeNotificationState(actor, payload));
  } catch (error) {
    return apiError(error);
  }
}
