import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { dispatchGiftsToCampaign } from "@/lib/services/corporate-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "CORPORATE" || !session.companyId) {
      return NextResponse.json({ error: "Corporate authorization required." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const result = await dispatchGiftsToCampaign({
      companyId: session.companyId,
      campaignId: id,
      recipients: Array.isArray(body.recipients) ? body.recipients : [],
      actorUserId: session.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send gifts." },
      { status: 400 }
    );
  }
}
