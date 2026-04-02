import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSettings } from "@/lib/site-settings";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (token !== "ldbl_admin_2025") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Validate data is an object with string values
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await setSettings(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[site-settings] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
