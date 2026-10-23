import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { updateCorporateSettings } from "@/lib/services/corporate-service";

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "CORPORATE" || !session.companyId) {
      return NextResponse.json({ error: "Corporate authorization required." }, { status: 403 });
    }

    const body = await request.json();
    const company = await updateCorporateSettings(session.companyId, body);
    return NextResponse.json({ company });
  } catch (error) {
    return errorResponse(error);
  }
}
