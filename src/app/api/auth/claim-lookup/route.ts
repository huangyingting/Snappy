import { NextResponse } from "next/server";
import { lookupClaimByCode } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { claimCode, email } = body as { claimCode?: string; email?: string };
    if (!claimCode) {
      return NextResponse.json({ error: "Please enter a claim code." }, { status: 400 });
    }
    const result = await lookupClaimByCode(claimCode, email);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Claim lookup failed." },
      { status: 404 }
    );
  }
}
