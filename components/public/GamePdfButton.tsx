"use client";

import { useState } from "react";

interface PlayerRow {
  number: number;
  lastName: string;
  firstName: string;
  position: string | null;
  isStarter: boolean;
  minutes: string | null;
  stats: {
    points: number;
    fmtFg: string; pctFg: string;
    fmtFg2: string; pctFg2: string;
    fmtFg3: string; pctFg3: string;
    fmtFt: string; pctFt: string;
    reboundsOff: number; reboundsDef: number; rebounds: number;
    assists: number; turnovers: number; blocks: number; fouls: number;
  };
}

interface TeamBox {
  players: PlayerRow[];
  totals: {
    points: number;
    fmtFg: string; pctFg: string;
    fmtFg2: string; pctFg2: string;
    fmtFg3: string; pctFg3: string;
    fmtFt: string; pctFt: string;
    reboundsOff: number; reboundsDef: number; rebounds: number;
    assists: number; turnovers: number; blocks: number; fouls: number;
  };
}

export interface GamePdfData {
  id: number;
  scheduledAt: string;
  homeScore: number;
  awayScore: number;
  status: string;
  homeTeam: { name: string; shortName: string };
  awayTeam: { name: string; shortName: string };
  homeBox: TeamBox;
  awayBox: TeamBox;
  quarterScores: { quarter: number; home: number; away: number }[];
  homeStats?: {
    ptsOffTurnovers: number;
    ptsFastBreak: number;
    ptsSecondChance: number;
    ptsAfterSubs: number;
    maxLead: number;
    maxRun: number;
  };
  awayStats?: {
    ptsOffTurnovers: number;
    ptsFastBreak: number;
    ptsSecondChance: number;
    ptsAfterSubs: number;
    maxLead: number;
    maxRun: number;
  };
}

// ── HTML генерація протоколу ───────────────────────────────────────────────

function fmt(v: number | string | null | undefined, fallback = "-"): string {
  if (v === null || v === undefined || v === 0 || v === "0") return fallback;
  return String(v);
}

