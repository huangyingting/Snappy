import { NextResponse } from "next/server";
import { enrollRecipient } from "@/lib/services/auth-service";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await enrollRecipient(await request.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
