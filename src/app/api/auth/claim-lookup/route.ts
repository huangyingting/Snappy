import { NextResponse } from "next/server";
import { lookupClaimByCode } from "@/lib/services/auth-service";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await lookupClaimByCode(body.claimCode, body.email));
  } catch (error) {
    return errorResponse(error);
  }
}
