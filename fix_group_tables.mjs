import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // U-14 (younger)
  await p.groupTables.upsert({
    where: { ageGroup: "younger" },
    update: {
      groupA: [
        "Бізони Школа № 17",
        "Індійські Леопарди Ліцей № 81",
        "Димчасті Леопарди Школа № 91",
        "Ліцей імені Полюя"
      ],
      groupB: [
        "СБК Львів",
        "Ківс Франциско",
        "Ліцей Львівський",
        "Ліцей № 81",
        "Коали Школа № 7"
      ]
    },
    create: {
      ageGroup: "younger",
      groupA: [
        "Бізони Школа № 17",
        "Індійські Леопарди Ліцей № 81",
        "Димчасті Леопарди Школа № 91",
        "Ліцей імені Полюя"
      ],
      groupB: [
        "СБК Львів",
        "Ківс Франциско",
        "Ліцей Львівський",
        "Ліцей № 81",
        "Коали Школа № 7"
      ]
    }
  });
  console.log("✅ U-14 GroupTables збережено");

  // U-16 (older)
  await p.groupTables.upsert({
    where: { ageGroup: "older" },
    update: {
      groupA: [
        "Ведмеді Ліцей № 17",
        "Wild Cats Школа № 30",
        "Street Kings Школа № 91",
        "Dream Team Школа № 7"
      ],
      groupB: [
        "СБК Львів",
        "Golden Eagles Ліцей № 81",
        "Ліцей Львівський",
        "Black Hawks Ліцей № 81"
      ]
    },
    create: {
      ageGroup: "older",
      groupA: [
        "Ведмеді Ліцей № 17",
        "Wild Cats Школа № 30",
        "Street Kings Школа № 91",
        "Dream Team Школа № 7"
      ],
      groupB: [
        "СБК Львів",
        "Golden Eagles Ліцей № 81",
        "Ліцей Львівський",
        "Black Hawks Ліцей № 81"
      ]
    }
  });
  console.log("✅ U-16 GroupTables збережено");

  // Перевір що збереглось
  const result = await p.groupTables.findMany();
  console.log("=== РЕЗУЛЬТАТ ===");
  console.log(JSON.stringify(result, null, 2));

  await p.$disconnect();
}
main();
