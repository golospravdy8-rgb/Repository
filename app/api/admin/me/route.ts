// Admin me route - checks if user is authenticated
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const adminToken = req.cookies.get("admin_token")?.value;
  const isAdmin = adminToken === "ldbl_admin_2025";
  return NextResponse.json({ isAdmin });
}
