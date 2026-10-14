import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getVendorDashboard } from "@/lib/services/vendor-service";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "VENDOR" || !session.vendorId) {
      return NextResponse.json({ error: "Vendor authorization required." }, { status: 403 });
    }

    const data = await getVendorDashboard(session.vendorId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load vendor dashboard." },
      { status: 400 }
    );
  }
}
