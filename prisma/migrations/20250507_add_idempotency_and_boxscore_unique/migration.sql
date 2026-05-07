-- Add idempotencyKey to GameEvent
ALTER TABLE "GameEvent" ADD COLUMN "idempotencyKey" TEXT UNIQUE;

-- Add unique constraint to BoxScore
ALTER TABLE "BoxScore" ADD CONSTRAINT "BoxScore_gameId_playerId_key" UNIQUE ("gameId", "playerId");
