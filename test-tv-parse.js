const cheerio = require('cheerio');

async function test() {
  try {
    const res = await fetch("https://basketball-video.com/", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const matches = [];

    $(".short_item").each((_, el) => {
      const titleEl = $(el).find("h3 a");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href") || "";
      
      if (title && href) {
        const dateMatch = title.match(/([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/);
        let matchDate = new Date();
        if (dateMatch) {
          const parsed = new Date(dateMatch[1]);
          if (!isNaN(parsed.getTime())) {
            matchDate = parsed;
          }
        }
        
        const fullUrl = href.startsWith("http") ? href : `https://basketball-video.com${href}`;
        matches.push({
          title: title.substring(0, 80),
          url: fullUrl,
          date: matchDate.toISOString().split("T")[0],
        });
      }
    });

    console.log(`✅ Parsed ${matches.length} matches:`);
    matches.slice(0, 12).forEach((m, i) => {
      console.log(`${i+1}. ${m.title.substring(0, 70)}`);
    });
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

test();
