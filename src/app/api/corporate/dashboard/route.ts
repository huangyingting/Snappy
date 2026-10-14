import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getCorporateDashboard } from "@/lib/services/corporate-service";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "CORPORATE" || !session.companyId) {
      return NextResponse.json({ error: "Corporate authorization required." }, { status: 403 });
    }

    const data = await getCorporateDashboard(session.companyId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load corporate dashboard." },
      { status: 400 }
    );
  }
}
