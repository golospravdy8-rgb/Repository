-- Add secondaryPlayerId field to GameEvent for proper SUBSTITUTION tracking
ALTER TABLE "GameEvent" ADD COLUMN "secondaryPlayerId" INTEGER;

-- Add foreign key constraint
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_secondaryPlayerId_fkey" FOREIGN KEY ("secondaryPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for faster lookups
CREATE INDEX "GameEvent_secondaryPlayerId_idx" ON "GameEvent"("secondaryPlayerId");
