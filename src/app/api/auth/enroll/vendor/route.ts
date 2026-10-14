import { NextResponse } from "next/server";
import { enrollVendor } from "@/lib/services/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (
      !body.name ||
      !body.email ||
      !body.password ||
      !body.businessName ||
      !body.taxId ||
      !Array.isArray(body.supportedRegions) ||
      body.supportedRegions.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Contact name, email, password, business name, tax ID, and at least one fulfillment region are required.",
        },
        { status: 400 }
      );
    }

    const result = await enrollVendor(body);
    const response = NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          vendor: result.vendor,
        },
        redirectTo: result.redirectTo,
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vendor enrollment failed." },
      { status: 400 }
    );
  }
}
