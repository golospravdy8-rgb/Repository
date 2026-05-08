-- Add time tracking fields to GameOnCourt
ALTER TABLE "GameOnCourt" ADD COLUMN "timeOnCourtSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameOnCourt" ADD COLUMN "lastSubInTimestamp" INTEGER;
ALTER TABLE "GameOnCourt" ADD COLUMN "isStarter" BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient queries by game
CREATE INDEX "GameOnCourt_gameId_idx" ON "GameOnCourt"("gameId");
