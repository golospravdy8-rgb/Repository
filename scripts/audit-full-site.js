const https = require("https");
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://basketball.lviv.ua";
const OUTPUT_FILE = "site-audit-report.json";

const audit = {
  timestamp: new Date().toISOString(),
  site_url: SITE_URL,
  sections: {},
  errors: [],
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function auditSections() {
  console.log("🔍 Сканирование основных API endpoints...\n");

  // Test key endpoints
  const endpoints = [
    { name: "shop-products", url: "/api/shop/products", key: "products" },
    { name: "teams-younger", url: "/api/teams?ageGroup=younger", key: "teams" },
    { name: "teams-older", url: "/api/teams?ageGroup=older", key: "teams" },
    { name: "games", url: "/api/games", key: "games" },
    { name: "news", url: "/api/news", key: "news" },
    { name: "site-settings", url: "/api/site-settings", key: "settings" },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`⏳ ${endpoint.name}...`);
      const data = await fetchJSON(SITE_URL + endpoint.url);

      if (endpoint.key === "products") {
        const byCategory = {};
        data.products?.forEach((p) => {
          if (!byCategory[p.category]) byCategory[p.category] = [];
          byCategory[p.category].push({
            id: p.id,
            name: p.name,
            price: p.price,
            hasImage: !!p.imageUrl,
          });
        });
        audit.sections[endpoint.name] = {
          status: "OK",
          totalItems: data.products?.length || 0,
          byCategory,
        };
        console.log(`   ✅ ${data.products?.length || 0} товаров\n`);
      } else if (endpoint.key === "teams") {
        const teams = data.teams || [];
        audit.sections[endpoint.name] = {
          status: "OK",
          totalTeams: teams.length,
          teams: teams.map((t) => ({
            id: t.id,
            name: t.name,
            shortName: t.shortName,
            hasLogo: !!t.logoUrl,
            playerCount: t.players?.length || 0,
          })),
        };
        console.log(`   ✅ ${teams.length} команд\n`);
      } else if (endpoint.key === "games") {
        const games = data.games || [];
        audit.sections[endpoint.name] = {
          status: "OK",
          totalGames: games.length,
          byStatus: games.reduce((acc, g) => {
            acc[g.status] = (acc[g.status] || 0) + 1;
            return acc;
          }, {}),
        };
        console.log(`   ✅ ${games.length} матчей\n`);
      } else if (endpoint.key === "news") {
        const news = data.news || [];
        audit.sections[endpoint.name] = {
          status: "OK",
          totalNews: news.length,
          published: news.filter((n) => n.isPublished).length,
        };
        console.log(`   ✅ ${news.length} новостей\n`);
      } else if (endpoint.key === "settings") {
        const settings = data.settings || {};
        audit.sections[endpoint.name] = {
          status: "OK",
          totalSettings: Object.keys(settings).length,
          settingKeys: Object.keys(settings).slice(0, 20),
        };
        console.log(`   ✅ ${Object.keys(settings).length} настроек\n`);
      }
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}\n`);
      audit.errors.push({
        endpoint: endpoint.name,
        error: error.message,
      });
      audit.sections[endpoint.name] = { status: "ERROR", error: error.message };
    }
  }
}

async function main() {
  console.log("═".repeat(70));
  console.log("🏀 ПОЛНЫЙ АУДИТ САЙТА basketball.lviv.ua");
  console.log("═".repeat(70) + "\n");

  try {
    await auditSections();

    // Save report
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(audit, null, 2));
    console.log(`\n✅ Отчёт сохранён: ${OUTPUT_FILE}`);
    console.log(JSON.stringify(audit, null, 2));
  } catch (error) {
    console.error("❌ Критическая ошибка:", error);
    process.exit(1);
  }
}

main();
