import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getRecipientPortalData } from "@/lib/services/recipient-service";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "RECIPIENT") {
      return NextResponse.json({ error: "Recipient authorization required." }, { status: 403 });
    }

    const data = await getRecipientPortalData(session.userId);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
