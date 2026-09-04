import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import { disconnectStudentJournalCryptoConnection } from "@/lib/journal/crypto-journal-sync-repository";

export async function POST(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  try {
    const actor = await requireStudent(request);
    return apiJson(await disconnectStudentJournalCryptoConnection(actor, params.connectionId));
  } catch (error) {
    return apiError(error);
  }
}
