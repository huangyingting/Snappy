import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { settleCharityDonation } from "@/lib/services/admin-service";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookies();
    if (session?.role !== "ADMIN") return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json();
    return NextResponse.json(await settleCharityDonation({ orderId: id, settlementReference: body.settlementReference, actorUserId: session.userId }));
  } catch (error) {
    return errorResponse(error);
  }
}
