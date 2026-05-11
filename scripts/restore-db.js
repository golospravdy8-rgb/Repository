#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restore() {
  try {
    const backupPath = path.join(__dirname, '../backups/backup_2026-05-04_09-05-13.json');
    console.log('📂 Reading backup from:', backupPath);

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const { seasons, teams, players, games } = backup.data;

    console.log(`\n🔄 Restoring ${seasons.length} seasons...`);
    for (const season of seasons) {
      await prisma.season.upsert({
        where: { id: season.id },
        update: season,
        create: season,
      });
    }
    console.log('✅ Seasons restored');

    console.log(`\n🔄 Restoring ${teams.length} teams...`);
    for (const team of teams) {
      await prisma.team.upsert({
        where: { id: team.id },
        update: team,
        create: team,
      });
    }
    console.log('✅ Teams restored');

    // Restore tours before games
    if (backup.data.tours) {
      console.log(`\n🔄 Restoring ${backup.data.tours.length} tours...`);
      for (const tour of backup.data.tours) {
        await prisma.tour.upsert({
          where: { id: tour.id },
          update: tour,
          create: tour,
        });
      }
      console.log('✅ Tours restored');
    }

    console.log(`\n🔄 Restoring ${players.length} players...`);
    for (const player of players) {
      await prisma.player.upsert({
        where: { id: player.id },
        update: { hp: player.hp || 0 },
        create: player,
      });
    }
    console.log('✅ Players restored');

    console.log(`\n🔄 Restoring ${games.length} games...`);
    for (const game of games) {
      // Remove relational fields, keep only scalar fields
      const gameData = {
        id: game.id,
        seasonId: game.seasonId,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        tourId: game.tourId,
        scheduledAt: game.scheduledAt,
        status: game.status,
        quarter: game.quarter || 1,
        homeScore: game.homeScore || 0,
        awayScore: game.awayScore || 0,
        currentTimeLeft: game.currentTimeLeft || 600,
        timerRunning: game.timerRunning || false,
        homeTimeouts: game.homeTimeouts || 0,
        awayTimeouts: game.awayTimeouts || 0,
        stage: game.stage,
        protest: game.protest || false,
      };

      await prisma.game.upsert({
        where: { id: game.id },
        update: gameData,
        create: gameData,
      });
    }
    console.log('✅ Games restored');

    const counts = await Promise.all([
      prisma.game.count(),
      prisma.team.count(),
      prisma.player.count(),
    ]);

    console.log(`\n📊 Database restored:`);
    console.log(`   Games: ${counts[0]}`);
    console.log(`   Teams: ${counts[1]}`);
    console.log(`   Players: ${counts[2]}`);

    process.exit(0);
  } catch (e) {
    console.error('❌ Restore failed:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restore();
