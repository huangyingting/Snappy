import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { updateVendorProfile } from "@/lib/services/vendor-service";

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "VENDOR" || !session.vendorId) {
      return NextResponse.json({ error: "Vendor authorization required." }, { status: 403 });
    }

    const body = await request.json();
    const vendor = await updateVendorProfile(session.vendorId, body);
    return NextResponse.json({ vendor });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update vendor profile." },
      { status: 400 }
    );
  }
}
