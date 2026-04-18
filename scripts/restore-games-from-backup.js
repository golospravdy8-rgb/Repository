const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Восстановление 9+ МАТЧЕЙ из бэкапа...\n");

  // Load backup
  console.log("⏳ Загрузка бэкапа...");
  const backup = JSON.parse(fs.readFileSync("SUPER_FULL_BACKUP.json", "utf8"));
  const backupGames = backup.data?.games || [];

  console.log(`✅ Загружено: ${backupGames.length} матчей из бэкапа\n`);

  // Get current games and teams
  console.log("⏳ Получение матчей и команд из БД...");
  const liveGames = await prisma.game.findMany();
  const teams = await prisma.team.findMany();
  const teamMap = Object.fromEntries(teams.map((t) => [t.name, t.id]));

  console.log(`✅ На сайте уже ${liveGames.length} матчей`);
  console.log(`✅ Всего команд: ${teams.length}\n`);

  // Find games that are in backup but not on live site
  const gameDates = new Set(
    liveGames.map((g) => `${g.homeTeamId}-${g.awayTeamId}-${g.scheduledAt.toISOString().split("T")[0]}`)
  );

  const gamesToInsert = backupGames
    .filter((g) => {
      // Teams should exist via IDs already
      const homeId = g.homeTeamId;
      const awayId = g.awayTeamId;

      if (!homeId || !awayId) {
        console.warn(`⚠️  Пропуск матча: команды не найдены (IDs: ${homeId} vs ${awayId})`);
        return false;
      }

      // Check if game already exists
      const dateStr = new Date(g.scheduledAt).toISOString().split("T")[0];
      const gameKey = `${homeId}-${awayId}-${dateStr}`;

      if (gameDates.has(gameKey)) {
        const home = teams.find(t => t.id === homeId);
        const away = teams.find(t => t.id === awayId);
        console.log(`ℹ️  Матч уже существует: ${home?.name} vs ${away?.name}`);
        return false;
      }

      return true;
    })
    .map((g) => ({
      seasonId: g.seasonId || 1,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      scheduledAt: new Date(g.scheduledAt),
      status: g.status || "SCHEDULED",
      quarter: g.quarter || 1,
      homeScore: g.homeScore || 0,
      awayScore: g.awayScore || 0,
    }));

  console.log(`📋 К восстановлению: ${gamesToInsert.length} матчей\n`);

  if (gamesToInsert.length === 0) {
    console.log("ℹ️  Нет новых матчей для восстановления (все уже на сайте)");
    process.exit(0);
  }

  // Insert games
  let inserted = 0;
  let failed = 0;

  for (const game of gamesToInsert) {
    try {
      const created = await prisma.game.create({
        data: game,
      });

      const homeTeam = teams.find((t) => t.id === created.homeTeamId);
      const awayTeam = teams.find((t) => t.id === created.awayTeamId);

      inserted++;
      console.log(
        `✅ ${homeTeam?.name} ${created.homeScore} : ${created.awayScore} ${awayTeam?.name}`
      );
    } catch (error) {
      console.error(`❌ Ошибка при вставке матча: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n═`.repeat(35));
  console.log(`✅ Восстановление завершено!`);
  console.log(`═`.repeat(35));
  console.log(`✅ Успешно вставлено: ${inserted}`);
  console.log(`❌ Ошибок: ${failed}`);

  // Verify
  const totalGamesNow = await prisma.game.count();
  console.log(`\n📊 Матчей в БД после восстановления: ${totalGamesNow}\n`);

  // Show games
  const allGames = await prisma.game.findMany({
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10,
  });

  console.log("📊 ПОСЛЕДНИЕ 10 МАТЧЕЙ:\n");
  allGames.forEach((g) => {
    const date = new Date(g.scheduledAt).toLocaleString("uk-UA");
    console.log(`${g.homeTeam.name} ${g.homeScore} : ${g.awayScore} ${g.awayTeam.name}`);
    console.log(`  Дата: ${date} | Статус: ${g.status}`);
  });

  console.log(`\n✨ Готово!`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Критическая ошибка:", e.message);
  process.exit(1);
});
