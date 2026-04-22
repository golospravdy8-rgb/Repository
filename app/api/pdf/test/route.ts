import { NextResponse } from "next/server";
// @ts-expect-error pdfkit types
import PDFDocument from "pdfkit";

export const runtime = 'nodejs';

export async function GET() {
  const chunks: Buffer[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument();
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", resolve);
      doc.on("error", reject);
      doc.fontSize(20).text("Test PDF", 100, 100);
      doc.end();
    });
  } catch (err) {
    return NextResponse.json({
      error: "PDF generation failed",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: { "Content-Type": "application/pdf" },
  });
}
