"use client";

import React from "react";
import type { Game, Team, Player, BoxScore } from "@prisma/client";
import { calculateEFF } from "@/lib/efficiency";

type GameWithAll = Game & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
  boxScores: (BoxScore & { player: Player })[];
};

function getDisplayTime(bs: BoxScore, gameTimeLeft: number | undefined): string {
  const seconds = bs.timeOnCourtSeconds ?? 0;
  const sessionSeconds = (bs.isOnCourt && bs.enteredAt && gameTimeLeft !== undefined)
    ? Math.max(0, bs.enteredAt - gameTimeLeft)
    : 0;
  const total = seconds + sessionSeconds;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getBoxScoreForPlayer(boxScores: (BoxScore & { player: Player })[], playerId: number): BoxScore | null {
  return boxScores.find(bs => bs.playerId === playerId) || null;
}

function pct(made: number, attempted: number): string {
  if (attempted === 0) return "—";
  const p = Math.round((made / attempted) * 100);
  return `${p}`;
}

function TeamProtocolTable({
  team,
  boxScores,
  isHome,
  game,
  gameTimeLeft,
}: {
  team: Team & { players: Player[] };
  boxScores: (BoxScore & { player: Player })[];
  isHome: boolean;
  game: GameWithAll;
  gameTimeLeft?: number;
}) {
  const headerBg = isHome ? "#1e3a8a" : "#7f1d1d";
  const starterBg = isHome ? "#1e3a8a" : "#7f1d1d";
  const borderColor = isHome ? "#3b82f6" : "#dc2626";

  const starters = team.players.slice(0, 5);
  const bench = team.players.slice(5);

  const calcTeamTotals = () => {
    const totals = {
      fg2Made: 0,
      fg2Att: 0,
      fg3Made: 0,
      fg3Att: 0,
      ftMade: 0,
      ftAtt: 0,
      points: 0,
      rebounds: 0,
      reboundsOff: 0,
      reboundsDef: 0,
      assists: 0,
      turnovers: 0,
      steals: 0,
      blocks: 0,
      foulsPersonal: 0,
    };

    boxScores.forEach(bs => {
      totals.fg2Made += bs.fg2Made;
      totals.fg2Att += bs.fg2Attempted;
      totals.fg3Made += bs.fg3Made;
      totals.fg3Att += bs.fg3Attempted;
      totals.ftMade += bs.ftMade;
      totals.ftAtt += bs.ftAttempted;
      totals.points += bs.points;
      totals.rebounds += bs.rebounds;
      totals.reboundsOff += bs.reboundsOff;
      totals.reboundsDef += bs.reboundsDef;
      totals.assists += bs.assists;
      totals.turnovers += bs.turnovers;
      totals.steals += bs.steals;
      totals.blocks += bs.blocks;
      totals.foulsPersonal += bs.foulsPersonal;
    });

    return totals;
  };

  const teamTotals = calcTeamTotals();
  const allFieldGoals = teamTotals.fg2Made + teamTotals.fg3Made + teamTotals.ftMade;
  const allFieldGoalAtts = teamTotals.fg2Att + teamTotals.fg3Att + teamTotals.ftAtt;

  const renderPlayerRow = (player: Player, isStarter: boolean) => {
    const bs = getBoxScoreForPlayer(boxScores, player.id);
    const bgColor = isStarter ? starterBg : "#ffffff";
    const textColor = isStarter ? "#ffffff" : "#000000";

    return (
      <tr
        key={player.id}
        style={{
          background: bgColor,
          color: textColor,
          borderBottom: "1px solid #e5e7eb",
          height: "26px",
        }}
      >
        <td style={{
          padding: "2px 3px",
          textAlign: "center",
          fontSize: "12px",
          fontWeight: isStarter ? "700" : "500",
          borderLeft: isStarter ? `6px solid ${borderColor}` : "none",
        }}>
          {player.number}
        </td>
        <td style={{
          padding: "2px 3px",
          fontSize: "12px",
          fontWeight: isStarter ? "700" : "500",
          textAlign: "left",
          minWidth: "100px",
        }}>
          {player.lastName}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>—</td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs ? getDisplayTime(bs, gameTimeLeft) : "00:00"}
        </td>
        <td style={{
          padding: "2px 3px",
          textAlign: "center",
          fontSize: "12px",
          fontWeight: "800",
          color: isStarter ? "#ffffff" : borderColor,
        }}>
          {bs?.points || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {(bs?.fg2Made ?? 0) + (bs?.fg3Made ?? 0) + (bs?.ftMade ?? 0) || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {pct((bs?.fg2Made ?? 0) + (bs?.fg3Made ?? 0) + (bs?.ftMade ?? 0), (bs?.fg2Attempted ?? 0) + (bs?.fg3Attempted ?? 0) + (bs?.ftAttempted ?? 0))}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.fg2Made || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {pct(bs?.fg2Made ?? 0, bs?.fg2Attempted ?? 0)}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.fg3Made || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {pct(bs?.fg3Made ?? 0, bs?.fg3Attempted ?? 0)}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.ftMade || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {pct(bs?.ftMade ?? 0, bs?.ftAttempted ?? 0)}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.reboundsOff || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.reboundsDef || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px", fontWeight: "600" }}>
          {bs?.rebounds || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.assists || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.turnovers || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.steals || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.blocks || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>0</td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs?.foulsPersonal || 0}
        </td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>{bs?.plusMinus || 0}</td>
        <td style={{ padding: "2px 3px", textAlign: "center", fontSize: "12px" }}>
          {bs ? calculateEFF(bs) : 0}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      {/* Team Header */}
      <div style={{
        background: headerBg,
        color: "#ffffff",
        padding: "6px 8px",
        marginBottom: "0px",
      }}>
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "3px" }}>
          {team.name}
        </div>
        <div style={{ fontSize: "11px", display: "flex", gap: "16px" }}>
          <span><strong>Тренер:</strong> {team.coachName || "—"}</span>
          <span><strong>Помічник:</strong> {team.assistantCoach || "—"}</span>
        </div>
      </div>

      {/* Table Wrapper */}
      <div style={{
        overflowX: "auto",
        border: `1px solid ${borderColor}`,
        borderTop: "none",
        background: "#ffffff",
      }}>
        <table style={{
          borderCollapse: "collapse",
          width: "100%",
          background: "#ffffff",
        }}>
          <thead>
            <tr style={{ background: "#f3f4f6", borderBottom: `2px solid ${borderColor}`, height: "24px" }}>
              <th style={{
                padding: "3px 3px",
                fontSize: "11px",
                fontWeight: "700",
                textAlign: "center",
                color: "#1f2937",
                borderLeft: `6px solid ${borderColor}`,
                width: "32px",
              }}>№</th>
              <th style={{
                padding: "3px 3px",
                fontSize: "11px",
                fontWeight: "700",
                textAlign: "left",
                color: "#1f2937",
                width: "100px",
              }}>Гравець</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>ВОЛ.</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>Хв</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "800", textAlign: "center", color: borderColor }}>ОЧК</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>КД</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>%КД</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>2-очк</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>%2-очк</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>3-очк</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>%3-очк</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>ШТ</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>%ШТ</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>ПД(н)</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>ПД(з)</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>ПД</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>ПР</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>ВТ</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>Пх</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>БШ</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>БШ(н)</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>Ф</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>+/-</th>
              <th style={{ padding: "3px 3px", fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#1f2937" }}>Еф</th>
            </tr>
          </thead>
          <tbody>
            {/* Starters */}
            {starters.map((player) => renderPlayerRow(player, true))}

            {/* Bench Header */}
            {bench.length > 0 && (
              <tr style={{ background: "#f1f5f9", height: "24px", borderBottom: "1px solid #d1d5db" }}>
                <td colSpan={24} style={{
                  padding: "3px 8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#374151",
                }}>
                  Запасні
                </td>
              </tr>
            )}

            {/* Bench Players */}
            {bench.map((player) => renderPlayerRow(player, false))}

            {/* Team Totals */}
            <tr style={{
              background: "#e2e8f0",
              fontWeight: "700",
              fontSize: "12px",
              borderTop: `2px solid ${borderColor}`,
              borderBottom: `2px solid ${borderColor}`,
              height: "26px",
              color: "#1f2937",
            }}>
              <td style={{
                padding: "2px 3px",
                textAlign: "center",
                borderLeft: `6px solid ${borderColor}`,
              }}>—</td>
              <td style={{
                padding: "2px 3px",
                textAlign: "left",
                minWidth: "100px",
                fontSize: "13px",
              }}>
                Команда / Тренер
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>—</td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>—</td>
              <td style={{
                padding: "2px 3px",
                textAlign: "center",
                color: borderColor,
                fontWeight: "800",
              }}>
                {teamTotals.points}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {allFieldGoals}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {pct(allFieldGoals, allFieldGoalAtts)}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.fg2Made}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {pct(teamTotals.fg2Made, teamTotals.fg2Att)}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.fg3Made}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {pct(teamTotals.fg3Made, teamTotals.fg3Att)}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.ftMade}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {pct(teamTotals.ftMade, teamTotals.ftAtt)}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.reboundsOff}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.reboundsDef}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.rebounds}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.assists}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.turnovers}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.steals}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.blocks}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>0</td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>
                {teamTotals.foulsPersonal}
              </td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>—</td>
              <td style={{ padding: "2px 3px", textAlign: "center" }}>—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Team Stats Section */}
      <div style={{
        background: "#f9fafb",
        padding: "8px 8px",
        borderLeft: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        fontSize: "12px",
      }}>
        <div style={{
          fontWeight: "700",
          marginBottom: "6px",
          color: headerBg,
          fontSize: "13px",
        }}>
          Загальна статистика команди
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8px",
          lineHeight: "1.4",
          fontSize: "11px",
        }}>
          <div>
            <span>Очки після втрат: </span>
            <strong>{isHome ? game.ptsOffTurnovers : game.awayPtsOffTurnovers}</strong>
          </div>
          <div>
            <span>Очки з трьохсекундної: </span>
            <strong>0</strong>
          </div>
          <div>
            <span>Очки другого шансу: </span>
            <strong>{isHome ? game.ptsSecondChance : game.awayPtsSecondChance}</strong>
          </div>
          <div>
            <span>Очки у швидких відривах: </span>
            <strong>{isHome ? game.ptsFastBreak : game.awayPtsFastBreak}</strong>
          </div>
          <div>
            <span>Очки лави запасних: </span>
            <strong>{isHome ? game.ptsAfterSubstitutions : game.awayPtsAfterSubstitutions}</strong>
          </div>
          <div>
            <span>Найбільший ривок: </span>
            <strong>{isHome ? game.biggestRun : game.awayBiggestRun}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GameProtocol({ game, gameTimeLeft }: { game: GameWithAll; gameTimeLeft?: number }) {
  const homeBoxScores = game.boxScores.filter(bs => bs.teamId === game.homeTeamId);
  const awayBoxScores = game.boxScores.filter(bs => bs.teamId === game.awayTeamId);

  return (
    <div style={{ padding: "12px 0", maxWidth: "1300px", margin: "0 auto" }}>
      <h1 style={{
        fontSize: "16px",
        fontWeight: "700",
        marginBottom: "12px",
        textAlign: "center",
        color: "#1f2937",
        letterSpacing: "0.5px",
      }}>
        FIBA ПРОТОКОЛ МАТЧУ
      </h1>

      {/* Home Team */}
      <TeamProtocolTable
        team={game.homeTeam}
        boxScores={homeBoxScores}
        isHome={true}
        game={game}
        gameTimeLeft={gameTimeLeft}
      />

      {/* Away Team */}
      <TeamProtocolTable
        team={game.awayTeam}
        boxScores={awayBoxScores}
        isHome={false}
        game={game}
        gameTimeLeft={gameTimeLeft}
      />

      {/* Officials and Legend Section */}
      <div style={{
        marginTop: "16px",
        padding: "8px 10px",
        background: "#f3f4f6",
        border: "1px solid #d1d5db",
        borderRadius: "2px",
      }}>
        {/* Officials */}
        <div style={{ marginBottom: "12px" }}>
          <h3 style={{
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "6px",
            color: "#1f2937",
          }}>
            Судді
          </h3>
          <div style={{
            fontSize: "11px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
            color: "#374151",
          }}>
            <div><strong>Головний:</strong> {game.referee || "—"}</div>
            <div><strong>Суддя 1:</strong> {game.umpire1 || "—"}</div>
            <div><strong>Суддя 2:</strong> {game.umpire2 || "—"}</div>
            <div><strong>Час:</strong> {game.timer || "—"}</div>
            <div><strong>Секретар:</strong> {game.scorer || "—"}</div>
            <div><strong>Помічник:</strong> {game.assistantScorer || "—"}</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ borderTop: "1px solid #d1d5db", paddingTop: "8px" }}>
          <h3 style={{
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "6px",
            color: "#1f2937",
          }}>
            Розшифрування
          </h3>
          <div style={{
            fontSize: "11px",
            lineHeight: "1.5",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "6px 8px",
            color: "#4b5563",
          }}>
            <div><strong>№</strong> — номер</div>
            <div><strong>ВОЛ.</strong> — вихід</div>
            <div><strong>Хв</strong> — хвилини</div>
            <div><strong>ОЧК</strong> — очки</div>
            <div><strong>КД</strong> — кидки</div>
            <div><strong>%КД</strong> — %</div>
            <div><strong>2-очк</strong> — дво очк</div>
            <div><strong>%2</strong> — % 2-очк</div>
            <div><strong>3-очк</strong> — три очк</div>
            <div><strong>%3</strong> — % 3-очк</div>
            <div><strong>ШТ</strong> — штрафні</div>
            <div><strong>%ШТ</strong> — % ШТ</div>
            <div><strong>ПД(н)</strong> — піб нап</div>
            <div><strong>ПД(з)</strong> — піб зах</div>
            <div><strong>ПД</strong> — підбори</div>
            <div><strong>ПР</strong> — передачи</div>
            <div><strong>ВТ</strong> — втрати</div>
            <div><strong>Пх</strong> — перехопл</div>
            <div><strong>БШ</strong> — блокування</div>
            <div><strong>Ф</strong> — фоли</div>
            <div><strong>+/-</strong> — +/-</div>
            <div><strong>Еф</strong> — еф-ть</div>
          </div>
        </div>
      </div>
    </div>
  );
}
