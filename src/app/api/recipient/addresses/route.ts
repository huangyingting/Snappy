import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  deleteRecipientAddress,
  saveRecipientAddress,
} from "@/lib/services/recipient-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "RECIPIENT") {
      return NextResponse.json({ error: "Recipient authorization required." }, { status: 403 });
    }

    const body = await request.json();
    if (!body.addressLine1 || !body.city || !body.postalCode || !body.country) {
      return NextResponse.json(
        { error: "Street address, city, postal code, and country are required." },
        { status: 400 }
      );
    }

    const address = await saveRecipientAddress({
      userId: session.userId,
      addressId: body.addressId,
      label: body.label || "Saved Address",
      recipientName: body.recipientName || session.name,
      phone: body.phone,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
      region: body.region || "NA",
      deliveryInstructions: body.deliveryInstructions,
      isDefault: Boolean(body.isDefault),
    });

    return NextResponse.json({ address: { ...address, recipientPhone: address.phone } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "RECIPIENT") {
      return NextResponse.json({ error: "Recipient authorization required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get("id");
    if (!addressId) {
      return NextResponse.json({ error: "Address ID is required." }, { status: 400 });
    }

    const result = await deleteRecipientAddress(session.userId, addressId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
