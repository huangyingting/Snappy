import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { redeemGiftByToken } from "@/lib/services/recipient-service";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const session = await getSessionFromCookies();

    const result = await redeemGiftByToken({
      claimToken: token,
      orderType: body.orderType || "PHYSICAL_GIFT",
      productId: body.productId,
      charityId: body.charityId,
      recipientRegion: body.recipientRegion || "NA",
      selectedVariant: body.selectedVariant,
      shippingName: body.shippingName,
      shippingPhone: body.shippingPhone,
      shippingAddressLine1: body.shippingAddressLine1,
      shippingAddressLine2: body.shippingAddressLine2,
      shippingCity: body.shippingCity,
      shippingState: body.shippingState,
      shippingPostalCode: body.shippingPostalCode,
      shippingCountry: body.shippingCountry,
      deliveryInstructions: body.deliveryInstructions,
      saveToAddressBook: session?.role === "RECIPIENT" && Boolean(body.saveToAddressBook),
      viewerUserId: session?.role === "RECIPIENT" ? session.userId : undefined,
      addressLabel: body.addressLabel,
      thankYouNote: body.thankYouNote,
    });

    return NextResponse.json({
      giftSend: { id: result.giftSend.id, status: result.giftSend.status },
      giftOrder: { id: result.giftOrder.id, orderType: result.giftOrder.orderType, fulfillmentStatus: result.giftOrder.fulfillmentStatus },
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
