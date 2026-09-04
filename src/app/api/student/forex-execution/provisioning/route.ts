import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { createStudentForexProvisioning } from "@/lib/crypto-execution/forex-provisioning-repository";
import { requireStudent } from "@/lib/firebase/student-auth";

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    await createStudentForexProvisioning(actor, payload);

    return apiJson(await getStudentCryptoExecutionOverview(actor), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
