-- CreateTable
CREATE TABLE "Season" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ageGroup" TEXT NOT NULL DEFAULT 'younger',

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "seasonId" INTEGER NOT NULL,
    "ageGroup" TEXT NOT NULL DEFAULT 'younger',
    "coachName" TEXT,
    "assistantCoach" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT,
    "teamId" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "hp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "ageGroup" TEXT NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTeam" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "GroupTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "tourId" INTEGER,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "quarter" INTEGER NOT NULL DEFAULT 1,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "ptsOffTurnovers" INTEGER NOT NULL DEFAULT 0,
    "ptsFastBreak" INTEGER NOT NULL DEFAULT 0,
    "ptsSecondChance" INTEGER NOT NULL DEFAULT 0,
    "ptsAfterSubstitutions" INTEGER NOT NULL DEFAULT 0,
    "biggestLead" INTEGER NOT NULL DEFAULT 0,
    "biggestRun" INTEGER NOT NULL DEFAULT 0,
    "awayPtsOffTurnovers" INTEGER NOT NULL DEFAULT 0,
    "awayPtsFastBreak" INTEGER NOT NULL DEFAULT 0,
    "awayPtsSecondChance" INTEGER NOT NULL DEFAULT 0,
    "awayPtsAfterSubstitutions" INTEGER NOT NULL DEFAULT 0,
    "awayBiggestLead" INTEGER NOT NULL DEFAULT 0,
    "awayBiggestRun" INTEGER NOT NULL DEFAULT 0,
    "commissioner" TEXT,
    "referee1" TEXT,
    "referee2" TEXT,
    "referee3" TEXT,
    "venue" TEXT,
    "round" TEXT,
    "referee" TEXT,
    "umpire1" TEXT,
    "umpire2" TEXT,
    "scorer" TEXT,
    "assistantScorer" TEXT,
    "timer" TEXT,
    "shotClockOperator" TEXT,
    "gameNumber" TEXT,
    "protest" BOOLEAN NOT NULL DEFAULT false,
    "protestNote" TEXT,
    "stage" TEXT,
    "sourceA" TEXT,
    "sourceB" TEXT,
    "playoffTeamA" TEXT,
    "playoffTeamB" TEXT,
    "playoffScoreA" INTEGER,
    "playoffScoreB" INTEGER,
    "homeTimeouts" INTEGER NOT NULL DEFAULT 0,
    "awayTimeouts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER,
    "teamId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER,
    "quarter" INTEGER NOT NULL,
    "eventSubtype" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSubstitution" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "quarter" INTEGER,
    "gameTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameOnCourt" (
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "onCourt" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GameOnCourt_pkey" PRIMARY KEY ("gameId","playerId")
);

