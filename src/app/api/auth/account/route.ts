import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeAccountToken, requestAccountEmail } from "@/lib/services/auth-service";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const purpose = z.enum(["verify", "reset"]).parse(body.purpose);
    if (body.token) {
      return NextResponse.json(await consumeAccountToken(body.token, purpose, body.password));
    }
    await requestAccountEmail(body.email, purpose);
    return NextResponse.json({ message: "If the account is eligible, an email has been queued. Check your inbox." });
  } catch (error) {
    return errorResponse(error);
  }
}
