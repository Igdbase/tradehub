import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  createStudentJournalCryptoConnection,
  getStudentJournalCryptoSyncOverview
} from "@/lib/journal/crypto-journal-sync-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    return apiJson(await getStudentJournalCryptoSyncOverview(actor));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();
    return apiJson(await createStudentJournalCryptoConnection(actor, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
