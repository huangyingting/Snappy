import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { updateVendorProduct } from "@/lib/services/vendor-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "VENDOR" || !session.vendorId) {
      return NextResponse.json({ error: "Vendor authorization required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const product = await updateVendorProduct(session.vendorId, id, body);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update product." },
      { status: 400 }
    );
  }
}
