import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.siteSettings.findMany({
    where: { key: { in: ["home.showLive", "home.showStandings", "home.showNews", "stream.showOnHome"] } },
  });

  console.log("\n=== Homepage Visibility Settings ===\n");
  settings.sort((a, b) => a.key.localeCompare(b.key));
  settings.forEach(s => {
    const status = s.value === "true" ? "✓ ENABLED" : "✗ DISABLED";
    console.log(`${s.key.padEnd(25)} = ${s.value.padEnd(8)} [${status}]`);
  });
  console.log("\n");

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
