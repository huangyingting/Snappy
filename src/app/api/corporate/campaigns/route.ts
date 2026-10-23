import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { createCampaignAndOptionallySend } from "@/lib/services/corporate-service";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "CORPORATE" || !session.companyId) {
      return NextResponse.json({ error: "Corporate authorization required." }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title || !body.messageTemplate || !body.budgetCents) {
      return NextResponse.json(
        { error: "Campaign title, message template, and budget tier are required." },
        { status: 400 }
      );
    }

    const result = await createCampaignAndOptionallySend({
      companyId: session.companyId,
      requestKey: z.string().uuid().parse(body.requestKey),
      actorUserId: session.userId,
      title: body.title,
      occasion: body.occasion || "Spot Recognition",
      messageTemplate: body.messageTemplate,
      budgetCents: Number(body.budgetCents),
      collectionId: body.collectionId || null,
      triggerType: body.triggerType || "MANUAL",
      allowCharity: body.allowCharity ?? true,
      expiresInDays: Number(body.expiresInDays || 30),
      recipients: Array.isArray(body.recipients) ? body.recipients : [],
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
