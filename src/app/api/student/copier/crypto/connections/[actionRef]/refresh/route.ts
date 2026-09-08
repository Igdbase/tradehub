import { apiError, apiJson } from "@/lib/admin/admin-api";
import {
  getStudentCryptoExecutionOverview,
  refreshStudentCryptoExecutionConnection
} from "@/lib/crypto-execution/crypto-execution-repository";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  mapStudentCopierOverview,
  resolveStudentCopierConnectionActionRef
} from "@/lib/student-copier/student-copier-dto";

export async function POST(
  request: Request,
  { params }: { params: { actionRef: string } }
) {
  try {
    const actor = await requireStudent(request);
    const current = await getStudentCryptoExecutionOverview(actor);
    const connectionId = resolveStudentCopierConnectionActionRef(actor, current, params.actionRef);
    const overview = await refreshStudentCryptoExecutionConnection(actor, connectionId);

    return apiJson(mapStudentCopierOverview(actor, overview));
  } catch (error) {
    return apiError(error);
  }
}
