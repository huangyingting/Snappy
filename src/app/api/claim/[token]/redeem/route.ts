import { NextResponse } from "next/server";
import { redeemGiftByToken } from "@/lib/services/recipient-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();

    const result = await redeemGiftByToken({
      claimToken: token,
      orderType: body.orderType || "PHYSICAL_GIFT",
      productId: body.productId,
      charityId: body.charityId,
      recipientRegion: body.recipientRegion || "NA",
      shippingName: body.shippingName,
      shippingAddressLine1: body.shippingAddressLine1,
      shippingCity: body.shippingCity,
      shippingState: body.shippingState,
      shippingPostalCode: body.shippingPostalCode,
      shippingCountry: body.shippingCountry,
      thankYouNote: body.thankYouNote,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to redeem gift." },
      { status: 400 }
    );
  }
}
