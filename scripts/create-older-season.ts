import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating U-18 (older) season data...");

  // 1. Create Season for older group
  const olderSeason = await prisma.season.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "2025-2026",
      isActive: true,
      ageGroup: "older",
    },
  });
  console.log(`✓ Created season: ${olderSeason.name} (${olderSeason.ageGroup})`);

  // 2. Create Teams for older group
  const teamData = [
    { name: "Льніки", shortName: "ЛЬ" },
    { name: "Фенікс", shortName: "ФН" },
    { name: "Титани", shortName: "ТТ" },
    { name: "Грифони", shortName: "ГР" },
    { name: "Армадо", shortName: "АРМ" },
    { name: "Циклони", shortName: "ЦК" },
    { name: "Гладіатори", shortName: "ГЛД" },
    { name: "Вороння", shortName: "ВОР" },
  ];

  const olderTeams = [];
  for (let i = 0; i < teamData.length; i++) {
    const t = teamData[i];
    const team = await prisma.team.create({
      data: {
        name: t.name,
        shortName: t.shortName,
        seasonId: olderSeason.id,
        ageGroup: "older",
        logoUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%234f46e5'/%3E%3Ctext x='50' y='55' font-size='35' text-anchor='middle' fill='white' font-weight='bold'%3E${t.shortName.substring(0, 2)}%3C/text%3E%3C/svg%3E`,
      },
    });
    console.log(`  - ${team.name} (ID: ${team.id})`);
    olderTeams.push(team);
  }
  console.log(`✓ Created ${olderTeams.length} teams for older group`);

  // 3. Create Players for each team
  const playerTemplate = [
    { number: 3, firstName: "Павло", lastName: "Лисовий", position: "PG" },
    { number: 8, firstName: "Артем", lastName: "Волошин", position: "SG" },
    { number: 12, firstName: "Максим", lastName: "Кравець", position: "SF" },
    { number: 17, firstName: "Никита", lastName: "Сокоренко", position: "PF" },
    { number: 24, firstName: "Ігор", lastName: "Малишевський", position: "C" },
    { number: 5, firstName: "Владимир", lastName: "Кравченко", position: "PG" },
    { number: 13, firstName: "Микола", lastName: "Петренко", position: "SF" },
    { number: 20, firstName: "Ростислав", lastName: "Яремчук", position: "PF" },
    { number: 32, firstName: "Дарій", lastName: "Овсієнко", position: "C" },
    { number: 7, firstName: "Ілля", lastName: "Попов", position: "SG" },
  ];

  for (const team of olderTeams) {
    for (const p of playerTemplate) {
      await prisma.player.create({
        data: {
          number: p.number,
          firstName: p.firstName,
          lastName: p.lastName,
          position: p.position,
          teamId: team.id,
          photoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%234f46e5;stop-opacity:1'/%3E%3Cstop offset='100%25' style='stop-color:%23f46f10;stop-opacity:1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23bg)' width='400' height='600'/%3E%3Ccircle cx='200' cy='120' r='80' fill='%23ffffff'/%3E%3Crect x='100' y='200' width='200' height='250' fill='%23ffffff'/%3E%3Ctext x='200' y='500' font-size='80' text-anchor='middle' fill='%23ffffff' font-weight='bold'%3E🏀%3C/text%3E%3C/svg%3E",
        },
      });
    }
  }
  console.log(`✓ Created 80 players for older group`);

  // 4. Create Games
  const gameDate = (daysAgo: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const gamesData = [
    { home: 0, away: 1, status: "FINAL", homeScore: 95, awayScore: 82, date: gameDate(21, 19) },
    { home: 2, away: 3, status: "FINAL", homeScore: 88, awayScore: 79, date: gameDate(21, 20) },
    { home: 4, away: 5, status: "FINAL", homeScore: 102, awayScore: 95, date: gameDate(14, 19) },
    { home: 6, away: 7, status: "FINAL", homeScore: 91, awayScore: 73, date: gameDate(14, 20) },
    { home: 1, away: 2, status: "FINAL", homeScore: 86, awayScore: 94, date: gameDate(7, 19) },
    { home: 3, away: 4, status: "FINAL", homeScore: 80, awayScore: 76, date: gameDate(7, 20) },
    { home: 0, away: 2, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-7, 19) },
    { home: 1, away: 3, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-7, 20) },
    { home: 4, away: 6, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-14, 19) },
    { home: 5, away: 7, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-14, 20) },
  ];

  for (let i = 0; i < gamesData.length; i++) {
    const g = gamesData[i];
    await prisma.game.create({
      data: {
        seasonId: olderSeason.id,
        homeTeamId: olderTeams[g.home].id,
        awayTeamId: olderTeams[g.away].id,
        scheduledAt: g.date,
        status: g.status,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        quarter: g.status === "FINAL" ? 4 : 1,
      },
    });
  }
  console.log(`✓ Created 10 games for older group`);

  // 5. Create Box Scores
  const games = await prisma.game.findMany({ where: { seasonId: olderSeason.id, status: "FINAL" } });

  for (const game of games) {
    const homeTeam = olderTeams.find(t => t.id === game.homeTeamId);
    const awayTeam = olderTeams.find(t => t.id === game.awayTeamId);

    const homePlayers = await prisma.player.findMany({ where: { teamId: homeTeam!.id }, take: 8 });
    const awayPlayers = await prisma.player.findMany({ where: { teamId: awayTeam!.id }, take: 8 });

    for (let i = 0; i < homePlayers.length; i++) {
      await prisma.boxScore.create({
        data: {
          gameId: game.id,
          playerId: homePlayers[i].id,
          teamId: homeTeam!.id,
          points: Math.floor(Math.random() * 25),
          rebounds: Math.floor(Math.random() * 12),
          assists: Math.floor(Math.random() * 10),
          steals: Math.floor(Math.random() * 5),
          blocks: Math.floor(Math.random() * 4),
          fouls: Math.floor(Math.random() * 5),
          minutes: 20 + Math.floor(Math.random() * 20),
        },
      });
    }

    for (let i = 0; i < awayPlayers.length; i++) {
      await prisma.boxScore.create({
        data: {
          gameId: game.id,
          playerId: awayPlayers[i].id,
          teamId: awayTeam!.id,
          points: Math.floor(Math.random() * 25),
          rebounds: Math.floor(Math.random() * 12),
          assists: Math.floor(Math.random() * 10),
          steals: Math.floor(Math.random() * 5),
          blocks: Math.floor(Math.random() * 4),
          fouls: Math.floor(Math.random() * 5),
          minutes: 20 + Math.floor(Math.random() * 20),
        },
      });
    }
  }
  console.log(`✓ Created box scores`);

  // 6. Create Standings
  const standingData = [
    { teamIdx: 0, wins: 2, losses: 0, pf: 220, pa: 185 },
    { teamIdx: 2, wins: 2, losses: 1, pf: 290, pa: 254 },
    { teamIdx: 3, wins: 1, losses: 1, pf: 159, pa: 149 },
    { teamIdx: 6, wins: 1, losses: 0, pf: 91, pa: 73 },
    { teamIdx: 4, wins: 1, losses: 1, pf: 177, pa: 179 },
    { teamIdx: 1, wins: 1, losses: 2, pf: 252, pa: 280 },
    { teamIdx: 5, wins: 1, losses: 1, pf: 175, pa: 169 },
    { teamIdx: 7, wins: 0, losses: 1, pf: 73, pa: 91 },
  ];

  for (const sd of standingData) {
    await prisma.standing.create({
      data: {
        teamId: olderTeams[sd.teamIdx].id,
        seasonId: olderSeason.id,
        wins: sd.wins,
        losses: sd.losses,
        pointsFor: sd.pf,
        pointsAgainst: sd.pa,
        gamesPlayed: sd.wins + sd.losses,
      },
    });
  }
  console.log(`✓ Created standings`);

  console.log("\n✅ U-18 (older) season fully created!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
