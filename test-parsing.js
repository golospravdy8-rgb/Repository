const cheerio = require('cheerio');

async function test() {
  const url = "https://basketball-video.com/denver-nuggets-vs-san-antonio-spurs-full-game-replay-april-12-2026-nba";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const servers = [];
  let currentServer = null;

  $("p").each((i, el) => {
    const text = $(el).text().trim();
    const link = $(el).find("a").attr("href");

    if (text.match(/Server\s*#\d+/i)) {
      if (currentServer) servers.push(currentServer);
      const serverNum = text.match(/Server\s*#(\d+)/i)?.[1] || "?";
      const isDM = text.includes("(DM)");
      currentServer = {
        name: isDM ? `Server #${serverNum} (DM)` : `Server #${serverNum}`,
        parts: [],
      };
      console.log(`Found: ${currentServer.name}`);
    } else if (text.match(/Part\s*\d+/i) && currentServer) {
      const partNum = text.match(/Part\s*(\d+)/i)?.[1] || "?";
      if (link) {
        currentServer.parts.push({
          label: `Part ${partNum}`,
          url: link,
        });
        console.log(`  Added Part ${partNum}`);
      }
    } else if (text.match(/Watch/i) && currentServer && link) {
      if (currentServer.parts.length === 0) {
        currentServer.watchUrl = link;
        console.log(`  Set watchUrl`);
      }
    }
  });

  if (currentServer) servers.push(currentServer);

  console.log("\nTotal servers: " + servers.length);
  servers.forEach(s => {
    console.log(`- ${s.name}: ${s.parts.length} parts`);
  });
}

test().catch(console.error);
