import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { createGlobalCollection } from "@/lib/services/admin-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Platform Admin authorization required." }, { status: 403 });
    }

    const body = await request.json();
    const collection = await createGlobalCollection({
      title: body.title,
      description: body.description,
      occasion: body.occasion || "All Occasions",
      budgetTierCents: Number(body.budgetTierCents),
      productIds: Array.isArray(body.productIds) ? body.productIds : [],
      actorUserId: session.userId,
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create global collection." },
      { status: 400 }
    );
  }
}
