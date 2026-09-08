import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { disableStudentForexProvisioning } from "@/lib/crypto-execution/forex-provisioning-repository";
import { requireStudent } from "@/lib/firebase/student-auth";
import { mapStudentCopierOverview } from "@/lib/student-copier/student-copier-dto";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);

    await disableStudentForexProvisioning(actor);

    return apiJson(mapStudentCopierOverview(actor, await getStudentCryptoExecutionOverview(actor)));
  } catch (error) {
    return apiError(error);
  }
}
