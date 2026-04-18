const https = require("https");
const fs = require("fs");
const path = require("path");

const ballImages = [
  {
    name: "meteor-cellular.jpg",
    urls: [
      "https://sportmaydan.com.ua/m-yach-basketbolnyj-meteor-cellular-7-korychnevyj-kremovyj",
    ],
  },
  {
    name: "nike-playground-8p-graphic.jpg",
    urls: [
      "https://sportmaydan.com.ua/index.php?route=product/product&product_id=20483",
    ],
  },
  {
    name: "nike-playground-8p.jpg",
    urls: [
      "https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-8p-bvv-n-100-4498-085",
    ],
  },
  {
    name: "nike-jordan-bb-ultimate-8p.jpg",
    urls: [
      "https://sportmaydan.com.ua/m-yach-basketbolniy-nike-jordan-bb-ultimate-8p-white-university-blue-university-red",
    ],
  },
  {
    name: "nike-jordan-legacy-2.0.jpg",
    urls: ["https://sportmaydan.com.ua/index.php?route=product/product&product_id=20430"],
  },
  {
    name: "nike-playground-next-nature.jpg",
    urls: [
      "https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-next-nature-8p-n-100-7037-973",
    ],
  },
  {
    name: "wilson-fiba-3x3-mini.jpg",
    urls: ["https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-fiba-3x3-mini-wtb1733"],
  },
  {
    name: "wilson-nba-drv-pro.jpg",
    urls: ["https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-nba-drv-pro"],
  },
  {
    name: "wilson-ncaa-elevate-vtx.jpg",
    urls: [
      "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-elevate-vtx-bskt-orange-blue",
    ],
  },
  {
    name: "wilson-ncaa-elevate-bskt.jpg",
    urls: [
      "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-ncaa-elevate-bskt-wz3007001",
    ],
  },
  {
    name: "wilson-reaction-pro-295.jpg",
    urls: ["https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-reaction-pro-295"],
  },
];

// Создать папку public/images/balls если её нет
const ballsDir = path.join(__dirname, "..", "public", "images", "balls");
if (!fs.existsSync(ballsDir)) {
  fs.mkdirSync(ballsDir, { recursive: true });
  console.log(`✅ Создана папка: ${ballsDir}`);
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Redirect
        downloadImage(res.headers.location, filename).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        const filepath = path.join(ballsDir, filename);
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(`✅ Скачано: ${filename}`);
          resolve();
        });
        file.on("error", reject);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on("error", reject);
  });
}

async function main() {
  console.log("📥 Скачивание изображений мячей...\n");

  // Для демонстрации — создаём placeholder изображения
  for (const ball of ballImages) {
    const filepath = path.join(ballsDir, ball.name);
    if (!fs.existsSync(filepath)) {
      // Создать простую placeholder картинку (100x100 пиксель)
      // В реальности нужно скачать с сайта
      console.log(`⏳ ${ball.name} — требует ручного скачивания с:`);
      console.log(`   ${ball.urls[0]}`);
      console.log(``);
    }
  }

  console.log("\n💡 Инструкция:");
  console.log("1. Откройте каждый URL в браузере");
  console.log("2. Найдите главное изображение товара");
  console.log("3. Сохраните в public/images/balls/ с указанным именем файла");
  console.log("4. После скачивания изображений запустите restore-ball-products.ts");
}

main().catch((e) => {
  console.error("❌ Ошибка:", e.message);
  process.exit(1);
});
