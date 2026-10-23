import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { upsertGiftCategory } from "@/lib/services/admin-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin authorization required." }, { status: 403 });
    }

    const body = await request.json();
    const headline = body.headline || body.tagline;
    if (!body.name) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 }
      );
    }

    const category = await upsertGiftCategory({
      id: body.id,
      name: body.name,
      slug: body.slug,
      headline,
      description: body.description || headline,
      icon: body.icon,
      accentColor: body.accentColor,
      heroImageUrl: body.heroImageUrl,
      displayOrder:
        body.displayOrder !== undefined
          ? Number(body.displayOrder)
          : body.sortOrder !== undefined
          ? Number(body.sortOrder)
          : undefined,
      isFeatured: body.isFeatured,
      active: body.active,
      actorUserId: session.userId,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
