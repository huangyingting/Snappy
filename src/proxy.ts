import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || "")) {
      throw new Error("Production requires PostgreSQL.");
    }
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      throw new Error("AUTH_SECRET must contain at least 32 characters.");
    }
    if (!process.env.NEXTAUTH_URL?.startsWith("https://")) {
      throw new Error("NEXTAUTH_URL must use HTTPS in production.");
    }
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const expectedOrigin = new URL(process.env.NEXTAUTH_URL || request.url).origin;
    if (origin && origin !== expectedOrigin) {
      return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    }
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    }
    if (Number(request.headers.get("content-length") || 0) > 1024 * 1024) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/api/:path*", "/claim/:path*", "/corporate/:path*", "/vendor/:path*", "/admin/:path*", "/recipient/:path*"] };
