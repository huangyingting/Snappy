import { NextResponse } from "next/server";
import { getClaimExperienceByToken } from "@/lib/services/recipient-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    const data = await getClaimExperienceByToken(token, region);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gift invitation not found." },
      { status: 404 }
    );
  }
}
