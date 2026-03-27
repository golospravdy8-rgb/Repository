import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function backup() {
  console.log('Starting backup...')

  const [
    seasons,
    teams,
    players,
    games,
    gameEvents,
    boxScores,
    standings,
    news,
    adminUsers,
    siteSettings,
    videos,
    reviews,
    guestContacts,
    mvpVotes,
    shopOrders,
    shopProducts,
  ] = await Promise.all([
    prisma.season.findMany(),
    prisma.team.findMany(),
    prisma.player.findMany(),
    prisma.game.findMany(),
    prisma.gameEvent.findMany(),
    prisma.boxScore.findMany(),
    prisma.standing.findMany(),
    prisma.news.findMany(),
    prisma.adminUser.findMany({ select: { id: true, email: true, name: true } }), // без паролів
    prisma.siteSettings.findMany(),
    prisma.video.findMany(),
    prisma.review.findMany(),
    prisma.guestContact.findMany(),
    prisma.mvpVote.findMany(),
    prisma.shopOrder.findMany(),
    prisma.shopProduct.findMany(),
  ])

  const backup = {
    meta: {
      createdAt: new Date().toISOString(),
      project: 'basket-lviv',
      url: 'http://localhost:3006',
      version: '1.0',
    },
    data: {
      seasons,
      teams,
      players,
      games,
      gameEvents,
      boxScores,
      standings,
      news,
      adminUsers,
      siteSettings,
      videos,
      reviews,
      guestContacts,
      mvpVotes,
      shopOrders,
      shopProducts,
    },
    stats: {
      seasons: seasons.length,
      teams: teams.length,
      players: players.length,
      games: games.length,
      gameEvents: gameEvents.length,
      boxScores: boxScores.length,
      standings: standings.length,
      news: news.length,
      adminUsers: adminUsers.length,
      siteSettings: siteSettings.length,
      videos: videos.length,
      reviews: reviews.length,
      guestContacts: guestContacts.length,
      mvpVotes: mvpVotes.length,
      shopOrders: shopOrders.length,
      shopProducts: shopProducts.length,
    },
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup_basket-lviv_${timestamp}.json`
  const outputPath = join(process.cwd(), 'scripts', filename)

  writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf-8')

  console.log(`\nBackup saved: ${outputPath}`)
  console.log('\nStats:')
  for (const [key, count] of Object.entries(backup.stats)) {
    console.log(`  ${key}: ${count}`)
  }
}

backup()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
