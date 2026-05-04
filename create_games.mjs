import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// U-14 команди
const u14Teams = {
  groupA: [
    { id: 3, name: "Степові Бізони Школа № 17" },
    { id: 1, name: "Індійські Леопарди Ліцей № 81" },
    { id: 2, name: "Димчасті Леопарди Школа № 91" },
    { id: 5, name: "Mighty Ducks Ліцей № 81" }
  ]
};

// U-16 команди
const u16Teams = {
  groupA: [
    { id: 6, name: "Ведмеді Ліцей № 17" },
    { id: 9, name: "Wild Cats Школа № 30" },
    { id: 10, name: "Street Kings Школа № 91" },
    { id: 11, name: "Dream Team Школа № 7" }
  ]
};

// Дати субот (UTC)
const saturdays = [
  new Date('2026-05-10T07:00:00Z'),
  new Date('2026-05-10T09:00:00Z'),
  new Date('2026-05-17T07:00:00Z'),
  new Date('2026-05-17T09:00:00Z'),
  new Date('2026-05-24T07:00:00Z'),
  new Date('2026-05-24T09:00:00Z'),
  new Date('2026-05-31T07:00:00Z'),
  new Date('2026-05-31T09:00:00Z'),
  new Date('2026-06-07T07:00:00Z'),
  new Date('2026-06-07T09:00:00Z'),
  new Date('2026-06-14T07:00:00Z'),
  new Date('2026-06-14T09:00:00Z'),
];

async function main() {
  let gameIndex = 0;

  console.log("=== U-14 ІГРИ ===");
  
  const u14Matches = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3],
    [2, 3]
  ];

  for (const [i, j] of u14Matches) {
    if (gameIndex >= saturdays.length) break;
    const game = await p.game.create({
      data: {
        seasonId: 1,
        homeTeamId: u14Teams.groupA[i].id,
        awayTeamId: u14Teams.groupA[j].id,
        tourId: 2,
        scheduledAt: saturdays[gameIndex],
        status: "SCHEDULED",
        stage: "group"
      }
    });
    console.log(`✅ Гра ${gameIndex + 1}: ${u14Teams.groupA[i].name} vs ${u14Teams.groupA[j].name}`);
    gameIndex++;
  }

  console.log("\n=== U-16 ІГРИ ===");
  
  const u16Matches = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3],
    [2, 3]
  ];

  for (const [i, j] of u16Matches) {
    if (gameIndex >= saturdays.length) break;
    const game = await p.game.create({
      data: {
        seasonId: 2,
        homeTeamId: u16Teams.groupA[i].id,
        awayTeamId: u16Teams.groupA[j].id,
        tourId: null,
        scheduledAt: saturdays[gameIndex],
        status: "SCHEDULED",
        stage: "group"
      }
    });
    console.log(`✅ Гра ${gameIndex + 1}: ${u16Teams.groupA[i].name} vs ${u16Teams.groupA[j].name}`);
    gameIndex++;
  }

  console.log(`\n✅ Всього створено ${gameIndex} ігор`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
