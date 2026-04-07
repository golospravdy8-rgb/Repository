import { PrismaClient, type Team } from "@prisma/client";

const GameStatus = { SCHEDULED: "SCHEDULED", LIVE: "LIVE", FINAL: "FINAL" } as const;
type GameStatusType = typeof GameStatus[keyof typeof GameStatus];
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "admin123", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@basket.lviv.ua" },
    update: {},
    create: {
      email: "admin@basket.lviv.ua",
      password: hashedPassword,
      name: "Адміністратор",
    },
  });

  // Season
  const season = await prisma.season.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "2025-2026", isActive: true },
  });

  // Teams (реальні команди ліги Львів)
  const teamData = [
    { name: "Шахтар Червоноград", shortName: "ШЧ" },
    { name: "Віта Агро", shortName: "ВА" },
    { name: "Металург", shortName: "МТ" },
    { name: "Сокіл", shortName: "СК" },
    { name: "Динамо Львів", shortName: "ДЛ" },
    { name: "Галичина", shortName: "ГЛ" },
    { name: "Карпати", shortName: "КП" },
    { name: "Буревісник", shortName: "БВ" },
  ];

  const teams: Team[] = [];
  for (let i = 0; i < teamData.length; i++) {
    const t = teamData[i];
    const team = await prisma.team.upsert({
      where: { id: i + 1 },
      update: {},
      create: { id: i + 1, name: t.name, shortName: t.shortName, seasonId: season.id },
    });
    teams.push(team);
  }

  // Players per team
  const playerTemplates = [
    [
      { number: 4, firstName: "Дмитро", lastName: "Шевченко", position: "PG" },
      { number: 7, firstName: "Олексій", lastName: "Коваль", position: "SG" },
      { number: 11, firstName: "Іван", lastName: "Петренко", position: "SF" },
      { number: 15, firstName: "Михайло", lastName: "Бойко", position: "PF" },
      { number: 23, firstName: "Василь", lastName: "Гриценко", position: "C" },
      { number: 8, firstName: "Андрій", lastName: "Мороз", position: "SG" },
      { number: 14, firstName: "Сергій", lastName: "Лисенко", position: "SF" },
      { number: 21, firstName: "Олег", lastName: "Тимченко", position: "PF" },
      { number: 33, firstName: "Юрій", lastName: "Кравченко", position: "C" },
      { number: 6, firstName: "Роман", lastName: "Захаренко", position: "PG" },
    ],
    [
      { number: 5, firstName: "Тарас", lastName: "Іваненко", position: "PG" },
      { number: 9, firstName: "Богдан", lastName: "Романенко", position: "SG" },
      { number: 12, firstName: "Максим", lastName: "Сидоренко", position: "SF" },
      { number: 17, firstName: "Євген", lastName: "Поліщук", position: "PF" },
      { number: 25, firstName: "Олександр", lastName: "Ткаченко", position: "C" },
      { number: 3, firstName: "Владислав", lastName: "Онищенко", position: "PG" },
      { number: 16, firstName: "Денис", lastName: "Мельник", position: "SF" },
      { number: 22, firstName: "Артем", lastName: "Голуб", position: "PF" },
      { number: 31, firstName: "Ігор", lastName: "Василенко", position: "C" },
      { number: 10, firstName: "Назар", lastName: "Гончаренко", position: "SG" },
    ],
  ];

  const allPlayers: { id: number; teamId: number }[] = [];
  let playerId = 1;
  for (let ti = 0; ti < teams.length; ti++) {
    const template = playerTemplates[ti % 2];
    for (const pData of template) {
      const player = await prisma.player.upsert({
        where: { id: playerId },
        update: {},
        create: { id: playerId, ...pData, teamId: teams[ti].id },
      });
      allPlayers.push({ id: player.id, teamId: teams[ti].id });
      playerId++;
    }
  }

  // Games — 6 played + 4 scheduled
  const gameDate = (daysAgo: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const gamesData = [
    { home: 0, away: 1, status: GameStatus.FINAL, homeScore: 78, awayScore: 65, date: gameDate(21, 18) },
    { home: 2, away: 3, status: GameStatus.FINAL, homeScore: 82, awayScore: 74, date: gameDate(21, 20) },
    { home: 4, away: 5, status: GameStatus.FINAL, homeScore: 69, awayScore: 71, date: gameDate(14, 18) },
    { home: 6, away: 7, status: GameStatus.FINAL, homeScore: 88, awayScore: 55, date: gameDate(14, 20) },
    { home: 1, away: 2, status: GameStatus.FINAL, homeScore: 61, awayScore: 77, date: gameDate(7, 18) },
    { home: 3, away: 4, status: GameStatus.FINAL, homeScore: 73, awayScore: 68, date: gameDate(7, 20) },
    { home: 0, away: 2, status: GameStatus.SCHEDULED, homeScore: 0, awayScore: 0, date: gameDate(-7, 18) },
    { home: 1, away: 3, status: GameStatus.SCHEDULED, homeScore: 0, awayScore: 0, date: gameDate(-7, 20) },
    { home: 4, away: 6, status: GameStatus.SCHEDULED, homeScore: 0, awayScore: 0, date: gameDate(-14, 18) },
    { home: 5, away: 7, status: GameStatus.SCHEDULED, homeScore: 0, awayScore: 0, date: gameDate(-14, 20) },
  ];

  const createdGames = [];
  for (let i = 0; i < gamesData.length; i++) {
    const g = gamesData[i];
    const game = await prisma.game.upsert({
      where: { id: i + 1 },
      update: {
        status: g.status,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
      },
      create: {
        id: i + 1,
        seasonId: season.id,
        homeTeamId: teams[g.home].id,
        awayTeamId: teams[g.away].id,
        scheduledAt: g.date,
        status: g.status,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        quarter: g.status === GameStatus.FINAL ? 4 : 1,
      },
    });
    createdGames.push({ ...game, homeIdx: g.home, awayIdx: g.away });
  }

  // Box scores for completed games
  const finishedGames = createdGames.filter((g) => g.status === GameStatus.FINAL);

  let bsId = 1;
  for (const game of finishedGames) {
    const homePlayers = allPlayers
      .filter((p) => p.teamId === teams[game.homeIdx].id)
      .slice(0, 8);
    const awayPlayers = allPlayers
      .filter((p) => p.teamId === teams[game.awayIdx].id)
      .slice(0, 8);

    const playerScores = (pList: typeof allPlayers, totalPts: number) => {
      const scores = pList.map(() => 0);
      let remaining = totalPts;
      for (let i = 0; i < remaining; i++) {
        scores[Math.floor(Math.random() * scores.length)] += 1;
      }
      return scores;
    };

    const homeScores = playerScores(homePlayers, game.homeScore);
    const awayScores = playerScores(awayPlayers, game.awayScore);

    for (let i = 0; i < homePlayers.length; i++) {
      await prisma.boxScore.upsert({
        where: { id: bsId },
        update: {},
        create: {
          id: bsId++,
          gameId: game.id,
          playerId: homePlayers[i].id,
          teamId: homePlayers[i].teamId,
          points: homeScores[i],
          rebounds: Math.floor(Math.random() * 10),
          assists: Math.floor(Math.random() * 8),
          steals: Math.floor(Math.random() * 4),
          blocks: Math.floor(Math.random() * 3),
          fouls: Math.floor(Math.random() * 5),
        },
      });
    }

    for (let i = 0; i < awayPlayers.length; i++) {
      await prisma.boxScore.upsert({
        where: { id: bsId },
        update: {},
        create: {
          id: bsId++,
          gameId: game.id,
          playerId: awayPlayers[i].id,
          teamId: awayPlayers[i].teamId,
          points: awayScores[i],
          rebounds: Math.floor(Math.random() * 10),
          assists: Math.floor(Math.random() * 8),
          steals: Math.floor(Math.random() * 4),
          blocks: Math.floor(Math.random() * 3),
          fouls: Math.floor(Math.random() * 5),
        },
      });
    }
  }

  // Standings
  const standingData = [
    { teamIdx: 0, wins: 2, losses: 0, pf: 156, pa: 130 },
    { teamIdx: 2, wins: 2, losses: 1, pf: 220, pa: 202 },
    { teamIdx: 3, wins: 1, losses: 1, pf: 141, pa: 135 },
    { teamIdx: 6, wins: 1, losses: 0, pf: 88, pa: 55 },
    { teamIdx: 4, wins: 1, losses: 1, pf: 137, pa: 141 },
    { teamIdx: 1, wins: 1, losses: 2, pf: 203, pa: 217 },
    { teamIdx: 5, wins: 1, losses: 1, pf: 140, pa: 138 },
    { teamIdx: 7, wins: 0, losses: 1, pf: 55, pa: 88 },
  ];

  let sId = 1;
  for (const sd of standingData) {
    await prisma.standing.upsert({
      where: { teamId: teams[sd.teamIdx].id },
      update: {
        wins: sd.wins,
        losses: sd.losses,
        pointsFor: sd.pf,
        pointsAgainst: sd.pa,
        gamesPlayed: sd.wins + sd.losses,
      },
      create: {
        id: sId++,
        teamId: teams[sd.teamIdx].id,
        seasonId: season.id,
        wins: sd.wins,
        losses: sd.losses,
        pointsFor: sd.pf,
        pointsAgainst: sd.pa,
        gamesPlayed: sd.wins + sd.losses,
      },
    });
  }

  // News
  const newsItems = [
    {
      title: "Відкриття сезону 2025-2026 Ліги ESCULAB",
      slug: "vidkryttia-sezonu-2025-2026",
      content:
        "Ліга ESCULAB офіційно розпочала новий сезон 2025-2026. Цього року в змаганнях візьмуть участь 8 команд з Львівщини. Перші матчі пройшли на високому рівні та зібрали численних уболівальників.",
      imageUrl: null,
      isPublished: true,
    },
    {
      title: "Шахтар Червоноград відкрив сезон двома перемогами",
      slug: "shakhtar-dvi-peremohy",
      content:
        "Команда Шахтар Червоноград вийшла в лідери таблиці після двох перемог поспіль. Найкращим гравцем матчів визнано нападника Дмитра Шевченка, який набирає в середньому 18 очок за гру.",
      imageUrl: null,
      isPublished: true,
    },
    {
      title: "Розклад матчів другого туру",
      slug: "rozklad-druhoho-turu",
      content:
        "Оприлюднено розклад матчів другого туру Ліги ESCULAB. Усі ігри відбудуться на Спортивному комплексі Львова. Початок матчів о 18:00 та 20:00.",
      imageUrl: null,
      isPublished: true,
    },
  ];

  for (const news of newsItems) {
    await prisma.news.upsert({
      where: { slug: news.slug },
      update: {},
      create: news,
    });
  }

  // Default SiteSettings
  const defaultSettings = [
    { key: "site.name", value: "Ліга ESCULAB" },
    { key: "site.shortName", value: "ESCULAB" },
    { key: "site.tagline", value: "Баскетбол Львів" },
    { key: "site.description", value: "Офіційний сайт баскетбольної ліги ESCULAB у Львові. Розклад матчів, таблиця, лідери сезону." },
    { key: "site.season", value: "2025-2026" },
    { key: "site.logoText", value: "БЛ" },
    { key: "contact.address", value: "м. Львів, вул. Спортивна" },
    { key: "contact.email", value: "info@basket.lviv.ua" },
    { key: "contact.website", value: "basket.lviv.ua" },
    { key: "contact.websiteUrl", value: "https://basket.lviv.ua" },
    { key: "contact.phone", value: "" },
    { key: "social.facebook", value: "#" },
    { key: "social.instagram", value: "#" },
    { key: "social.youtube", value: "#" },
    { key: "social.telegram", value: "" },
    { key: "hero.badge", value: "Сезон 2025-2026" },
    { key: "hero.title", value: "ЛІГА ESCULAB" },
    { key: "hero.subtitle", value: "Офіційний сайт баскетбольної ліги Львова. Матчі, статистика та новини." },
    { key: "hero.ctaPrimary", value: "Переглянути розклад" },
    { key: "hero.ctaSecondary", value: "Таблиця змагань" },
    { key: "footer.about", value: "Баскетбольна ліга Львова. Сезон 2025-2026." },
    { key: "footer.copyright", value: "Ліга ESCULAB. Усі права захищено." },
    { key: "colors.navy", value: "#1a2744" },
    { key: "colors.orange", value: "#f97316" },
    { key: "colors.blue", value: "#3b82f6" },
    { key: "colors.red", value: "#ef4444" },
    { key: "colors.bg", value: "#f1f5f9" },
    { key: "header.height", value: "64" },
    { key: "header.fontSizeNav", value: "14" },
    { key: "header.activeStyle", value: "underline" },
    { key: "header.logoPosition", value: "left" },
    { key: "nav.items", value: JSON.stringify([
      { href: "/news", label: "Новини", visible: true },
      { href: "/schedule", label: "Розклад", visible: true },
      { href: "/standings", label: "Змагання", visible: true },
      { href: "/leaders", label: "Лідери", visible: true },
      { href: "/teams", label: "Команди", visible: true },
      { href: "/players", label: "Гравці", visible: true },
      { href: "/contacts", label: "Контакти", visible: true },
    ]) },
    { key: "footer.col1.visible", value: "true" },
    { key: "footer.col2.visible", value: "true" },
    { key: "footer.col3.visible", value: "true" },
    { key: "footer.textColor", value: "#9ca3af" },
    { key: "home.showLive", value: "true" },
    { key: "home.showStandings", value: "true" },
    { key: "home.showNews", value: "true" },
    { key: "home.showHonorRoll", value: "true" },
    { key: "home.showVideos", value: "true" },
    { key: "home.liveLimit", value: "4" },
    { key: "home.standingsLimit", value: "6" },
    { key: "home.newsLimit", value: "3" },
    { key: "home.liveTitle", value: "Найближчі матчі" },
    { key: "home.standingsTitle", value: "Таблиця сезону" },
    { key: "home.newsTitle", value: "Останні новини" },
    { key: "home.honorRollTitle", value: "🏅 Дошка пошани — Гравці місяця" },
    { key: "home.videosTitle", value: "Відео матчів" },
    { key: "stream.enabled", value: "true" },
    { key: "stream.showOnHome", value: "true" },
    { key: "stream.title", value: "Прямий ефір" },
    { key: "stream.description", value: "Дивіться матчі в прямому ефірі" },
    { key: "stream.youtubeChannelId", value: "" },
    { key: "stream.pollIntervalSeconds", value: "30" },
    { key: "stream.countdownThresholdMinutes", value: "60" },
    { key: "images.logo", value: "" },
    { key: "images.ogImage", value: "" },
    { key: "images.heroBg", value: "" },
    { key: "images.headerBg", value: "" },
    { key: "images.footerBg", value: "" },
    { key: "images.pageBg", value: "" },
  ];

  for (const setting of defaultSettings) {
    await prisma.siteSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
