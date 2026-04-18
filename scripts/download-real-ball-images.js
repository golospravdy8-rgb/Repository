const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ballsDir = path.join(__dirname, "..", "public", "images", "balls");

// Ensure directory exists
if (!fs.existsSync(ballsDir)) {
  fs.mkdirSync(ballsDir, { recursive: true });
}

const products = [
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-meteor-cellular-7-korychnevyj-kremovyj",
    filename: "meteor-cellular.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/index.php?route=product/product&product_id=20483",
    filename: "nike-playground-8p-graphic.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-8p-bvv-n-100-4498-085",
    filename: "nike-playground-8p.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/index.php?route=product/product&product_id=20429",
    filename: "nike-jordan-bb-ultimate-8p.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-next-nature-8p-n-100-7037-973",
    filename: "nike-playground-next-nature.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolniy-nike-jordan-bb-ultimate-8p-white-university-blue-university-red",
    filename: "nike-jordan-bb-ultimate-8p-2.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/index.php?route=product/product&product_id=20430",
    filename: "nike-jordan-legacy-2.0.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-fiba-3x3-mini-wtb1733",
    filename: "wilson-fiba-3x3-mini.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-nba-drv-pro",
    filename: "wilson-nba-drv-pro.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-elevate-vtx-bskt-orange-blue",
    filename: "wilson-ncaa-elevate-vtx.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-ncaa-elevate-bskt-wz3007001",
    filename: "wilson-ncaa-elevate-bskt.jpg",
  },
  {
    url: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-reaction-pro-295",
    filename: "wilson-reaction-pro-295.jpg",
  },
];

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve(data);
          });
        }
      )
      .on("error", reject);
  });
}

function extractImageUrl(html) {
  // Strategy 1: Look for og:image meta tag
  const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
  if (ogImageMatch && ogImageMatch[1]) {
    return ogImageMatch[1];
  }

  // Strategy 2: Look for product-image class
  const productImageMatch = html.match(/<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/);
  if (productImageMatch && productImageMatch[1]) {
    return productImageMatch[1];
  }

  // Strategy 3: Look for first large img tag with data-src or src
  const largeImageMatch = html.match(/<img[^>]*data-src="([^"]+)"/);
  if (largeImageMatch && largeImageMatch[1]) {
    return largeImageMatch[1];
  }

  // Strategy 4: Look for images in product gallery
  const galleryMatch = html.match(/<img[^>]*src="([^"]*\/products\/[^"]+\.jpg)"/);
  if (galleryMatch && galleryMatch[1]) {
    return galleryMatch[1];
  }

  // Strategy 5: Generic large img src
  const genericImgMatch = html.match(/<img[^>]*src="([^"]*\.jpg)"[^>]*>/i);
  if (genericImgMatch && genericImgMatch[1]) {
    return genericImgMatch[1];
  }

  return null;
}

function downloadImage(imageUrl, filepath) {
  return new Promise((resolve, reject) => {
    // Handle relative URLs
    let fullUrl = imageUrl;
    if (!imageUrl.startsWith("http")) {
      fullUrl = "https://sportmaydan.com.ua" + imageUrl;
    }

    const protocol = fullUrl.startsWith("https") ? https : http;
    protocol
      .get(
        fullUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            // Handle redirects
            downloadImage(res.headers.location, filepath)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (res.statusCode !== 200) {
            reject(
              new Error(`HTTP ${res.statusCode}: ${fullUrl}`)
            );
            return;
          }

          const file = fs.createWriteStream(filepath);
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
          file.on("error", reject);
        }
      )
      .on("error", reject);
  });
}

async function main() {
  console.log("📥 Скачивание реальных изображений мячей...\n");

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const product of products) {
    try {
      console.log(`⏳ ${product.filename}...`);
      console.log(`   URL: ${product.url}`);

      // Fetch HTML
      const html = await fetchHTML(product.url);

      // Extract image URL
      const imageUrl = extractImageUrl(html);
      if (!imageUrl) {
        console.log(`   ❌ Не найдено изображение в HTML`);
        failCount++;
        results.push({
          filename: product.filename,
          status: "FAILED",
          reason: "Image URL not found",
        });
        continue;
      }

      console.log(`   📸 Найдено изображение: ${imageUrl.substring(0, 60)}...`);

      // Download image
      const filepath = path.join(ballsDir, product.filename);
      await downloadImage(imageUrl, filepath);

      // Verify file size
      const stats = fs.statSync(filepath);
      if (stats.size < 1000) {
        console.log(
          `   ⚠️  Файл слишком маленький (${stats.size} bytes) - может быть placeholder`
        );
      }

      console.log(`   ✅ Скачано: ${product.filename} (${stats.size} bytes)\n`);
      successCount++;
      results.push({
        filename: product.filename,
        status: "OK",
        size: stats.size,
      });
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}\n`);
      failCount++;
      results.push({
        filename: product.filename,
        status: "FAILED",
        reason: error.message,
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 ИТОГИ:");
  console.log("=".repeat(60));
  console.log(`✅ Успешно: ${successCount}/${products.length}`);
  console.log(`❌ Ошибки: ${failCount}/${products.length}`);

  // Show failures
  const failures = results.filter((r) => r.status === "FAILED");
  if (failures.length > 0) {
    console.log("\n⚠️  ОШИБКИ:");
    failures.forEach((f) => {
      console.log(`  - ${f.filename}: ${f.reason}`);
    });
  }

  // Verify files
  console.log("\n📁 Файлы в public/images/balls/:");
  const files = fs.readdirSync(ballsDir).sort();
  files.forEach((file) => {
    const filepath = path.join(ballsDir, file);
    const stats = fs.statSync(filepath);
    const isPlaceholder = stats.size < 2000 ? "⚠️ (placeholder?)" : "✅";
    console.log(`  ${isPlaceholder} ${file} (${stats.size} bytes)`);
  });

  if (successCount === products.length) {
    console.log("\n✨ ВСЕ ИЗОБРАЖЕНИЯ СКАЧАНЫ!");
    console.log("\nСледующий шаг:");
    console.log("  git add public/images/balls/");
    console.log(
      '  git commit -m "feat(shop): add real ball product images from sportmaydan"'
    );
    console.log("  git push origin main");
  }
}

main().catch((error) => {
  console.error("❌ Критическая ошибка:", error);
  process.exit(1);
});
