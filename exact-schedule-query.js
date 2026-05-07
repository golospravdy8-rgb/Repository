const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== EXACT SCHEDULE QUERY REPRODUCTION ===\n');

  // Step 1: Find season (copy exact code from page.tsx)
  const season = await prisma.season.findFirst({
    where: { ageGroup: 'older', isActive: true }
  });
  console.log('Step 1 - Season found:', season?.id, 'ageGroup:', season?.ageGroup, 'isActive:', season?.isActive);

  if (!season) {
    console.log('❌ NO SEASON FOUND — this is why schedule is empty');

    // Show all seasons
    const allSeasons = await prisma.season.findMany();
    console.log('\nAll seasons in DB:');
    allSeasons.forEach(s => {
      console.log(`  id=${s.id} name=${s.name} ageGroup=${s.ageGroup} isActive=${s.isActive}`);
    });
    return;
  }

  // Step 2: Find games (copy exact code from page.tsx)
  const games = await prisma.game.findMany({
    where: { seasonId: season.id },
    include: { homeTeam: true, awayTeam: true, season: true }
  });
  console.log('\nStep 2 - Games found:', games.length);
  console.log('Game 159 in result:', games.find(g => g.id === 159) ? 'YES' : 'NO');

  if (games.length > 0) {
    console.log('Sample games:');
    games.slice(0, 3).forEach(g => {
      console.log(`  id=${g.id} status=${g.status} stage=${g.stage} ${g.homeTeam.name} vs ${g.awayTeam.name}`);
    });
  }

  // Step 3: Apply frontend filters (copy exact filter code from page.tsx)
  const groupGames = games.filter(g => !g.stage || g.stage === 'group' || g.stage === 'groupA' || g.stage === 'groupB');
  console.log('\nStep 3 - After stage filter (!stage || group/groupA/groupB):', groupGames.length);

  const finalGames = groupGames.filter(g => g.status === 'FINAL');
  console.log('Step 4 - After status filter (FINAL):', finalGames.length);
  console.log('Game 159 survives all filters:', finalGames.find(g => g.id === 159) ? 'YES' : 'NO');

  if (finalGames.length > 0) {
    console.log('\nFinal games that would appear:');
    finalGames.forEach(g => {
      console.log(`  id=${g.id} ${g.homeTeam.name} vs ${g.awayTeam.name}`);
    });
  }

  // Debug: show what schedule page actually renders
  console.log('\n=== WHAT SCHEDULE PAGE RENDERS ===');
  console.log('groupGames (Група A):', groupGames.length);
  console.log('finalGames (tab=older):', finalGames.length);
  console.log('If finalGames.length === 0 → "Ігор не знайдено"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
