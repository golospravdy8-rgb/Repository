import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// @ts-expect-error pdfkit types
import PDFDocument from "pdfkit";

export async function GET(_req: NextRequest, { params }: { params: { gameId: string } }) {
  const gameId = parseInt(params.gameId);
  if (isNaN(gameId)) return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: true,
      awayTeam: true,
      boxScores: {
        include: { player: true, team: true },
        orderBy: [{ teamId: "asc" }, { points: "desc" }],
      },
    },
  });

  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  // Generate PDF
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", resolve);
    doc.on("error", reject);

    const orange = "#f46f10";
    const navy = "#1e2a4a";
    const W = 515;

    // Header
    doc.rect(0, 0, 595, 80).fill(navy);
    doc.fillColor("white").fontSize(20).font("Helvetica-Bold").text("ЛДБЛ", 40, 20);
    doc.fontSize(10).font("Helvetica").text("Львівська Дитяча Баскетбольна Ліга", 40, 46);
    doc.fontSize(14).font("Helvetica-Bold").text("ПРОТОКОЛ МАТЧУ", 200, 30, { align: "center", width: 200 });
    doc.fontSize(9).font("Helvetica").text("Сезон 2025-2026", 200, 50, { align: "center", width: 200 });

    // Game title
    doc.fillColor(navy).fontSize(18).font("Helvetica-Bold")
      .text(`${game.homeTeam.name}  ${game.homeScore} : ${game.awayScore}  ${game.awayTeam.name}`, 40, 100, { align: "center", width: W });

    const dateStr = new Date(game.scheduledAt).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
    doc.fillColor("#6b7280").fontSize(10).font("Helvetica").text(dateStr, 40, 126, { align: "center", width: W });

    doc.moveTo(40, 145).lineTo(555, 145).strokeColor(orange).lineWidth(2).stroke();

    let y = 160;

    // Box scores by team
    const teams = [
      { team: game.homeTeam, scores: game.boxScores.filter((bs) => bs.teamId === game.homeTeamId) },
      { team: game.awayTeam, scores: game.boxScores.filter((bs) => bs.teamId === game.awayTeamId) },
    ];

    for (const { team, scores } of teams) {
      if (y > 680) { doc.addPage(); y = 40; }

      // Team header
      doc.rect(40, y, W, 24).fill(navy);
      doc.fillColor("white").fontSize(11).font("Helvetica-Bold").text(team.name.toUpperCase(), 48, y + 7);
      y += 30;

      // Table header
      const cols = [["#", 20], ["Гравець", 160], ["Оч", 40], ["Пд", 40], ["Пе", 40], ["Пр", 40], ["Бл", 40], ["Фо", 40], ["Хв", 40]];
      doc.fillColor("#6b7280").fontSize(8).font("Helvetica");
      let x = 40;
      for (const [label, width] of cols) {
        doc.text(String(label), x + 4, y, { width: Number(width) - 4 });
        x += Number(width);
      }
      y += 16;
      doc.moveTo(40, y - 2).lineTo(555, y - 2).strokeColor("#e5e7eb").lineWidth(0.5).stroke();

      // Rows
      for (const bs of scores) {
        if (y > 730) { doc.addPage(); y = 40; }
        doc.fillColor(y % 20 === 0 ? "#f9fafb" : "white").rect(40, y - 2, W, 18).fill();
        doc.fillColor(navy).fontSize(9).font("Helvetica");
        x = 40;
        const row = [
          `${bs.player.number}`,
          `${bs.player.firstName} ${bs.player.lastName}`,
          `${bs.points}`,
          `${bs.rebounds}`,
          `${bs.assists}`,
          `${bs.steals}`,
          `${bs.blocks}`,
          `${bs.fouls}`,
          `${bs.minutes}`,
        ];
        for (let i = 0; i < row.length; i++) {
          const [, width] = cols[i];
          doc.text(row[i], x + 4, y, { width: Number(width) - 4 });
          x += Number(width);
        }
        y += 18;
      }
      y += 12;
    }

    // Sponsor ad banner
    if (y > 680) { doc.addPage(); y = 40; }
    doc.moveTo(40, y).lineTo(555, y).strokeColor(orange).lineWidth(1).stroke();
    y += 10;
    doc.fillColor(orange).fontSize(10).font("Helvetica-Bold").text("Офіційний партнер ЛДБЛ", 40, y, { align: "center", width: W });
    y += 16;
    doc.fillColor("#6b7280").fontSize(9).font("Helvetica").text("www.basket.lviv.ua  ·  info@basket.lviv.ua", 40, y, { align: "center", width: W });

    doc.end();
  });

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="match-${gameId}-protocol.pdf"`,
    },
  });
}
