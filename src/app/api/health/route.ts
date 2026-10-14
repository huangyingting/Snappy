import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [usersCount, productsCount, vendorsCount] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.vendor.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      service: "snappy-gifting-platform",
      database: process.env.DATABASE_URL?.startsWith("postgres") ? "postgresql" : "sqlite",
      counts: {
        users: usersCount,
        products: productsCount,
        vendors: vendorsCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Database check failed",
      },
      { status: 500 }
    );
  }
}
