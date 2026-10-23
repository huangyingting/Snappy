import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { createCustomCollection } from "@/lib/services/corporate-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "CORPORATE" || !session.companyId) {
      return NextResponse.json({ error: "Corporate authorization required." }, { status: 403 });
    }

    const body = await request.json();
    const collection = await createCustomCollection({
      companyId: session.companyId,
      actorUserId: session.userId,
      title: body.title,
      description: body.description,
      occasion: body.occasion || "All Occasions",
      budgetTierCents: Number(body.budgetTierCents),
      productIds: Array.isArray(body.productIds) ? body.productIds : [],
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
