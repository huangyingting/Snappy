import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  appendOrderShipmentCheckpoint,
  fulfillVendorOrder,
} from "@/lib/services/vendor-service";

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
      trackingUrl: body.trackingUrl,
      serviceLevel: body.serviceLevel,
      fulfillmentWarehouse: body.fulfillmentWarehouse,
      packageWeightGrams: body.packageWeightGrams ? Number(body.packageWeightGrams) : undefined,
      estimatedDeliveryAt: body.estimatedDeliveryAt,
      exceptionNote: body.exceptionNote,
      checkpointTitle: body.checkpointTitle,
      checkpointDescription: body.checkpointDescription,
      checkpointLocation: body.checkpointLocation,
      actorUserId: session.userId,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
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
    if (!body.title) {
      return NextResponse.json(
        { error: "Checkpoint title is required." },
        { status: 400 }
      );
    }

    const event = await appendOrderShipmentCheckpoint({
      vendorId: session.vendorId,
      orderId: id,
      stage: body.stage || "IN_TRANSIT_HUB",
      title: body.title,
      description: body.description,
      location: body.location,
      actorUserId: session.userId,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
