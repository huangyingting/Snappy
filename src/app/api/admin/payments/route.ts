import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { recordSettledPayment } from "@/lib/services/corporate-service";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Administrator authorization required." }, { status: 403 });
    }
    const body = await request.json();
    return NextResponse.json(await recordSettledPayment({
      companyId: body.companyId,
      amountCents: body.amountCents,
      settlementReference: body.settlementReference,
      actorUserId: session.userId,
    }), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
