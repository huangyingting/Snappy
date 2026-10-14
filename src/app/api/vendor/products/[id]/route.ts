import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  archiveOrDeleteVendorProduct,
  cloneVendorProduct,
  updateVendorProduct,
} from "@/lib/services/vendor-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "VENDOR" || !session.vendorId) {
      return NextResponse.json({ error: "Vendor authorization required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const product = await updateVendorProduct(session.vendorId, id, body);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update product." },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "VENDOR" || !session.vendorId) {
      return NextResponse.json({ error: "Vendor authorization required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (body.action === "clone" || !body.action) {
      const product = await cloneVendorProduct(session.vendorId, id, session.userId);
      return NextResponse.json({ product }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported product action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clone product." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "VENDOR" || !session.vendorId) {
      return NextResponse.json({ error: "Vendor authorization required." }, { status: 403 });
    }

    const { id } = await context.params;
    const result = await archiveOrDeleteVendorProduct(session.vendorId, id, session.userId);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to archive/delete product." },
      { status: 400 }
    );
  }
}
