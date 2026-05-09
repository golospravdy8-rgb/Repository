-- Add timer state persistence to Game model
ALTER TABLE "Game" ADD COLUMN "currentTimeLeft" INTEGER NOT NULL DEFAULT 600;
ALTER TABLE "Game" ADD COLUMN "timerRunning" BOOLEAN NOT NULL DEFAULT false;
