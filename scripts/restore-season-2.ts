import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Restoring Season 2 (U-18/older) with full data...\n");

  // 1. Create or verify Season 2
  const season2 = await prisma.season.upsert({
    where: { id: 2 },
    update: { isActive: true },
    create: {
      id: 2,
      name: "2025-2026",
      isActive: true,
      ageGroup: "older",
    },
  });
  console.log(`✅ Season 2: "${season2.name}" (${season2.ageGroup})`);

  // 2. Create 8 U-18 teams
  const teamData = [
    { id: 9, name: "Льніки", shortName: "ЛЬ" },
    { id: 10, name: "Фенікс", shortName: "ФН" },
    { id: 11, name: "Титани", shortName: "ТТ" },
    { id: 12, name: "Грифони", shortName: "ГР" },
    { id: 13, name: "Армадо", shortName: "АРМ" },
    { id: 14, name: "Циклони", shortName: "ЦК" },
    { id: 15, name: "Гладіатори", shortName: "ГЛД" },
    { id: 16, name: "Вороння", shortName: "ВОР" },
  ];

  const teams = [];
  for (const tData of teamData) {
    const team = await prisma.team.upsert({
      where: { id: tData.id },
      update: {},
      create: {
        id: tData.id,
        name: tData.name,
        shortName: tData.shortName,
        seasonId: season2.id,
        ageGroup: "older",
        logoUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%234f46e5'/%3E%3Ctext x='50' y='55' font-size='35' text-anchor='middle' fill='white' font-weight='bold'%3E${tData.shortName.substring(0, 2)}%3C/text%3E%3C/svg%3E`,
      },
    });
    teams.push(team);
  }
  console.log(`✅ Created 8 teams for Season 2:`);
  teams.forEach(t => console.log(`   - ${t.name} (${t.shortName})`));

  // 3. Create 80 players (10 per team) with realistic Ukrainian names
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

  let playerId = 81; // Start after existing players
  for (const team of teams) {
    for (const p of playerTemplate) {
      await prisma.player.upsert({
        where: { id: playerId },
        update: {},
        create: {
          id: playerId,
          number: p.number,
          firstName: p.firstName,
          lastName: p.lastName,
          position: p.position,
          teamId: team.id,
          photoUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%234f46e5;stop-opacity:1'/%3E%3Cstop offset='100%25' style='stop-color:%23f46f10;stop-opacity:1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23bg)' width='400' height='600'/%3E%3Ccircle cx='200' cy='120' r='80' fill='%23ffffff'/%3E%3Crect x='100' y='200' width='200' height='250' fill='%23ffffff'/%3E%3Ctext x='200' y='500' font-size='80' text-anchor='middle' fill='%23ffffff' font-weight='bold'%3E🏀%3C/text%3E%3C/svg%3E",
        },
      });
      playerId++;
    }
  }
  console.log(`✅ Created 80 players (10 per team, IDs 81-160)`);

  // 4. Create 10 games (6 finished, 4 scheduled)
  const gameDate = (daysAgo: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const gamesData = [
    { id: 11, home: 0, away: 1, status: "FINAL", homeScore: 95, awayScore: 82, date: gameDate(21, 19) },
    { id: 12, home: 2, away: 3, status: "FINAL", homeScore: 88, awayScore: 79, date: gameDate(21, 20) },
    { id: 13, home: 4, away: 5, status: "FINAL", homeScore: 102, awayScore: 95, date: gameDate(14, 19) },
    { id: 14, home: 6, away: 7, status: "FINAL", homeScore: 91, awayScore: 73, date: gameDate(14, 20) },
    { id: 15, home: 1, away: 2, status: "FINAL", homeScore: 86, awayScore: 94, date: gameDate(7, 19) },
    { id: 16, home: 3, away: 4, status: "FINAL", homeScore: 80, awayScore: 76, date: gameDate(7, 20) },
    { id: 17, home: 0, away: 2, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-7, 19) },
    { id: 18, home: 1, away: 3, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-7, 20) },
    { id: 19, home: 4, away: 6, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-14, 19) },
    { id: 20, home: 5, away: 7, status: "SCHEDULED", homeScore: 0, awayScore: 0, date: gameDate(-14, 20) },
  ];

  for (const gData of gamesData) {
    const homeTeam = teams[gData.home];
    const awayTeam = teams[gData.away];
    await prisma.game.upsert({
      where: { id: gData.id },
      update: {},
      create: {
        id: gData.id,
        seasonId: season2.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        scheduledAt: gData.date,
        status: gData.status,
        homeScore: gData.homeScore,
        awayScore: gData.awayScore,
        quarter: gData.status === "FINAL" ? 4 : 1,
      },
    });
  }
  console.log(`✅ Created 10 games (6 finished, 4 scheduled, IDs 11-20)`);

  // 5. Create standings for Season 2
  const standingData = [
    { teamIdx: 0, wins: 2, losses: 0, pf: 183, pa: 161 },
    { teamIdx: 2, wins: 2, losses: 1, pf: 276, pa: 267 },
    { teamIdx: 3, wins: 1, losses: 1, pf: 159, pa: 156 },
    { teamIdx: 6, wins: 1, losses: 0, pf: 91, pa: 73 },
    { teamIdx: 4, wins: 1, losses: 1, pf: 182, pa: 171 },
    { teamIdx: 1, wins: 1, losses: 2, pf: 261, pa: 279 },
    { teamIdx: 5, wins: 1, losses: 1, pf: 173, pa: 168 },
    { teamIdx: 7, wins: 0, losses: 1, pf: 73, pa: 91 },
  ];

  let sId = 9; // Start after existing standings
  for (const sd of standingData) {
    const team = teams[sd.teamIdx];
    await prisma.standing.upsert({
      where: { teamId: team.id },
      update: {
        wins: sd.wins,
        losses: sd.losses,
        pointsFor: sd.pf,
        pointsAgainst: sd.pa,
        gamesPlayed: sd.wins + sd.losses,
      },
      create: {
        id: sId++,
        teamId: team.id,
        seasonId: season2.id,
        wins: sd.wins,
        losses: sd.losses,
        pointsFor: sd.pf,
        pointsAgainst: sd.pa,
        gamesPlayed: sd.wins + sd.losses,
      },
    });
  }
  console.log(`✅ Created 8 standings records for Season 2 teams`);

  console.log("\n" + "=".repeat(60));
  console.log("✅ RESTORATION COMPLETE");
  console.log("=".repeat(60));
  console.log("\n📊 Season 2 (U-18/older) Summary:");
  console.log("  • 8 teams added");
  console.log("  • 80 players added");
  console.log("  • 10 games added (6 finished, 4 scheduled)");
  console.log("  • 8 standings records added");
  console.log("\n🌐 You can now view: /?ag=older\n");
}

main()
  .catch(e => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
