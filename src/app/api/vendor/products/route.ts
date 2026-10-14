import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { createVendorProduct } from "@/lib/services/vendor-service";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "VENDOR" || !session.vendorId) {
      return NextResponse.json({ error: "Vendor authorization required." }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title || !body.description || !body.priceCents) {
      return NextResponse.json(
        { error: "Product title, description, and price are required." },
        { status: 400 }
      );
    }

    const product = await createVendorProduct({
      vendorId: session.vendorId,
      actorUserId: session.userId,
      title: body.title,
      description: body.description,
      category: body.category || "Tech",
      priceCents: Number(body.priceCents),
      wholesaleCostCents: body.wholesaleCostCents ? Number(body.wholesaleCostCents) : undefined,
      imageUrl: body.imageUrl,
      stockQuantity: Number(body.stockQuantity ?? 25),
      supportedRegions: Array.isArray(body.supportedRegions) ? body.supportedRegions : [],
      collectionIds: Array.isArray(body.collectionIds) ? body.collectionIds : undefined,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product." },
      { status: 400 }
    );
  }
}
