const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function diagnose() {
  const game = await p.game.findFirst({
    where: { id: 241 },
    include: {
      homeTeam: { select: { id: true, name: true, players: { select: { id: true, number: true, lastName: true } } } },
      awayTeam: { select: { id: true, name: true, players: { select: { id: true, number: true, lastName: true } } } },
      boxScores: { select: { playerId: true, isOnCourt: true, isStarter: true, enteredAt: true, timeOnCourtSeconds: true } },
      onCourt: { select: { playerId: true, onCourt: true, isStarter: true } }
    }
  });

  console.log('\n=== GAME 241 DIAGNOSTIC ===\n');
  
  if (!game) {
    console.log('❌ GAME NOT FOUND');
    process.exit(1);
  }

  console.log('Game ID:', game.id);
  console.log('Home Team:', game.homeTeam.name, `(${game.homeTeam.players.length} players)`);
  console.log('Away Team:', game.awayTeam.name, `(${game.awayTeam.players.length} players)`);
  
  console.log('\n📊 DATABASE STATE:\n');
  console.log('BoxScores count:', game.boxScores.length);
  console.log('OnCourt records count:', game.onCourt.length);
  
  if (game.boxScores.length === 0) {
    console.log('\n❌ PROBLEM #1: NO BOXSCORES');
    console.log('   → No BoxScore records exist for this game');
    console.log('   → Player stats cannot be tracked');
    console.log('   → Time on court cannot be displayed');
    console.log('   → isStarter field cannot be used\n');
  } else {
    console.log('\nBoxScore Sample (first 3):');
    game.boxScores.slice(0, 3).forEach(bs => {
      console.log(`  Player ${bs.playerId}: isOnCourt=${bs.isOnCourt}, isStarter=${bs.isStarter}, enteredAt=${bs.enteredAt}, timeOnCourtSeconds=${bs.timeOnCourtSeconds}`);
    });
  }

  if (game.onCourt.length === 0) {
    console.log('\n❌ PROBLEM #2: NO ONCOURT RECORDS');
    console.log('   → RosterPanel uses game.onCourt to determine who is on court');
    console.log('   → Without onCourt records, all players appear as bench');
    console.log('   → Green indicators cannot work');
    console.log('   → No visual separation between starters and subs\n');
  } else {
    console.log('\nOnCourt Sample (first 5):');
    game.onCourt.slice(0, 5).forEach(oc => {
      console.log(`  Player ${oc.playerId}: onCourt=${oc.onCourt}, isStarter=${oc.isStarter}`);
    });
  }

  console.log('\n=== WHAT NEEDS TO HAPPEN ===\n');
  console.log('1. Create BoxScore records for all 18 players (11 home + 7 away)');
  console.log('2. Create GameOnCourt records for all 18 players');
  console.log('3. Mark starter (isStarter=true) for 5 home + 5 away players');
  console.log('4. Mark on-court status (onCourt=true) for the 5 starters each team');
  console.log('5. Set enteredAt=600 (start of game) for each on-court player\n');

  await p.$disconnect();
}

diagnose().catch(console.error);
