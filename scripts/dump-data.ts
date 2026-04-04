import { prisma } from "@/lib/prisma";

async function main() {
  const data = {
    seasons: await prisma.season.findMany({ include: { teams: true } }),
    teams: await prisma.team.findMany({ include: { players: true } }),
    players: await prisma.player.findMany(),
    games: await prisma.game.findMany({ include: { homeTeam: true, awayTeam: true } }),
    standings: await prisma.standing.findMany({ include: { team: true } }),
    news: await prisma.news.findMany(),
    videos: await prisma.video.findMany(),
    settings: await prisma.siteSettings.findMany(),
    shop: await prisma.shopProduct.findMany(),
    marketplace: await prisma.marketplaceListing.findMany(),
  };
  console.log(JSON.stringify(data, null, 2));
}

main().catch(e => console.error(e)).finally(() => process.exit());
