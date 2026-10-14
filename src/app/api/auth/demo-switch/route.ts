import { NextResponse } from "next/server";
import { switchDemoPersona } from "@/lib/services/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };
    if (!email) {
      return NextResponse.json({ error: "Demo persona email is required." }, { status: 400 });
    }

    const result = await switchDemoPersona(email);
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        company: result.user.company,
        vendor: result.user.vendor,
      },
      redirectTo: result.redirectTo,
    });

    response.cookies.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to switch persona." },
      { status: 400 }
    );
  }
}
