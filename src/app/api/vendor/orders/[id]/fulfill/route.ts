import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { fulfillVendorOrder } from "@/lib/services/vendor-service";

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
    const order = await fulfillVendorOrder({
      vendorId: session.vendorId,
      orderId: id,
      fulfillmentStatus: body.fulfillmentStatus,
      trackingCarrier: body.trackingCarrier,
      trackingNumber: body.trackingNumber,
      actorUserId: session.userId,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order fulfillment update failed." },
      { status: 400 }
    );
  }
}
