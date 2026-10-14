import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/services/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import type { RoleCode } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, expectedRole } = body as {
      email?: string;
      password?: string;
      expectedRole?: RoleCode;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const result = await authenticateUser(email, password, expectedRole);
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
      { error: error instanceof Error ? error.message : "Authentication failed." },
      { status: 401 }
    );
  }
}
