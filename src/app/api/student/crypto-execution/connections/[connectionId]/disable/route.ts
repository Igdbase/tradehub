import { apiError, apiJson } from "@/lib/admin/admin-api";
import { disableStudentCryptoExecutionConnection } from "@/lib/crypto-execution/crypto-execution-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  try {
    const actor = await requireStudent(request);
    const response = await disableStudentCryptoExecutionConnection(actor, params.connectionId);

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
