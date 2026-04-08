import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_token")?.value;
    const isAdmin = adminToken === "ldbl_admin_2025";

    console.log("[/api/admin/check] token:", adminToken, "isAdmin:", isAdmin);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("[/api/admin/check]", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
