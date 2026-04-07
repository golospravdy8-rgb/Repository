import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

interface Sponsor {
  id: string;
  name: string;
  logo?: string;
  slogan?: string;
  url: string;
  active: boolean;
  positions: string[];
  pages: string[];
}

export async function GET(req: NextRequest) {
  try {
    const position = req.nextUrl.searchParams.get("position") || "hero";
    const pageType = req.nextUrl.searchParams.get("pageType") || "main";

    // Load sponsors from JSON file
    const sponsorPath = path.join(process.cwd(), "lib", "sponsors.data.json");

    if (!fs.existsSync(sponsorPath)) {
      // If file doesn't exist, return empty list with 200 OK
      return NextResponse.json({ sponsors: [] });
    }

    const sponsorsData = JSON.parse(fs.readFileSync(sponsorPath, "utf-8"));

    // Filter sponsors based on position and page type
    const filtered = (sponsorsData.sponsors || []).filter((s: Sponsor) =>
      s.active &&
      s.positions.includes(position) &&
      (s.pages.includes("all") || s.pages.includes(pageType))
    );

    return NextResponse.json({ sponsors: filtered });
  } catch (error) {
    console.error("GET /api/sponsors error:", error);
    // Return empty list instead of error (graceful degradation)
    return NextResponse.json({ sponsors: [] });
  }
}
