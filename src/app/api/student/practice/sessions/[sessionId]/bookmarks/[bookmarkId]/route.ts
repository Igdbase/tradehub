import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  deleteStudentPracticeBookmark,
  updateStudentPracticeBookmark
} from "@/lib/practice/practice-repository";

type StudentPracticeBookmarkRouteContext = {
  params: {
    sessionId: string;
    bookmarkId: string;
  };
};

export async function PATCH(request: Request, context: StudentPracticeBookmarkRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await updateStudentPracticeBookmark(
      actor,
      context.params.sessionId,
      context.params.bookmarkId,
      payload
    ));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: StudentPracticeBookmarkRouteContext) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await deleteStudentPracticeBookmark(
      actor,
      context.params.sessionId,
      context.params.bookmarkId
    ));
  } catch (error) {
    return apiError(error);
  }
}
