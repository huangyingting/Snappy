import { errorResponse } from "@/lib/errors";
import { NextResponse } from "next/server";
import { getClaimExperienceByToken } from "@/lib/services/recipient-service";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || undefined;

    const session = await getSessionFromCookies();
    const data = await getClaimExperienceByToken(token, region, session?.role === "RECIPIENT" ? session.userId : undefined);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
