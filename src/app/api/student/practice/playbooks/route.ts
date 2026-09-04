import { apiError, apiJson } from "@/lib/admin/admin-api";
import {
  createStudentPracticePlaybook,
  getStudentPracticeOverview,
  updateStudentPracticePlaybook
} from "@/lib/practice/practice-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await getStudentPracticeOverview(actor));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await createStudentPracticePlaybook(actor, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticePlaybook(actor, payload));
  } catch (error) {
    return apiError(error);
  }
}