-- CreateTable
CREATE TABLE "BoxScore" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rebounds" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "steals" INTEGER NOT NULL DEFAULT 0,
    "blocks" INTEGER NOT NULL DEFAULT 0,
    "fouls" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" TEXT,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "fgMade" INTEGER NOT NULL DEFAULT 0,
    "fgAttempted" INTEGER NOT NULL DEFAULT 0,
    "fg2Made" INTEGER NOT NULL DEFAULT 0,
    "fg2Attempted" INTEGER NOT NULL DEFAULT 0,
    "fg3Made" INTEGER NOT NULL DEFAULT 0,
    "fg3Attempted" INTEGER NOT NULL DEFAULT 0,
    "ftMade" INTEGER NOT NULL DEFAULT 0,
    "ftAttempted" INTEGER NOT NULL DEFAULT 0,
    "missedFg2" INTEGER NOT NULL DEFAULT 0,
    "missedFg3" INTEGER NOT NULL DEFAULT 0,
    "missedFt" INTEGER NOT NULL DEFAULT 0,
    "reboundsDef" INTEGER NOT NULL DEFAULT 0,
    "reboundsOff" INTEGER NOT NULL DEFAULT 0,
    "turnovers" INTEGER NOT NULL DEFAULT 0,
    "plusMinus" INTEGER NOT NULL DEFAULT 0,
    "efficiency" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "BoxScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT,
    "referredBy" INTEGER,
    "referralCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HpLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HpLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralLog" (
    "id" SERIAL NOT NULL,
    "referrerId" INTEGER NOT NULL,
    "refereeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "type" TEXT NOT NULL DEFAULT 'highlights',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestContact" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "refCode" TEXT,
    "hp" INTEGER NOT NULL DEFAULT 25,
    "isLeaguePlayer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatarInitials" TEXT,
    "childTeamId" INTEGER,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'guest',

    CONSTRAINT "GuestContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MvpVote" (
    "id" SERIAL NOT NULL,
    "voterPhone" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameId" INTEGER,
    "playerId" INTEGER,

    CONSTRAINT "MvpVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "replyToId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL DEFAULT 'general',

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReaction" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatModerator" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "assignedBy" TEXT NOT NULL DEFAULT '',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatModerator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL DEFAULT 'general',
    "slowMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatBan" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "bannedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvMatch" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NbaSchedule" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "gameTime" TIMESTAMP(3) NOT NULL,
    "kyivTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "season" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NbaSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "gameTime" TIMESTAMP(3) NOT NULL,
    "kyivTime" TIMESTAMP(3) NOT NULL,
    "liveUrl" TEXT,
    "liveSource" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkCount" INTEGER NOT NULL DEFAULT 0,
    "firstSearchAt" TIMESTAMP(3),
    "secondSearchAt" TIMESTAMP(3),
    "searchCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStream" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gameTitle" TEXT NOT NULL,
    "gameTime" TIMESTAMP(3) NOT NULL,
    "kyivTime" TIMESTAMP(3) NOT NULL,
    "streamUrl" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMute" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "mutedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatWarn" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatWarn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPinnedMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatPinnedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMvpVote" (
    "id" SERIAL NOT NULL,
    "voterPhone" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMvpVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatDailyFirstMsg" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatDailyFirstMsg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatDailySpin" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "hpGained" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatDailySpin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatStreak" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastVisit" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_session" (
    "id" SERIAL NOT NULL,
    "match_id" TEXT,
    "match_title" TEXT NOT NULL,
    "match_url" TEXT NOT NULL,
    "started_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "video_started_at" TIMESTAMP(3),
    "current_time_sec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "time_updated_at" TIMESTAMP(3),

    CONSTRAINT "tv_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_viewers" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "user_name" TEXT NOT NULL,

    CONSTRAINT "tv_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatOnline" (
    "phone" TEXT NOT NULL,
    "room" TEXT NOT NULL DEFAULT 'general',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'player',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "ChatOnline_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "ChatPoll" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChatPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPollVote" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "voterPhone" TEXT NOT NULL,
    "optionIdx" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaLike" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatGameAttendance" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatGameAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'nova_poshta',
    "postOffice" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'card',
    "items" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "oldPrice" INTEGER,
    "category" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏀',
    "badge" TEXT,
    "imageUrl" TEXT,
    "sizes" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "showInChat" BOOLEAN NOT NULL DEFAULT true,
    "chatPriority" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundCheckin" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetAt" TIMESTAMP(3),

    CONSTRAINT "PlaygroundCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "imageUrl" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🏀',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "imageUrl" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🏀',
    "startPrice" INTEGER NOT NULL,
    "currentBid" INTEGER NOT NULL,
    "minStep" INTEGER NOT NULL DEFAULT 50,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionBid" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "bidder" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "auctionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatModAction" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "modPhone" TEXT NOT NULL,
    "modName" TEXT NOT NULL DEFAULT '',
    "targetPhone" TEXT NOT NULL DEFAULT '',
    "targetName" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatModAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPrediction" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'parent',
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRsvp" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'parent',
    "childTeamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentSession" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "childTeamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '30 days'::interval),

    CONSTRAINT "ParentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolOverride" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT 'admin',

    CONSTRAINT "ProtocolOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolAuditLog" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT 'admin',

    CONSTRAINT "ProtocolAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playoff" (
    "id" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "semifinal1TeamA" TEXT,
    "semifinal1TeamB" TEXT,
    "semifinal1ScoreA" INTEGER,
    "semifinal1ScoreB" INTEGER,
    "semifinal2TeamA" TEXT,
    "semifinal2TeamB" TEXT,
    "semifinal2ScoreA" INTEGER,
    "semifinal2ScoreB" INTEGER,
    "finalTeamA" TEXT,
    "finalTeamB" TEXT,
    "finalScoreA" INTEGER,
    "finalScoreB" INTEGER,
    "thirdPlaceTeamA" TEXT,
    "thirdPlaceTeamB" TEXT,
    "thirdPlaceScoreA" INTEGER,
    "thirdPlaceScoreB" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTables" (
    "id" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "groupA" TEXT[],
    "groupB" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupTables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tour_ageGroup_idx" ON "Tour"("ageGroup");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_ageGroup_order_key" ON "Tour"("ageGroup", "order");

-- CreateIndex
CREATE INDEX "Group_ageGroup_idx" ON "Group"("ageGroup");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTeam_groupId_teamId_key" ON "GroupTeam"("groupId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_teamId_key" ON "Standing"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_referralCode_key" ON "AdminUser"("referralCode");

-- CreateIndex
CREATE INDEX "HpLog_userId_idx" ON "HpLog"("userId");

-- CreateIndex
CREATE INDEX "HpLog_createdAt_idx" ON "HpLog"("createdAt");

-- CreateIndex
CREATE INDEX "ReferralLog_referrerId_idx" ON "ReferralLog"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralLog_refereeId_idx" ON "ReferralLog"("refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLog_referrerId_refereeId_key" ON "ReferralLog"("referrerId", "refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_key_key" ON "SiteSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "GuestContact_phone_key" ON "GuestContact"("phone");

-- CreateIndex
CREATE INDEX "MvpVote_gameId_idx" ON "MvpVote"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "MvpVote_gameId_voterPhone_key" ON "MvpVote"("gameId", "voterPhone");

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_idx" ON "ChatMessage"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReaction_messageId_phone_emoji_key" ON "ChatReaction"("messageId", "phone", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "ChatModerator_phone_key" ON "ChatModerator"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ChatBan_phone_key" ON "ChatBan"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "TvMatch_url_key" ON "TvMatch"("url");

-- CreateIndex
CREATE INDEX "TvMatch_createdAt_idx" ON "TvMatch"("createdAt");

-- CreateIndex
CREATE INDEX "TvMatch_matchDate_idx" ON "TvMatch"("matchDate");

-- CreateIndex
CREATE UNIQUE INDEX "NbaSchedule_gameId_key" ON "NbaSchedule"("gameId");

-- CreateIndex
CREATE INDEX "NbaSchedule_gameTime_idx" ON "NbaSchedule"("gameTime");

-- CreateIndex
CREATE INDEX "NbaSchedule_status_idx" ON "NbaSchedule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_gameId_key" ON "LiveSession"("gameId");

-- CreateIndex
CREATE INDEX "LiveSession_gameTime_idx" ON "LiveSession"("gameTime");

-- CreateIndex
CREATE INDEX "LiveSession_isActive_idx" ON "LiveSession"("isActive");

-- CreateIndex
CREATE INDEX "LiveSession_searchCompleted_idx" ON "LiveSession"("searchCompleted");

-- CreateIndex
CREATE INDEX "UserStream_gameId_idx" ON "UserStream"("gameId");

-- CreateIndex
CREATE INDEX "UserStream_gameTime_idx" ON "UserStream"("gameTime");

-- CreateIndex
CREATE INDEX "UserStream_isActive_idx" ON "UserStream"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMute_phone_key" ON "ChatMute"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMvpVote_voterPhone_month_key" ON "ChatMvpVote"("voterPhone", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ChatDailyFirstMsg_phone_day_key" ON "ChatDailyFirstMsg"("phone", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ChatDailySpin_phone_day_key" ON "ChatDailySpin"("phone", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ChatStreak_phone_key" ON "ChatStreak"("phone");

-- CreateIndex
CREATE INDEX "ChatOnline_room_idx" ON "ChatOnline"("room");

-- CreateIndex
CREATE INDEX "ChatOnline_lastSeen_idx" ON "ChatOnline"("lastSeen");

-- CreateIndex
CREATE INDEX "ChatPollVote_pollId_idx" ON "ChatPollVote"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPollVote_pollId_voterPhone_key" ON "ChatPollVote"("pollId", "voterPhone");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_playerId_badgeId_key" ON "PlayerAchievement"("playerId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaLike_phone_mediaType_mediaKey_key" ON "MediaLike"("phone", "mediaType", "mediaKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChatGameAttendance_gameId_phone_key" ON "ChatGameAttendance"("gameId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_orderNumber_key" ON "ShopOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundCheckin_phone_key" ON "PlaygroundCheckin"("phone");

-- CreateIndex
CREATE INDEX "MatchPrediction_gameId_idx" ON "MatchPrediction"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPrediction_gameId_phone_key" ON "MatchPrediction"("gameId", "phone");

-- CreateIndex
CREATE INDEX "GameRsvp_gameId_idx" ON "GameRsvp"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRsvp_gameId_phone_key" ON "GameRsvp"("gameId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "ParentSession_token_key" ON "ParentSession"("token");

-- CreateIndex
CREATE INDEX "ParentSession_token_idx" ON "ParentSession"("token");

-- CreateIndex
CREATE INDEX "ProtocolOverride_gameId_idx" ON "ProtocolOverride"("gameId");

-- CreateIndex
CREATE INDEX "ProtocolAuditLog_gameId_idx" ON "ProtocolAuditLog"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Playoff_ageGroup_key" ON "Playoff"("ageGroup");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTables_ageGroup_key" ON "GroupTables"("ageGroup");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeam" ADD CONSTRAINT "GroupTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeam" ADD CONSTRAINT "GroupTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSubstitution" ADD CONSTRAINT "GameSubstitution_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSubstitution" ADD CONSTRAINT "GameSubstitution_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSubstitution" ADD CONSTRAINT "GameSubstitution_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameOnCourt" ADD CONSTRAINT "GameOnCourt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameOnCourt" ADD CONSTRAINT "GameOnCourt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameOnCourt" ADD CONSTRAINT "GameOnCourt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxScore" ADD CONSTRAINT "BoxScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxScore" ADD CONSTRAINT "BoxScore_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxScore" ADD CONSTRAINT "BoxScore_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HpLog" ADD CONSTRAINT "HpLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_viewers" ADD CONSTRAINT "tv_viewers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tv_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPollVote" ADD CONSTRAINT "ChatPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ChatPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "AuctionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolOverride" ADD CONSTRAINT "ProtocolOverride_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolAuditLog" ADD CONSTRAINT "ProtocolAuditLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

