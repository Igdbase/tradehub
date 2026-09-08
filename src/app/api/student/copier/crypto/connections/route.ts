import { apiError, apiJson } from "@/lib/admin/admin-api";
import { createStudentCryptoExecutionConnection } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireStudent } from "@/lib/firebase/student-auth";
import { mapStudentCopierOverview } from "@/lib/student-copier/student-copier-dto";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    const overview = await createStudentCryptoExecutionConnection(actor, payload);

    return apiJson(mapStudentCopierOverview(actor, overview), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
