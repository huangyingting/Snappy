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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save thank-you note." },
      { status: 400 }
    );
  }
}
