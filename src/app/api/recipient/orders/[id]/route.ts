import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  swapRecipientOrderGift,
  updateRecipientOrderDelivery,
} from "@/lib/services/recipient-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const session = await getSessionFromCookies();

    const claimToken = typeof body.claimToken === "string" ? body.claimToken.trim() : undefined;
    const userId = session?.role === "RECIPIENT" ? session.userId : undefined;

    if (!claimToken && !userId) {
      return NextResponse.json(
        { error: "Recipient session or claim token is required." },
        { status: 403 }
      );
    }

    if (body.action === "swap_gift") {
      if (!body.newProductId) {
        return NextResponse.json(
          { error: "Replacement product ID is required." },
          { status: 400 }
        );
      }

      const order = await swapRecipientOrderGift({
        orderId: id,
        newProductId: body.newProductId,
        selectedVariant: body.selectedVariant,
        claimToken,
        userId,
      });

      return NextResponse.json({ order });
    }

    const order = await updateRecipientOrderDelivery({
      orderId: id,
      claimToken,
      userId,
      shippingName: body.shippingName,
      shippingPhone: body.shippingPhone,
      shippingAddressLine1: body.shippingAddressLine1,
      shippingAddressLine2: body.shippingAddressLine2,
      shippingCity: body.shippingCity,
      shippingState: body.shippingState,
      shippingPostalCode: body.shippingPostalCode,
      shippingCountry: body.shippingCountry,
      deliveryInstructions: body.deliveryInstructions,
      selectedVariant: body.selectedVariant,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
