import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { startStudentPracticeAssignment } from "@/lib/practice/practice-repository";

type StudentPracticeAssignmentStartRouteContext = {
  params: {
    assignmentId: string;
  };
};

export async function POST(request: Request, context: StudentPracticeAssignmentStartRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await startStudentPracticeAssignment(actor, context.params.assignmentId), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
