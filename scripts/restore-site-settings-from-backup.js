const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Восстановление 82 НАСТРОЕК САЙТА из бэкапа...\n");

  // Load backup
  console.log("⏳ Загрузка бэкапа...");
  const backup = JSON.parse(fs.readFileSync("SUPER_FULL_BACKUP.json", "utf8"));
  const backupSettingsObj = backup.data?.site_settings || {};

  // Convert object to array
  const backupSettings = Object.entries(backupSettingsObj).map(([key, value]) => ({ key, value }));

  console.log(`✅ Загружено: ${backupSettings.length} настроек из бэкапа\n`);

  if (backupSettings.length === 0) {
    console.log("❌ В бэкапе нет настроек!");
    process.exit(1);
  }

  // Get current settings
  console.log("⏳ Получение текущих настроек из БД...");
  const liveSettings = await prisma.siteSettings.findMany();
  const liveSettingKeys = new Set(liveSettings.map((s) => s.key));

  console.log(`✅ На сайте уже ${liveSettings.length} настроек\n`);

  // Filter settings to insert (skip existing keys)
  const settingsToInsert = backupSettings.filter((s) => {
    if (liveSettingKeys.has(s.key)) {
      console.log(`ℹ️  Пропуск (уже существует): ${s.key}`);
      return false;
    }
    return true;
  });

  console.log(`📋 К восстановлению: ${settingsToInsert.length} настроек (${backupSettings.length - settingsToInsert.length} уже на сайте)\n`);

  if (settingsToInsert.length === 0) {
    console.log("ℹ️  Все настройки уже на сайте");
    process.exit(0);
  }

  // Show settings to be inserted
  console.log("📋 ПРИМЕРЫ ВОССТАНАВЛИВАЕМЫХ НАСТРОЕК:\n");
  settingsToInsert.slice(0, 10).forEach((s) => {
    const value = String(s.value).substring(0, 60);
    console.log(`  ${s.key}: ${value}${s.value.length > 60 ? "..." : ""}`);
  });
  console.log();

  // Insert settings in batches
  const batchSize = 10;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < settingsToInsert.length; i += batchSize) {
    const batch = settingsToInsert.slice(i, i + batchSize);

    try {
      const result = await prisma.siteSettings.createMany({
        data: batch,
        skipDuplicates: true,
      });

      inserted += result.count;
      console.log(`✅ Вставлено: ${result.count} настроек (всего: ${inserted}/${settingsToInsert.length})`);
    } catch (error) {
      console.error(`❌ Ошибка при вставке: ${error.message}`);
      failed += batch.length;
    }
  }

  console.log(`\n═`.repeat(35));
  console.log(`✅ Восстановление завершено!`);
  console.log(`═`.repeat(35));
  console.log(`✅ Успешно вставлено: ${inserted}`);
  console.log(`❌ Ошибок: ${failed}`);

  // Verify
  const totalSettingsNow = await prisma.siteSettings.count();
  console.log(`\n📊 Настроек в БД после восстановления: ${totalSettingsNow}\n`);

  // Show all settings keys
  const allSettings = await prisma.siteSettings.findMany({
    select: { key: true, value: true },
  });

  console.log("📋 ВСЕ НАСТРОЙКИ:\n");
  allSettings.forEach((s) => {
    const value = String(s.value).substring(0, 50);
    console.log(`  ${s.key}: ${value}${s.value.length > 50 ? "..." : ""}`);
  });

  console.log(`\n✨ Готово! Восстановлено ${totalSettingsNow} настроек.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Критическая ошибка:", e.message);
  process.exit(1);
});
