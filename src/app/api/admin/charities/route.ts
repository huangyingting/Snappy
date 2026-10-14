import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { createCharityPartner } from "@/lib/services/admin-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Platform Admin authorization required." }, { status: 403 });
    }

    const body = await request.json();
    const charity = await createCharityPartner({
      name: body.name,
      category: body.category || "Global Impact",
      description: body.description,
      actorUserId: session.userId,
    });

    return NextResponse.json({ charity }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create charity partner." },
      { status: 400 }
    );
  }
}
