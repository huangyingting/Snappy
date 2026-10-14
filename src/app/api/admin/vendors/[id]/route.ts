import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { updateVendorGovernance } from "@/lib/services/admin-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Platform Admin authorization required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const vendor = await updateVendorGovernance({
      vendorId: id,
      status: body.status,
      commissionRateBps:
        body.commissionRateBps !== undefined ? Number(body.commissionRateBps) : undefined,
      actorUserId: session.userId,
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update vendor governance." },
      { status: 400 }
    );
  }
}
