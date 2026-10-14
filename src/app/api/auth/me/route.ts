import { NextResponse } from "next/server";
import { getCurrentUserWithContext } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUserWithContext();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      jobTitle: user.jobTitle,
      preferredRegion: user.preferredRegion,
      companyId: user.companyId,
      vendorId: user.vendorId,
      company: user.company,
      vendor: user.vendor,
    },
  });
}
