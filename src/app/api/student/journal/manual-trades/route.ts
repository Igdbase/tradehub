import { apiError, apiJson } from "@/lib/admin/admin-api";
import { requireStudent } from "@/lib/firebase/student-auth";
import {
  createStudentManualTrade,
  listStudentManualTrades,
  parseManualTradeFilters
} from "@/lib/journal/manual-trades-repository";

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);

    return apiJson(await listStudentManualTrades(actor, parseManualTradeFilters(request)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireStudent(request);
    const payload = await request.json();

    return apiJson(await createStudentManualTrade(actor, payload), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
