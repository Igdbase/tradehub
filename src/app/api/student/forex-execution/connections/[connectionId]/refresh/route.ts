import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { refreshStudentForexConnection } from "@/lib/crypto-execution/forex-connection-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  try {
    const actor = await requireStudent(request);

    await refreshStudentForexConnection(actor, params.connectionId);

    return apiJson(await getStudentCryptoExecutionOverview(actor));
  } catch (error) {
    return apiError(error);
  }
}
