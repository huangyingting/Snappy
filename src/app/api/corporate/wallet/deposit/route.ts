import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { depositCorporateWallet } from "@/lib/services/corporate-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "CORPORATE" || !session.companyId) {
      return NextResponse.json({ error: "Corporate authorization required." }, { status: 403 });
    }

    const body = await request.json();
    const result = await depositCorporateWallet({
      companyId: session.companyId,
      amountCents: Number(body.amountCents),
      note: body.note,
      actorUserId: session.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet deposit failed." },
      { status: 400 }
    );
  }
}
