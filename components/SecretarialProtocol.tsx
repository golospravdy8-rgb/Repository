"use client";

import { useEffect, useState } from "react";
import RunningScoreRenderer from "./RunningScoreRenderer";

interface PlayerProtocol {
  playerId: number;
  number: number;
  firstName: string;
  lastName: string;
  isStarter: boolean;
  fouls: number;
  foulsByType: { P: number; U: number; T: number; D: number };
  foulTypes: string[];
  pointsByQuarter: Record<number, number>;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
}

interface TeamInfo {
  id: number;
  name: string;
  coachName: string | null;
  assistantCoach: string | null;
}

interface ProtocolData {
  game: {
    id: number;
    scheduledAt: string;
    status: string;
    homeScore: number;
    awayScore: number;
    quarter: number;
    venue: string | null;
    round: string | null;
    gameNumber: string | null;
    commissioner: string | null;
    referee: string | null;
    umpire1: string | null;
    umpire2: string | null;
    scorer: string | null;
    assistantScorer: string | null;
    timer: string | null;
    shotClockOperator: string | null;
    protest: boolean;
    protestNote: string | null;
  };
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homePlayers: PlayerProtocol[];
  awayPlayers: PlayerProtocol[];
  events: Array<{
    type: string;
    teamId: number;
    playerId: number | null;
    quarter: number;
    points: number | null;
    createdAt: Date | string;
  }>;
  quarterScores: { quarter: number; home: number; away: number }[];
}

interface SecretarialProtocolProps {
  data: ProtocolData;
  gameId: number;
}

function getTeamFoulCount(events: ProtocolData["events"], teamId: number, quarter: number) {
  return events.filter(
    (e) =>
      e.teamId === teamId &&
      e.quarter === quarter &&
      ["FOUL", "FOUL_UNSPORTSMANLIKE", "FOUL_TECHNICAL", "FOUL_DISQUALIFYING"].includes(e.type)
  ).length;
}

interface TeamSectionProps {
  label: "A" | "B";
  teamName: string;
  coachName: string | null;
  assistantCoachName: string | null;
  players: PlayerProtocol[];
  events: ProtocolData["events"];
  currentQuarter: number;
}

