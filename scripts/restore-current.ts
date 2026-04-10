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

async function restoreCurrent() {
  // Safety check: never auto-restore in production without explicit flag
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    console.warn("⚠️ Restore skipped in production (set ALLOW_SEED=1 to override)");
    return;
  }

  console.log("🔄 Restoring current state from backup...");

  // Load backup
  const backupPath = path.join(process.cwd(), "data", "current-full-backup.json");

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    console.log("   Run: npm run db:backup-current");
    throw new Error("Backup file missing");
  }

  const backup: BackupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

  console.log(`📦 Restoring from backup created at ${backup.meta.created_at}`);
  console.log(`   Description: ${backup.meta.description}`);

  // ==================== CLEAN DATABASE ====================
  console.log("\n🧹 Cleaning database (all tables)...");

  // Order matters: delete foreign key dependencies first!

  // Chat cleanup (chat depends on messages)
  await prisma.chatReaction.deleteMany();
  await prisma.chatPollVote.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatModerator.deleteMany();
  await prisma.chatBan.deleteMany();
  await prisma.chatMute.deleteMany();
  await prisma.chatWarn.deleteMany();
  await prisma.chatPinnedMessage.deleteMany();
  await prisma.chatMvpVote.deleteMany();
  await prisma.chatDailyFirstMsg.deleteMany();
  await prisma.chatDailySpin.deleteMany();
  await prisma.chatStreak.deleteMany();
  await prisma.chatOnline.deleteMany();
  await prisma.chatPoll.deleteMany();
  await prisma.chatGameAttendance.deleteMany();
  await prisma.chatModAction.deleteMany();

  // Marketplace cleanup
  await prisma.auctionBid.deleteMany();
  await prisma.auctionItem.deleteMany();
  await prisma.marketplaceListing.deleteMany();

  // Media
  await prisma.mediaLike.deleteMany();

  // Game/Player cleanup (must delete in order of FK dependencies)
  await prisma.playerAchievement.deleteMany();
  await prisma.boxScore.deleteMany();
  await prisma.gameEvent.deleteMany();
  await prisma.gameRsvp.deleteMany();
  await prisma.matchPrediction.deleteMany();
  await prisma.mvpVote.deleteMany();

  // Games and teams
  await prisma.game.deleteMany();
  await prisma.standing.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.season.deleteMany();

  // Guest & Playground
  await prisma.guestContact.deleteMany();
  await prisma.playgroundCheckin.deleteMany();
  await prisma.parentSession.deleteMany();

  // Shop
  await prisma.shopOrder.deleteMany();
  await prisma.shopProduct.deleteMany();

  // Content
  await prisma.news.deleteMany();
  await prisma.video.deleteMany();
  await prisma.review.deleteMany();

  // Admin
  await prisma.adminUser.deleteMany();

  // Chat rooms (should be last if no other deps)
  await prisma.chatRoom.deleteMany();

  console.log("✅ Database cleaned");

  // ==================== RESTORE DATA ====================
  console.log("\n📥 Restoring data...");

  // Seasons (must be first for foreign keys)
  for (const season of backup.seasons) {
    await prisma.season.create({ data: season });
  }
  console.log(`✓ Seasons: ${backup.seasons.length}`);

  // Teams (depends on seasons)
  for (const team of backup.teams) {
    await prisma.team.create({ data: team });
  }
  console.log(`✓ Teams: ${backup.teams.length}`);

  // Players (depends on teams)
  for (const player of backup.players) {
    await prisma.player.create({ data: player });
  }
  console.log(`✓ Players: ${backup.players.length}`);

  // Player Achievements (depends on players)
  for (const achievement of backup.playerAchievements) {
    await prisma.playerAchievement.create({ data: achievement });
  }
  console.log(`✓ Player Achievements: ${backup.playerAchievements.length}`);

  // Games (depends on seasons, teams)
  for (const game of backup.games) {
    await prisma.game.create({ data: game });
  }
  console.log(`✓ Games: ${backup.games.length}`);

  // Game Events (depends on games, players)
  for (const event of backup.gameEvents) {
    await prisma.gameEvent.create({ data: event });
  }
  console.log(`✓ Game Events: ${backup.gameEvents.length}`);

  // Box Scores (depends on games, players, teams)
  for (const score of backup.boxScores) {
    await prisma.boxScore.create({ data: score });
  }
  console.log(`✓ Box Scores: ${backup.boxScores.length}`);

  // Standings (depends on teams, seasons)
  for (const standing of backup.standings) {
    await prisma.standing.create({ data: standing });
  }
  console.log(`✓ Standings: ${backup.standings.length}`);

  // MVP Votes (depends on players, games)
  for (const vote of backup.mvpVotes) {
    await prisma.mvpVote.create({ data: vote });
  }
  console.log(`✓ MVP Votes: ${backup.mvpVotes.length}`);

  // Match Predictions (depends on games)
  for (const pred of backup.matchPredictions) {
    await prisma.matchPrediction.create({ data: pred });
  }
  console.log(`✓ Match Predictions: ${backup.matchPredictions.length}`);

  // Game RSVPs (depends on games)
  for (const rsvp of backup.gameRsvps) {
    await prisma.gameRsvp.create({ data: rsvp });
  }
  console.log(`✓ Game RSVPs: ${backup.gameRsvps.length}`);

  // News
  for (const news of backup.news) {
    await prisma.news.create({ data: news });
  }
  console.log(`✓ News: ${backup.news.length}`);

  // Videos
  for (const video of backup.videos) {
    await prisma.video.create({ data: video });
  }
  console.log(`✓ Videos: ${backup.videos.length}`);

  // Reviews
  for (const review of backup.reviews) {
    await prisma.review.create({ data: review });
  }
  console.log(`✓ Reviews: ${backup.reviews.length}`);

  // Shop Products
  for (const product of backup.shopProducts) {
    await prisma.shopProduct.create({ data: product });
  }
  console.log(`✓ Shop Products: ${backup.shopProducts.length}`);

  // Shop Orders
  for (const order of backup.shopOrders) {
    await prisma.shopOrder.create({ data: order });
  }
  console.log(`✓ Shop Orders: ${backup.shopOrders.length}`);

  // Marketplace Listings
  for (const listing of backup.marketplaceListings) {
    await prisma.marketplaceListing.create({ data: listing });
  }
  console.log(`✓ Marketplace Listings: ${backup.marketplaceListings.length}`);

  // Auction Items (must be before auction bids)
  for (const item of backup.auctionItems) {
    await prisma.auctionItem.create({ data: item });
  }
  console.log(`✓ Auction Items: ${backup.auctionItems.length}`);

  // Auction Bids (depends on auction items)
  for (const bid of backup.auctionBids) {
    await prisma.auctionBid.create({ data: bid });
  }
  console.log(`✓ Auction Bids: ${backup.auctionBids.length}`);

  // Guest Contacts
  for (const guest of backup.guestContacts) {
    await prisma.guestContact.create({ data: guest });
  }
  console.log(`✓ Guest Contacts: ${backup.guestContacts.length}`);

  // Playground Checkins
  for (const checkin of backup.playgroundCheckins) {
    await prisma.playgroundCheckin.create({ data: checkin });
  }
  console.log(`✓ Playground Checkins: ${backup.playgroundCheckins.length}`);

  // Chat Rooms
  for (const room of backup.chatRooms) {
    await prisma.chatRoom.create({ data: room });
  }
  console.log(`✓ Chat Rooms: ${backup.chatRooms.length}`);

  // Chat Messages (depends on chat rooms)
  for (const msg of backup.chatMessages) {
    await prisma.chatMessage.create({ data: msg });
  }
  console.log(`✓ Chat Messages: ${backup.chatMessages.length}`);

  // Chat Reactions (depends on chat messages)
  for (const reaction of backup.chatReactions) {
    await prisma.chatReaction.create({ data: reaction });
  }
  console.log(`✓ Chat Reactions: ${backup.chatReactions.length}`);

  // Chat Moderators
  for (const mod of backup.chatModerators) {
    await prisma.chatModerator.create({ data: mod });
  }
  console.log(`✓ Chat Moderators: ${backup.chatModerators.length}`);

  // Chat Bans
  for (const ban of backup.chatBans) {
    await prisma.chatBan.create({ data: ban });
  }
  console.log(`✓ Chat Bans: ${backup.chatBans.length}`);

  // Chat Mutes
  for (const mute of backup.chatMutes) {
    await prisma.chatMute.create({ data: mute });
  }
  console.log(`✓ Chat Mutes: ${backup.chatMutes.length}`);

  // Chat Warns
  for (const warn of backup.chatWarns) {
    await prisma.chatWarn.create({ data: warn });
  }
  console.log(`✓ Chat Warns: ${backup.chatWarns.length}`);

  // Chat Pinned Messages
  for (const pinned of backup.chatPinnedMessages) {
    await prisma.chatPinnedMessage.create({ data: pinned });
  }
  console.log(`✓ Chat Pinned Messages: ${backup.chatPinnedMessages.length}`);

  // Chat MVP Votes
  for (const vote of backup.chatMvpVotes) {
    await prisma.chatMvpVote.create({ data: vote });
  }
  console.log(`✓ Chat MVP Votes: ${backup.chatMvpVotes.length}`);

  // Chat Daily First Messages
  for (const msg of backup.chatDailyFirstMsgs) {
    await prisma.chatDailyFirstMsg.create({ data: msg });
  }
  console.log(`✓ Chat Daily First Msgs: ${backup.chatDailyFirstMsgs.length}`);

  // Chat Daily Spins
  for (const spin of backup.chatDailySpins) {
    await prisma.chatDailySpin.create({ data: spin });
  }
  console.log(`✓ Chat Daily Spins: ${backup.chatDailySpins.length}`);

  // Chat Streaks
  for (const streak of backup.chatStreaks) {
    await prisma.chatStreak.create({ data: streak });
  }
  console.log(`✓ Chat Streaks: ${backup.chatStreaks.length}`);

  // Chat Online (key only, no create normally, but restore if in backup)
  for (const online of backup.chatOnline) {
    await prisma.chatOnline.upsert({
      where: { phone: online.phone },
      create: online,
      update: online,
    });
  }
  console.log(`✓ Chat Online: ${backup.chatOnline.length}`);

  // Chat Polls (must be before poll votes)
  for (const poll of backup.chatPolls) {
    await prisma.chatPoll.create({ data: poll });
  }
  console.log(`✓ Chat Polls: ${backup.chatPolls.length}`);

  // Chat Poll Votes (depends on polls)
  for (const vote of backup.chatPollVotes) {
    await prisma.chatPollVote.create({ data: vote });
  }
  console.log(`✓ Chat Poll Votes: ${backup.chatPollVotes.length}`);

  // Chat Game Attendances
  for (const attendance of backup.chatGameAttendances) {
    await prisma.chatGameAttendance.create({ data: attendance });
  }
  console.log(`✓ Chat Game Attendances: ${backup.chatGameAttendances.length}`);

  // Chat Mod Actions
  for (const action of backup.chatModActions) {
    await prisma.chatModAction.create({ data: action });
  }
  console.log(`✓ Chat Mod Actions: ${backup.chatModActions.length}`);

  // Media Likes
  for (const like of backup.mediaLikes) {
    await prisma.mediaLike.create({ data: like });
  }
  console.log(`✓ Media Likes: ${backup.mediaLikes.length}`);

  // Parent Sessions
  for (const session of backup.parentSessions) {
    await prisma.parentSession.create({ data: session });
  }
  console.log(`✓ Parent Sessions: ${backup.parentSessions.length}`);

  // Admin Users
  for (const admin of backup.adminUsers) {
    await prisma.adminUser.create({ data: admin });
  }
  console.log(`✓ Admin Users: ${backup.adminUsers.length}`);

  // Site Settings
  if (Object.keys(backup.siteSettings).length > 0) {
    for (const [key, value] of Object.entries(backup.siteSettings)) {
      await prisma.siteSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    console.log(`✓ Site Settings: ${Object.keys(backup.siteSettings).length}`);
  }

  console.log("\n✅ Restore completed successfully!");
  console.log("   Database now matches the backed-up state.");

  await prisma.$disconnect();
}

// Export for use in seed.ts
export { restoreCurrent };

// Run if called directly
if (require.main === module) {
  restoreCurrent().catch((e) => {
    console.error("❌ Restore error:", e);
    process.exit(1);
  });
}