function teamTableHTML(
  teamName: string,
  box: TeamBox,
  isWinner: boolean,
  teamStats?: {
    ptsOffTurnovers: number;
    ptsFastBreak: number;
    ptsSecondChance: number;
    ptsAfterSubs: number;
    maxLead: number;
    maxRun: number;
  }
): string {
  const headerBg = isWinner ? "#f97316" : "#0f172a";

  const starters = box.players.filter((p) => p.isStarter);
  const bench    = box.players.filter((p) => !p.isStarter);

  const playerRow = (p: PlayerRow, shade: string) => `
    <tr style="background:${shade};">
      <td style="${tdS}">${p.isStarter ? "★ " : ""}${p.number}</td>
      <td style="${tdS} text-align:left; font-weight:600;">${p.lastName} ${p.firstName[0]}.</td>
      <td style="${tdS}">${p.position ?? "-"}</td>
      <td style="${tdS}">${p.minutes ?? "-"}</td>
      <td style="${tdS} font-weight:700; color:#0f172a;">${p.stats.points}</td>
      <td style="${tdS}">${p.stats.fmtFg}</td>
      <td style="${tdS} color:#94a3b8;">${p.stats.pctFg}</td>
      <td style="${tdS}">${p.stats.fmtFg2}</td>
      <td style="${tdS} color:#94a3b8;">${p.stats.pctFg2}</td>
      <td style="${tdS}">${p.stats.fmtFg3}</td>
      <td style="${tdS} color:#94a3b8;">${p.stats.pctFg3}</td>
      <td style="${tdS}">${p.stats.fmtFt}</td>
      <td style="${tdS} color:#94a3b8;">${p.stats.pctFt}</td>
      <td style="${tdS}">${fmt(p.stats.reboundsOff)}</td>
      <td style="${tdS}">${fmt(p.stats.reboundsDef)}</td>
      <td style="${tdS}">${fmt(p.stats.rebounds)}</td>
      <td style="${tdS}">${fmt(p.stats.assists)}</td>
      <td style="${tdS}">${fmt(p.stats.turnovers)}</td>
      <td style="${tdS}">${fmt(p.stats.blocks)}</td>
      <td style="${tdS} color:#dc2626;">${fmt(p.stats.fouls)}</td>
    </tr>`;

  const starterRows = starters.map((p, i) => playerRow(p, i % 2 === 0 ? "#ffffff" : "#f1f5f9")).join("");
  const benchRows   = bench.map((p, i) => playerRow(p, i % 2 === 0 ? "#fafafa" : "#f1f5f9")).join("");
  const t = box.totals;

  return `
    <div style="margin-bottom:24px; break-inside:avoid;">
      <div style="background:${headerBg}; color:#fff; padding:10px 16px;
                  font-size:14px; font-weight:700; border-radius:6px 6px 0 0;
                  display:flex; justify-content:space-between; align-items:center;">
        <span>${teamName}</span>
        ${isWinner ? '<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:20px;font-size:11px;">🏆 ПЕРЕМОЖЕЦЬ</span>' : ""}
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr style="background:#1a2c56; color:#fff;">
            ${["№","ГРАВЕЦЬ","ПОЗ","ХВ","ОЧ","КД","%","2О","%","3О","%","ШТ","%","НПД","ЗПД","ПДБ","ПЕР","ВТ","БЛК","ФОЛ"]
              .map((h, i) => `<th style="${thS}${i === 1 ? "text-align:left;" : ""}">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${starterRows}
          ${bench.length > 0 ? `
          <tr style="background:#e2e8f0;">
            <td colspan="20" style="padding:4px 10px; font-size:10px; color:#64748b;
                font-weight:600; letter-spacing:.05em;">ЛАВКА</td>
          </tr>
          ${benchRows}` : ""}
          <tr style="background:#1a2c56; color:#fff; font-weight:700;">
            <td style="${tdS}">Σ</td>
            <td style="${tdS} text-align:left;">РАЗОМ</td>
            <td style="${tdS}"></td><td style="${tdS}"></td>
            <td style="${tdS} font-weight:800;">${t.points}</td>
            <td style="${tdS}">${t.fmtFg}</td>
            <td style="${tdS}">${t.pctFg}</td>
            <td style="${tdS}">${t.fmtFg2}</td>
            <td style="${tdS}">${t.pctFg2}</td>
            <td style="${tdS}">${t.fmtFg3}</td>
            <td style="${tdS}">${t.pctFg3}</td>
            <td style="${tdS}">${t.fmtFt}</td>
            <td style="${tdS}">${t.pctFt}</td>
            <td style="${tdS}">${t.reboundsOff}</td>
            <td style="${tdS}">${t.reboundsDef}</td>
            <td style="${tdS}">${t.rebounds}</td>
            <td style="${tdS}">${t.assists}</td>
            <td style="${tdS}">${t.turnovers}</td>
            <td style="${tdS}">${t.blocks}</td>
            <td style="${tdS} color:#fca5a5;">${t.fouls}</td>
          </tr>
        </tbody>
      </table>
      ${teamStats ? `
      <div style="background:#f8fafc; padding:12px 16px; border-top:1px solid #e2e8f0;
                  display:grid; grid-template-columns:repeat(6, 1fr); gap:12px; font-size:10px;">
        <div style="text-align:center;">
          <div style="color:#6b7280; font-size:9px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Очки після втрат</div>
          <div style="font-weight:700; color:#0f172a; font-size:13px;">${teamStats.ptsOffTurnovers}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#6b7280; font-size:9px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Очки з відриву</div>
          <div style="font-weight:700; color:#0f172a; font-size:13px;">${teamStats.ptsFastBreak}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#6b7280; font-size:9px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Другий шанс</div>
          <div style="font-weight:700; color:#0f172a; font-size:13px;">${teamStats.ptsSecondChance}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#6b7280; font-size:9px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Після замін</div>
          <div style="font-weight:700; color:#0f172a; font-size:13px;">${teamStats.ptsAfterSubs}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#6b7280; font-size:9px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Найбільш. відрив</div>
          <div style="font-weight:700; color:#0f172a; font-size:13px;">+${teamStats.maxLead}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#6b7280; font-size:9px; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Найдовший забіг</div>
          <div style="font-weight:700; color:#0f172a; font-size:13px;">${teamStats.maxRun}</div>
        </div>
      </div>
      ` : ""}
    </div>`;
}

const thS = "padding:7px 6px; border:1px solid #334155; font-weight:700; text-align:center; white-space:nowrap;";
const tdS = "padding:6px 6px; border:1px solid #e2e8f0; text-align:center; white-space:nowrap;";

function buildProtocolHTML(data: GamePdfData): string {
  const homeWins = data.homeScore > data.awayScore;
  const awayWins = data.awayScore > data.homeScore;

  const dateUk = new Date(data.scheduledAt).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const activeQs = data.quarterScores.filter((q) => q.home > 0 || q.away > 0);
  const qStr = activeQs.map((q) => `Q${q.quarter}: ${q.home}–${q.away}`).join("&nbsp;&nbsp;");

  const statusLabel =
    data.status === "FINAL" ? "ФІНАЛ" :
    data.status === "LIVE"  ? "LIVE"  : "ЗАПЛАНОВАНО";

  const now = new Date().toLocaleString("uk-UA");

  return `
    <div style="font-family:'Arial','Helvetica',sans-serif; color:#1f2937; background:#fff; width:1140px; padding:0;">

      <!-- ШАПКА -->
      <div style="background:#0f172a; color:#fff; padding:18px 32px;
                  display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="background:#f97316; border-radius:50%; width:52px; height:52px;
                      display:flex; align-items:center; justify-content:center;
                      font-weight:900; font-size:16px; color:#fff; flex-shrink:0;">ДБЛ</div>
          <div>
            <div style="font-size:18px; font-weight:800; letter-spacing:.03em;">ФЕДЕРАЦІЯ БАСКЕТБОЛУ ЛЬВОВА</div>
            <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Офіційний сайт баскетбольської спільноти Львова</div>
          </div>
        </div>
        <div style="text-align:right; color:#94a3b8; font-size:12px;">
          <div style="font-size:14px; color:#fff; font-weight:600;">${dateUk}</div>
        </div>
      </div>

      <!-- ЗАГОЛОВОК -->
      <div style="background:#1a2c56; color:#fff; text-align:center; padding:10px;">
        <span style="font-size:16px; font-weight:800; letter-spacing:.05em;">
          ПРОТОКОЛ ГРИ №${data.id}
        </span>
      </div>

      <!-- РАХУНОК -->
      <div style="background:#f8fafc; padding:24px 32px; text-align:center; border-bottom:2px solid #e2e8f0;">
        <div style="display:flex; justify-content:center; align-items:center; gap:40px;">
          <div style="flex:1; text-align:right;">
            <div style="font-size:18px; font-weight:800; color:${homeWins ? "#f97316" : "#0f172a"};">
              ${data.homeTeam.name}
            </div>
            <div style="font-size:12px; color:#6b7280; margin-top:2px;">${data.homeTeam.shortName}</div>
          </div>
          <div style="text-align:center; min-width:160px;">
            <div style="font-size:52px; font-weight:900; color:#0f172a; line-height:1;">
              ${data.homeScore}&nbsp;:&nbsp;${data.awayScore}
            </div>
            <div style="margin-top:8px;">
              <span style="background:${data.status === "LIVE" ? "#ef4444" : "#1a2c56"};
                           color:#fff; padding:3px 14px; border-radius:20px;
                           font-size:11px; font-weight:700;">
                ${statusLabel}
              </span>
            </div>
            ${activeQs.length > 0 ? `<div style="margin-top:8px; font-size:11px; color:#94a3b8;">${qStr}</div>` : ""}
          </div>
          <div style="flex:1; text-align:left;">
            <div style="font-size:18px; font-weight:800; color:${awayWins ? "#f97316" : "#0f172a"};">
              ${data.awayTeam.name}
            </div>
            <div style="font-size:12px; color:#6b7280; margin-top:2px;">${data.awayTeam.shortName}</div>
          </div>
        </div>
      </div>

      <!-- ТАБЛИЦІ -->
      <div style="padding:24px 32px;">
        ${teamTableHTML(data.homeTeam.name, data.homeBox, homeWins, data.homeStats)}
        ${teamTableHTML(data.awayTeam.name, data.awayBox, awayWins, data.awayStats)}

        <!-- ЛЕГЕНДА -->
        <div style="font-size:10px; color:#94a3b8; margin-top:4px; line-height:1.8;">
          КД — кидки динамічні (усі) &nbsp;|&nbsp; 2О — двоочкові &nbsp;|&nbsp; 3О — триочкові &nbsp;|&nbsp;
          ШТ — штрафні &nbsp;|&nbsp; НПД — підбір напад &nbsp;|&nbsp; ЗПД — підбір захист &nbsp;|&nbsp;
          ПДБ — підбори &nbsp;|&nbsp; ПЕР — передачі &nbsp;|&nbsp; ВТ — втрати &nbsp;|&nbsp;
          БЛК — блоки &nbsp;|&nbsp; ФОЛ — фоли &nbsp;|&nbsp; ★ — стартовий
        </div>
      </div>

      <!-- ПІДВАЛ -->
      <div style="background:#0f172a; color:#94a3b8; padding:12px 32px;
                  display:flex; justify-content:space-between; align-items:center;
                  font-size:10px;">
        <span>Документ згенеровано: ${now}</span>
        <span>© 2026 Федерація Баскетболу Львова</span>
      </div>

    </div>`;
}

// ── Компонент кнопки ──────────────────────────────────────────────────────

export default function GamePdfButton({ data }: { data: GamePdfData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      if (!html2canvas || !jsPDF) {
        throw new Error("Помилка завантаження необхідних модулів");
      }

      // Створюємо прихований контейнер
      const container = document.createElement("div");
      container.style.cssText = [
        "position:fixed",
        "top:-99999px",
        "left:-99999px",
        "width:1140px",
        "background:#fff",
        "z-index:-1",
      ].join(";");
      container.innerHTML = buildProtocolHTML(data);
      document.body.appendChild(container);

      try {
        // Чекаємо рендеринг
        await new Promise((r) => setTimeout(r, 200));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          allowTaint: true,
          imageTimeout: 5000,
        });

        const imgW = canvas.width;
        const imgH = canvas.height;

        // A4 landscape у px при 96dpi
        const pdfW = imgW / 2;
        const pdfH = imgH / 2;

        const pdf = new jsPDF({
          orientation: pdfW > pdfH ? "landscape" : "portrait",
          unit: "px",
          format: [pdfW, pdfH],
          hotfixes: ["px_scaling"],
        });

        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0, 0,
          pdfW, pdfH,
        );

        const dateFile = new Date(data.scheduledAt)
          .toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" })
          .replace(/\./g, "-");

        pdf.save(
          `protokol-gry-${data.id}-${data.homeTeam.shortName}-vs-${data.awayTeam.shortName}-${dateFile}.pdf`
        );
      } finally {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Невідома помилка";
      setError(`Помилка генерації PDF: ${errorMessage}`);
      console.error("PDF generation error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "8px 18px",
          background: loading ? "#fb923c" : error ? "#dc2626" : "#f97316",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: 700,
          fontSize: "13px",
          cursor: loading || error ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "background 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? (
          <>
            <span style={{
              display: "inline-block",
              width: 13, height: 13,
              border: "2px solid rgba(255,255,255,0.35)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "pdfSpin 0.7s linear infinite",
            }} />
            Генерація PDF...
          </>
        ) : error ? (
          <>❌ Помилка</>
        ) : (
          <>📄 Завантажити протокол PDF</>
        )}
        <style>{`@keyframes pdfSpin { to { transform: rotate(360deg); } }`}</style>
      </button>
      {error && (
        <div style={{
          fontSize: "12px",
          color: "#dc2626",
          backgroundColor: "#fee2e2",
          padding: "6px 10px",
          borderRadius: "4px",
          maxWidth: "300px",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
