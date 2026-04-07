-- Remove unused BoxScore fields (legacy data from old site)
ALTER TABLE "BoxScore" DROP COLUMN IF EXISTS "minutes";
ALTER TABLE "BoxScore" DROP COLUMN IF EXISTS "missedFg2";
ALTER TABLE "BoxScore" DROP COLUMN IF EXISTS "missedFg3";
ALTER TABLE "BoxScore" DROP COLUMN IF EXISTS "missedFt";
ALTER TABLE "BoxScore" DROP COLUMN IF EXISTS "reboundsDef";
ALTER TABLE "BoxScore" DROP COLUMN IF EXISTS "reboundsOff";
ALTER TABLE "BoxScore" DROP COLUMN IF EXISTS "turnovers";
