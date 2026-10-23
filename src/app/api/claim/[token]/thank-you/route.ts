import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { saveRecipientThankYouNote } from "@/lib/services/recipient-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const updated = await saveRecipientThankYouNote(token, body.thankYouNote || "");
    return NextResponse.json({ giftSend: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
