import { NextResponse } from "next/server";
import { getSetting } from "@/lib/site-settings";

export async function GET() {
  try {
    const heroBg = await getSetting('images.heroBg', '');
    return NextResponse.json({
      found: !!heroBg,
      length: heroBg.length,
      starts: heroBg.substring(0, 50),
      isDataUrl: heroBg.startsWith('data:'),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
