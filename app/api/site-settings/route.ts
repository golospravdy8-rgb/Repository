import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/site-settings";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keysParam = searchParams.get('keys');

    if (!keysParam) {
      return NextResponse.json({ error: "Missing keys parameter" }, { status: 400 });
    }

    const keys = keysParam.split(',').map(k => k.trim());
    const settings = await getSettings(keys);
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
