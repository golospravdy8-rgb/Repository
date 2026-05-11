-- AddColumn lineupPosition to BoxScore
-- 1-5 = position in active lineup, 0 = bench player

ALTER TABLE "BoxScore" ADD COLUMN "lineupPosition" INTEGER NOT NULL DEFAULT 0;
