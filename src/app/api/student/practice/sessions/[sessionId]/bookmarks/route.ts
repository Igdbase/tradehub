import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  createStudentPracticeBookmark,
  getStudentPracticeSessionDetail
} from "@/lib/practice/practice-repository";

type StudentPracticeBookmarksRouteContext = {
  params: {
    sessionId: string;
  };
};

export async function GET(request: Request, context: StudentPracticeBookmarksRouteContext) {
  try {
    const actor = await requireStudent(request);
    const detail = await getStudentPracticeSessionDetail(actor, context.params.sessionId);

    return apiJson({
      ...detail,
      bookmarks: detail.bookmarks
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: StudentPracticeBookmarksRouteContext) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await createStudentPracticeBookmark(actor, context.params.sessionId, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
