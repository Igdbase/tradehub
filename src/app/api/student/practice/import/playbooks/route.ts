import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { importStudentPracticePlaybooks } from "@/lib/practice/practice-repository";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await importStudentPracticePlaybooks(actor, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
