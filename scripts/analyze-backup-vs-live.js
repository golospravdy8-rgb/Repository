const fs = require("fs");
const path = require("path");

console.log("📊 Анализ SUPER_FULL_BACKUP.json vs живой сайт...\n");

// Load backup
console.log("⏳ Загрузка бэкапа (9MB)...");
const backup = JSON.parse(fs.readFileSync("SUPER_FULL_BACKUP.json", "utf8"));
console.log("✅ Бэкап загружен\n");

// Load live audit
console.log("⏳ Загрузка аудита живого сайта...");
const liveAudit = JSON.parse(fs.readFileSync("site-audit-report.json", "utf8"));
console.log("✅ Аудит загружен\n");

// Analysis report
const report = {
  timestamp: new Date().toISOString(),
  comparison: {},
};

// === SECTION 1: DATABASE BACKUP ===
console.log("═".repeat(70));
console.log("1️⃣  DATABASE BACKUP ANALYSIS");
console.log("═".repeat(70) + "\n");

if (backup.data_export && backup.data_export.database) {
  const db = backup.data_export.database;
  const dbAnalysis = {};

  Object.keys(db).forEach((table) => {
    const records = db[table];
    const count = Array.isArray(records) ? records.length : Object.keys(records).length;
    dbAnalysis[table] = { count, sampleKeys: Object.keys(records).slice(0, 3) };
    console.log(`📊 ${table}: ${count} записей`);
  });

  report.comparison.database_backup = dbAnalysis;
  console.log();
}

// === SECTION 2: TEAMS COMPARISON ===
console.log("═".repeat(70));
console.log("2️⃣  TEAMS & PLAYERS COMPARISON");
console.log("═".repeat(70) + "\n");

const backupTeams = backup.data_export?.database?.teams || [];
const liveTeams = liveAudit.sections["teams-younger"]?.teams || [];

console.log(`📦 В бэкапе команд: ${backupTeams.length}`);
console.log(`📦 На сайте команд: ${liveTeams.length}\n`);

// Team names comparison
const backupTeamNames = new Set(backupTeams.map((t) => t.name));
const liveTeamNames = new Set(liveTeams.map((t) => t.name));

const missingTeams = Array.from(backupTeamNames).filter((name) => !liveTeamNames.has(name));
console.log(`❌ Отсутствует на сайте (${missingTeams.length}):`);
missingTeams.forEach((name) => console.log(`   - ${name}`));

console.log();

// === SECTION 3: PLAYERS ===
console.log("═".repeat(70));
console.log("3️⃣  PLAYERS ANALYSIS");
console.log("═".repeat(70) + "\n");

const backupPlayers = backup.data_export?.database?.players || [];
console.log(`📊 В бэкапе игроков: ${backupPlayers.length}`);
console.log(`📊 На сайте игроков: ${liveTeams.reduce((sum, t) => sum + (t.playerCount || 0), 0)}`);
console.log(`❌ ОТСУТСТВУЮТ ВСЕ ИГРОКИ (0 на сайте, ${backupPlayers.length} в бэкапе)\n`);

// === SECTION 4: GAMES & MATCHES ===
console.log("═".repeat(70));
console.log("4️⃣  GAMES & MATCHES");
console.log("═".repeat(70) + "\n");

const backupGames = backup.data_export?.database?.games || [];
const liveGames = liveAudit.sections.games?.totalGames || 0;

console.log(`📊 В бэкапе матчей: ${backupGames.length}`);
console.log(`📊 На сайте матчей: ${liveGames}`);

const missingGamesCount = backupGames.length - liveGames;
console.log(`❌ Отсутствует: ${missingGamesCount} матчей\n`);

// === SECTION 5: NEWS ===
console.log("═".repeat(70));
console.log("5️⃣  NEWS & ARTICLES");
console.log("═".repeat(70) + "\n");

const backupNews = backup.data_export?.database?.news || [];
const liveNews = liveAudit.sections.news?.totalNews || 0;

console.log(`📊 В бэкапе новостей: ${backupNews.length}`);
console.log(`📊 На сайте новостей: ${liveNews}`);
console.log(`❌ Отсутствует: ${backupNews.length - liveNews} новостей\n`);

// === SECTION 6: SHOP PRODUCTS ===
console.log("═".repeat(70));
console.log("6️⃣  SHOP PRODUCTS");
console.log("═".repeat(70) + "\n");

const backupProducts = backup.data_export?.database?.shopproducts || backup.data_export?.database?.ShopProduct || [];
const liveProducts = liveAudit.sections["shop-products"]?.totalItems || 0;

console.log(`📊 В бэкапе товаров: ${backupProducts.length}`);
console.log(`📊 На сайте товаров: ${liveProducts}`);

// By category
if (liveAudit.sections["shop-products"]?.byCategory) {
  console.log("\n📂 По категориям на сайте:");
  Object.entries(liveAudit.sections["shop-products"].byCategory).forEach(([cat, items]) => {
    console.log(`   ${cat}: ${items.length}`);
  });
}

console.log();

// === SECTION 7: MEDIA FILES ===
console.log("═".repeat(70));
console.log("7️⃣  MEDIA FILES (Vercel Blob)");
console.log("═".repeat(70) + "\n");

const blobFiles = backup.media_registry?.blob_store || [];
console.log(`📸 Всего файлов в Blob: ${blobFiles.length}\n`);

const mediaByType = {};
blobFiles.forEach((file) => {
  const type = file.split("/")[0];
  mediaByType[type] = (mediaByType[type] || 0) + 1;
});

Object.entries(mediaByType).forEach(([type, count]) => {
  console.log(`   ${type}: ${count} файлов`);
});

console.log();

// === SECTION 8: SITE SETTINGS ===
console.log("═".repeat(70));
console.log("8️⃣  SITE SETTINGS");
console.log("═".repeat(70) + "\n");

const backupSettings = backup.data_export?.database?.sitesettings || [];
const liveSettings = liveAudit.sections["site-settings"]?.totalSettings || 0;

console.log(`📊 В бэкапе настроек: ${backupSettings.length}`);
console.log(`📊 На сайте настроек: ${liveSettings}`);
console.log(`❌ Отсутствует: ${backupSettings.length - liveSettings} настроек\n`);

// === FINAL SUMMARY ===
console.log("═".repeat(70));
console.log("📋 ИТОГОВАЯ СВОДКА НЕДОСТАЮЩЕГО КОНТЕНТА");
console.log("═".repeat(70) + "\n");

const summary = {
  missing: {
    teams: missingTeams.length,
    players: backupPlayers.length,
    games: backupGames.length - liveGames,
    news: backupNews.length - liveNews,
    products: backupProducts.length - liveProducts,
    settings: backupSettings.length - liveSettings,
  },
  total_missing: 0,
};

summary.total_missing = Object.values(summary.missing).reduce((a, b) => a + b, 0);

console.log(`❌ Команды: ${summary.missing.teams}`);
console.log(`❌ Игроки: ${summary.missing.players}`);
console.log(`❌ Матчи: ${summary.missing.games}`);
console.log(`❌ Новости: ${summary.missing.news}`);
console.log(`❌ Товары: ${summary.missing.products}`);
console.log(`❌ Настройки: ${summary.missing.settings}`);
console.log(`\n🔴 ВСЕГО НЕДОСТАЁТ: ${summary.total_missing} элементов\n`);

// Save report
fs.writeFileSync("backup-vs-live-analysis.json", JSON.stringify({ report, summary }, null, 2));
console.log("✅ Отчёт сохранён: backup-vs-live-analysis.json");
