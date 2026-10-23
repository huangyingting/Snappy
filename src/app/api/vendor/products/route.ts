import { errorResponse } from "@/lib/errors";
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
      categoryId: body.categoryId || null,
      sku: body.sku,
      merchandisingBadge: body.merchandisingBadge,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      variants: Array.isArray(body.variants) ? body.variants : undefined,
      specifications:
        body.specifications && typeof body.specifications === "object"
          ? body.specifications
          : undefined,
      priceCents: Number(body.priceCents),
      wholesaleCostCents: body.wholesaleCostCents ? Number(body.wholesaleCostCents) : undefined,
      imageUrl: body.imageUrl,
      stockQuantity: Number(body.stockQuantity ?? 0),
      supportedRegions: Array.isArray(body.supportedRegions) ? body.supportedRegions : [],
      isFeatured: Boolean(body.isFeatured),
      status: body.status || "ACTIVE",
      collectionIds: Array.isArray(body.collectionIds) ? body.collectionIds : undefined,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
