const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const [seasons, teams, players, games, standings, news, siteSettings, videos, reviews] = await Promise.all([
    prisma.season.findMany(),
    prisma.team.findMany(),
    prisma.player.findMany(),
    prisma.game.findMany({ include: { homeTeam: { select: { name: true, shortName: true } }, awayTeam: { select: { name: true, shortName: true } } } }),
    prisma.standing.findMany(),
    prisma.news.findMany(),
    prisma.siteSettings.findMany(),
    prisma.video.findMany().catch(() => []),
    prisma.review.findMany().catch(() => []),
  ]);

  const backup = {
    createdAt: new Date().toISOString(),
    site: "basket-lviv",
    url: "http://localhost:3006",
    data: {
      seasons,
      teams,
      players,
      games,
      standings,
      news,
      siteSettings,
      videos,
      reviews,
    },
  };

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(__dirname, "..", `backup_basket-lviv_${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`Backup saved: ${outPath}`);
  console.log(`  seasons:      ${seasons.length}`);
  console.log(`  teams:        ${teams.length}`);
  console.log(`  players:      ${players.length}`);
  console.log(`  games:        ${games.length}`);
  console.log(`  standings:    ${standings.length}`);
  console.log(`  news:         ${news.length}`);
  console.log(`  siteSettings: ${siteSettings.length}`);
  console.log(`  videos:       ${videos.length}`);
  console.log(`  reviews:      ${reviews.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
