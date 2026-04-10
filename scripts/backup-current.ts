import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface BackupData {
  meta: {
    created_at: string;
    node_env: string;
    description: string;
  };
  // Core data
  seasons: any[];
  teams: any[];
  players: any[];
  playerAchievements: any[];
  games: any[];
  gameEvents: any[];
  boxScores: any[];
  standings: any[];

  // Content
  news: any[];
  videos: any[];
  reviews: any[];

  // Shop
  shopProducts: any[];
  shopOrders: any[];

  // Marketplace
  marketplaceListings: any[];
  auctionItems: any[];
  auctionBids: any[];

  // Guest & Playground
  guestContacts: any[];
  playgroundCheckins: any[];

  // Voting
  mvpVotes: any[];
  matchPredictions: any[];
  gameRsvps: any[];

  // Chat
  chatMessages: any[];
  chatReactions: any[];
  chatModerators: any[];
  chatRooms: any[];
  chatBans: any[];
  chatMutes: any[];
  chatWarns: any[];
  chatPinnedMessages: any[];
  chatMvpVotes: any[];
  chatDailyFirstMsgs: any[];
  chatDailySpins: any[];
  chatStreaks: any[];
  chatOnline: any[];
  chatPolls: any[];
  chatPollVotes: any[];
  chatGameAttendances: any[];
  chatModActions: any[];

  // Media
  mediaLikes: any[];

  // Parent sessions
  parentSessions: any[];

  // Settings & Admin
  siteSettings: Record<string, string>;
  adminUsers: any[];
}

async function backupCurrent() {
  console.log("📦 Creating current state backup...");

  const backup: BackupData = {
    meta: {
      created_at: new Date().toISOString(),
      node_env: process.env.NODE_ENV || "development",
      description: "Current full state backup (2026-04-09) - all teams, players, games, products, settings, chat, events",
    },

    // Core
    seasons: await prisma.season.findMany(),
    teams: await prisma.team.findMany(),
    players: await prisma.player.findMany(),
    playerAchievements: await prisma.playerAchievement.findMany(),
    games: await prisma.game.findMany(),
    gameEvents: await prisma.gameEvent.findMany(),
    boxScores: await prisma.boxScore.findMany(),
    standings: await prisma.standing.findMany(),

    // Content
    news: await prisma.news.findMany(),
    videos: await prisma.video.findMany(),
    reviews: await prisma.review.findMany(),

    // Shop
    shopProducts: await prisma.shopProduct.findMany(),
    shopOrders: await prisma.shopOrder.findMany(),

    // Marketplace
    marketplaceListings: await prisma.marketplaceListing.findMany(),
    auctionItems: await prisma.auctionItem.findMany(),
    auctionBids: await prisma.auctionBid.findMany(),

    // Guest & Playground
    guestContacts: await prisma.guestContact.findMany(),
    playgroundCheckins: await prisma.playgroundCheckin.findMany(),

    // Voting
    mvpVotes: await prisma.mvpVote.findMany(),
    matchPredictions: await prisma.matchPrediction.findMany(),
    gameRsvps: await prisma.gameRsvp.findMany(),

    // Chat
    chatMessages: await prisma.chatMessage.findMany(),
    chatReactions: await prisma.chatReaction.findMany(),
    chatModerators: await prisma.chatModerator.findMany(),
    chatRooms: await prisma.chatRoom.findMany(),
    chatBans: await prisma.chatBan.findMany(),
    chatMutes: await prisma.chatMute.findMany(),
    chatWarns: await prisma.chatWarn.findMany(),
    chatPinnedMessages: await prisma.chatPinnedMessage.findMany(),
    chatMvpVotes: await prisma.chatMvpVote.findMany(),
    chatDailyFirstMsgs: await prisma.chatDailyFirstMsg.findMany(),
    chatDailySpins: await prisma.chatDailySpin.findMany(),
    chatStreaks: await prisma.chatStreak.findMany(),
    chatOnline: await prisma.chatOnline.findMany(),
    chatPolls: await prisma.chatPoll.findMany(),
    chatPollVotes: await prisma.chatPollVote.findMany(),
    chatGameAttendances: await prisma.chatGameAttendance.findMany(),
    chatModActions: await prisma.chatModAction.findMany(),

    // Media
    mediaLikes: await prisma.mediaLike.findMany(),

    // Parent sessions
    parentSessions: await prisma.parentSession.findMany(),

    // Admin & Settings
    siteSettings: {},
    adminUsers: await prisma.adminUser.findMany(),
  };

  // Site settings as key-value map
  const settings = await prisma.siteSettings.findMany();
  for (const s of settings) {
    backup.siteSettings[s.key] = s.value;
  }

  // Write to file
  const backupDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filePath = path.join(backupDir, "current-full-backup.json");
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

  console.log(`✅ Backup saved to: ${filePath}`);
  console.log(`\n📊 Data Summary:`);
  console.log(`   Seasons: ${backup.seasons.length}`);
  console.log(`   Teams: ${backup.teams.length}`);
  console.log(`   Players: ${backup.players.length}`);
  console.log(`   Games: ${backup.games.length}`);
  console.log(`   Shop Products: ${backup.shopProducts.length}`);
  console.log(`   Chat Messages: ${backup.chatMessages.length}`);
  console.log(`   MVP Votes: ${backup.mvpVotes.length}`);
  console.log(`   Match Predictions: ${backup.matchPredictions.length}`);
  console.log(`   Game RSVPs: ${backup.gameRsvps.length}`);
  console.log(`   Site Settings: ${Object.keys(backup.siteSettings).length}`);
  console.log(`   Admin Users: ${backup.adminUsers.length}`);

  await prisma.$disconnect();
}

backupCurrent()
  .catch((e) => {
    console.error("❌ Backup error:", e);
    process.exit(1);
  });
