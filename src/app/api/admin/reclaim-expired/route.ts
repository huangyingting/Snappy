import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { reclaimExpiredGifts } from "@/lib/services/admin-service";

export async function POST() {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Platform Admin authorization required." }, { status: 403 });
    }

    const result = await reclaimExpiredGifts(session.userId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
