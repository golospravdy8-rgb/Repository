import { NextResponse } from "next/server";

export async function GET() {
  const results: any = {};

  try {
    const html2canvas = await import("html2canvas");
    results.html2canvas = {
      ok: true,
      hasDefault: !!html2canvas.default,
      keys: Object.keys(html2canvas),
    };
  } catch (e) {
    results.html2canvas = { error: (e as Error).message };
  }

  try {
    const jspdf = await import("jspdf");
    results.jspdf = {
      ok: true,
      hasDefault: !!jspdf.default,
      hasJsPDF: !!jspdf.jsPDF,
      keys: Object.keys(jspdf),
    };
  } catch (e) {
    results.jspdf = { error: (e as Error).message };
  }

  return NextResponse.json(results);
}
