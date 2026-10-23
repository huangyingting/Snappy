import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/services/admin-service";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Platform Admin authorization required." }, { status: 403 });
    }

    const data = await getAdminDashboard();
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