function TeamSection({ label, teamName, coachName, assistantCoachName, players, events, currentQuarter }: TeamSectionProps) {
  const teamFoulCount = getTeamFoulCount(events, players[0]?.playerId ? 1 : 2, currentQuarter);

  return (
    <>
      {/* Team header with timeouts and team fouls */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "1px solid black" }}>
        <tbody>
          <tr>
            <td style={{ padding: "2px 4px", fontWeight: "bold", fontSize: "9px" }}>
              TEAM {label} — {teamName}
            </td>
            <td style={{ textAlign: "right", padding: "2px 4px", fontSize: "8px" }}>
              Time-outs:&nbsp;
              {[1, 2].map((n) => (
                <span
                  key={n}
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "1px solid black",
                    marginLeft: "2px",
                    textAlign: "center",
                    lineHeight: "14px",
                    fontSize: "10px",
                  }}
                ></span>
              ))}
              &nbsp;Q3/Q4:&nbsp;
              {[3, 4].map((n) => (
                <span
                  key={n}
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "1px solid black",
                    marginLeft: "2px",
                    textAlign: "center",
                    lineHeight: "14px",
                    fontSize: "10px",
                  }}
                ></span>
              ))}
              &nbsp;Team fouls:&nbsp;
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "1px solid black",
                    marginLeft: "1px",
                    textAlign: "center",
                    lineHeight: "14px",
                    fontSize: "8px",
                    background: teamFoulCount >= n ? "#000" : "transparent",
                    color: teamFoulCount >= n ? "#fff" : "#000",
                  }}
                >
                  {n}
                </span>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Players table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid black", background: "#f0f0f0" }}>
            <th style={{ width: "30px", border: "1px solid #ccc", padding: "1px 2px", fontSize: "8px" }}>Lic.</th>
            <th style={{ border: "1px solid #ccc", padding: "1px 4px", textAlign: "left", fontSize: "8px" }}>Players</th>
            <th style={{ width: "25px", border: "1px solid #ccc", padding: "1px 2px", textAlign: "center", fontSize: "8px" }}>No.</th>
            <th style={{ width: "18px", border: "1px solid #ccc", padding: "1px 2px", textAlign: "center", fontSize: "8px" }}>✓</th>
            <th style={{ width: "95px", border: "1px solid #ccc", padding: "1px 2px", textAlign: "center", fontSize: "8px" }}>Fouls 1–2–3–4–5</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.playerId} style={{ height: "16px", borderBottom: "1px solid #ddd" }}>
              <td style={{ border: "1px solid #ccc" }}></td>
              <td style={{ padding: "0 4px", fontSize: "8px" }}>
                {p.lastName} {p.firstName}
              </td>
              <td style={{ textAlign: "center", border: "1px solid #ccc", fontSize: "8px" }}>{p.number}</td>
              <td style={{ textAlign: "center", border: "1px solid #ccc", fontWeight: "bold", fontSize: "8px" }}>
                {p.isStarter ? "X" : ""}
              </td>
              <td style={{ padding: "1px 2px" }}>
                <div style={{ display: "flex", gap: "1px", justifyContent: "center" }}>
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const ft = p.foulTypes[idx];
                    const label =
                      idx === 4 && p.foulTypes.length >= 5
                        ? "F"
                        : ft === "FOUL"
                          ? "P"
                          : ft === "FOUL_UNSPORTSMANLIKE"
                            ? "U"
                            : ft === "FOUL_TECHNICAL"
                              ? "T"
                              : ft === "FOUL_DISQUALIFYING"
                                ? "D"
                                : "";
                    return (
                      <span
                        key={idx}
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "14px",
                          border: "1px solid black",
                          textAlign: "center",
                          lineHeight: "14px",
                          fontSize: idx === 4 ? "11px" : "8px",
                          fontWeight: idx === 4 ? "bold" : "normal",
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 12 - players.length) }).map((_, i) => (
            <tr key={"empty-" + i} style={{ height: "16px", borderBottom: "1px solid #eee" }}>
              <td colSpan={5} style={{ border: "1px solid #ddd" }}>&nbsp;</td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid black", background: "#f9f9f9" }}>
            <td colSpan={2} style={{ padding: "2px 4px", fontSize: "8px" }}>
              Coach: {coachName}
            </td>
            <td colSpan={3} style={{ padding: "2px 4px", fontSize: "8px" }}>
              Asst. Coach: {assistantCoachName}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function SecretarialProtocol({ data: initialData, gameId }: SecretarialProtocolProps) {
  const [data, setData] = useState(initialData);
  const [logoBase64, setLogoBase64] = useState<string>("");

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoBase64(canvas.toDataURL("image/png"));
      }
    };
    img.src = "/logos/header-logo.png";
  }, []);

  useEffect(() => {
    if (data.game.status !== "LIVE") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/protocol-data`);
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
        }
      } catch (error) {
        console.error("Protocol polling error:", error);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [gameId, data.game.status]);

  const printStyles = `
    @media print {
      body > * { display: none !important; }
      #secretarial-protocol-print { display: block !important; }
      #secretarial-protocol-print {
        width: 297mm !important;
        margin: 0 !important;
        padding: 8mm !important;
        font-size: 8pt !important;
      }
      .no-print { display: none !important; }
    }
  `;

  const gameDate = new Date(data.game.scheduledAt);
  const formattedDate = gameDate.toLocaleDateString("uk-UA");
  const formattedTime = gameDate.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div
        id="secretarial-protocol-print"
        style={{
          width: "1100px",
          margin: "0 auto",
          background: "white",
          color: "black",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "9px",
          padding: "8px",
        }}
      >
        {/* [1] HEADER */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
          <tbody>
            <tr>
              <td style={{ width: "80px", verticalAlign: "middle" }}>
                {logoBase64 ? (
                  <img src={logoBase64} alt="FBU" height={55} style={{ display: "block" }} />
                ) : (
                  <div style={{ width: "80px", height: "55px" }} />
                )}
              </td>
              <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>ФЕДЕРАЦІЯ БАСКЕТБОЛУ УКРАЇНИ</div>
                <div style={{ fontSize: "10px" }}>INTERNATIONAL BASKETBALL FEDERATION</div>
                <div style={{ fontWeight: "bold", fontSize: "16px", letterSpacing: "3px", marginTop: "2px" }}>
                  СЕКРЕТАРСЬКИЙ ПРОТОКОЛ / SCORESHEET
                </div>
              </td>
              <td style={{ width: "80px", textAlign: "right", fontSize: "8px", verticalAlign: "top" }}>FIBA</td>
            </tr>
          </tbody>
        </table>

        {/* [2] META */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "2px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid black", padding: "2px 4px", width: "20%" }}>
                Team A: <strong>{data.homeTeam.name}</strong>
              </td>
              <td style={{ border: "1px solid black", padding: "2px 4px", width: "20%" }}>
                Team B: <strong>{data.awayTeam.name}</strong>
              </td>
              <td style={{ border: "1px solid black", padding: "2px 4px", width: "20%" }}>Game No.: {data.game.gameNumber || "—"}</td>
              <td style={{ border: "1px solid black", padding: "2px 4px", width: "20%" }}>Date: {formattedDate}</td>
              <td style={{ border: "1px solid black", padding: "2px 4px", width: "20%" }}>Time: {formattedTime}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ border: "1px solid black", padding: "2px 4px" }}>
                Place: {data.game.venue || "—"}
              </td>
              <td style={{ border: "1px solid black", padding: "2px 4px" }}>Referee: {data.game.referee || "—"}</td>
              <td style={{ border: "1px solid black", padding: "2px 4px" }}>Umpire 1: {data.game.umpire1 || "—"}</td>
              <td style={{ border: "1px solid black", padding: "2px 4px" }}>Umpire 2: {data.game.umpire2 || "—"}</td>
            </tr>
          </tbody>
        </table>

        {/* [3] MAIN 2-COL */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "2px" }}>
          <tbody>
            <tr>
              <td style={{ width: "60%", verticalAlign: "top", borderRight: "2px solid black", padding: 0 }}>
                {/* Gray divider TEAM A */}
                <div style={{ background: "#f5f5f5", padding: "2px 6px", fontWeight: "bold", fontSize: "10px", borderBottom: "1px solid black" }}>
                  TEAM A
                </div>
                <TeamSection
                  label="A"
                  teamName={data.homeTeam.name}
                  coachName={data.homeTeam.coachName}
                  assistantCoachName={data.homeTeam.assistantCoach}
                  players={data.homePlayers}
                  events={data.events}
                  currentQuarter={data.game.quarter}
                />

                {/* Gray divider TEAM B */}
                <div style={{ background: "#f5f5f5", padding: "2px 6px", fontWeight: "bold", fontSize: "10px", borderTop: "2px solid black", borderBottom: "1px solid black" }}>
                  TEAM B
                </div>
                <TeamSection
                  label="B"
                  teamName={data.awayTeam.name}
                  coachName={data.awayTeam.coachName}
                  assistantCoachName={data.awayTeam.assistantCoach}
                  players={data.awayPlayers}
                  events={data.events}
                  currentQuarter={data.game.quarter}
                />
              </td>

              {/* Running Score */}
              <td style={{ width: "40%", verticalAlign: "top", padding: 0 }}>
                <RunningScoreRenderer
                  events={data.events}
                  homeTeamId={data.homeTeam.id}
                  awayTeamId={data.awayTeam.id}
                  homePlayers={data.homePlayers.map((p) => ({ playerId: p.playerId, number: p.number }))}
                  awayPlayers={data.awayPlayers.map((p) => ({ playerId: p.playerId, number: p.number }))}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* [4] BOTTOM */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "2px solid black", marginTop: "4px" }}>
          <tbody>
            <tr>
              {/* Officials */}
              <td style={{ width: "50%", verticalAlign: "top", borderRight: "1px solid black", padding: "4px" }}>
                {[
                  ["Scorer", data.game.scorer],
                  ["Asst. scorer", data.game.assistantScorer],
                  ["Timer", data.game.timer],
                  ["Shot clock operator", data.game.shotClockOperator],
                  ["Referee", data.game.referee],
                  ["Umpire 1", data.game.umpire1],
                  ["Umpire 2", data.game.umpire2],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-end", marginBottom: "4px", gap: "4px" }}>
                    <span style={{ minWidth: "130px", fontSize: "8px" }}>{label}:</span>
                    <span style={{ flex: 1, borderBottom: "1px solid black", minHeight: "14px", fontSize: "8px" }}>
                      {value || ""}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: "8px", fontSize: "8px" }}>Captain's signature in case of protest: _______________</div>
              </td>

              {/* Quarter Scores */}
              <td style={{ width: "50%", verticalAlign: "top", padding: "4px" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid black" }}>
                      <th style={{ padding: "1px 4px", textAlign: "left", fontSize: "8px" }}>Scores</th>
                      <th style={{ padding: "1px 4px", textAlign: "center", fontSize: "8px" }}>Period</th>
                      <th style={{ padding: "1px 4px", textAlign: "center", fontSize: "8px", width: "50px" }}>A</th>
                      <th style={{ padding: "1px 4px", textAlign: "center", fontSize: "8px", width: "50px" }}>B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((q) => {
                      const qs = data.quarterScores.find((x) => x.quarter === q);
                      return (
                        <tr key={q} style={{ borderBottom: "1px solid #ddd" }}>
                          <td></td>
                          <td style={{ textAlign: "center", fontSize: "12px" }}>
                            {["①", "②", "③", "④"][q - 1]}
                          </td>
                          <td style={{ textAlign: "center", borderBottom: "1px solid black", fontSize: "10px", fontWeight: "bold" }}>
                            {qs?.home ?? ""}
                          </td>
                          <td style={{ textAlign: "center", borderBottom: "1px solid black", fontSize: "10px", fontWeight: "bold" }}>
                            {qs?.away ?? ""}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: "2px solid black" }}>
                      <td colSpan={2} style={{ padding: "2px 4px", fontSize: "9px", fontWeight: "bold" }}>
                        Final Score
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "14px", borderBottom: "1px solid black" }}>
                        {data.game.homeScore}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "14px", borderBottom: "1px solid black" }}>
                        {data.game.awayScore}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} style={{ padding: "3px 4px", fontSize: "8px" }}>
                        Name of winning team:{" "}
                        <strong>{data.game.homeScore > data.game.awayScore ? data.homeTeam.name : data.awayTeam.name}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Protest block */}
        {data.game.protest && (
          <div style={{ border: "2px solid red", borderRadius: "2px", padding: "4px", marginTop: "4px", background: "#fff5f5" }}>
            <div style={{ fontWeight: "bold", color: "#dc2626", marginBottom: "2px" }}>⚠️ PROTEST FILED</div>
            <p style={{ margin: 0, fontSize: "8px" }}>{data.game.protestNote}</p>
          </div>
        )}
      </div>
    </>
  );
}
