-- Add onDelete: Cascade to GameOnCourt and BoxScore relations
ALTER TABLE "GameOnCourt" DROP CONSTRAINT "GameOnCourt_gameId_fkey";
ALTER TABLE "GameOnCourt" ADD CONSTRAINT "GameOnCourt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BoxScore" DROP CONSTRAINT "BoxScore_gameId_fkey";
ALTER TABLE "BoxScore" ADD CONSTRAINT "BoxScore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
