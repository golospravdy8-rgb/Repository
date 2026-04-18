# 🏀 Basketball Protocol Enhancement Plan

**Project:** basketball.lviv.ua  
**Date:** 2026-04-18  
**Status:** PLANNING & IMPLEMENTATION  

---

## Current State Analysis

### ✅ What We Have
- **Database (Prisma):** PostgreSQL with Game, Player, BoxScore, GameEvent models
- **Admin Dashboard:** LiveScoreTracker component at `/admin/games/{id}`
- **Server Actions:** Game actions (addScore, addFoul, etc.) in `actions/game.ts`
- **Event System:** GameEvent model with types (POINTS, FOUL, etc.)
- **Box Score:** Tracks points, rebounds, assists, steals, blocks, fouls, turnovers
- **Existing Fields:** minutes, isStarter, reboundsDef, reboundsOff

### ❌ What's Missing

**Database Fields:**
- `plusMinus` (Int) — per-player +/- statistic
- `efficiency` (Float) — calculated EFF score
- `minutesPlayed` (Int) — total minutes in game
- `fgMade`, `fgAttempted` (Int) — field goal tracking
- `fg2Made`, `fg2Attempted` (Int) — 2-point tracking
- `fg3Made`, `fg3Attempted` (Int) — 3-point tracking
- `ftMade`, `ftAttempted` (Int) — free throw tracking

**Game-Level Fields:**
- `ptsOffTurnovers` (Int) — points after opponent turnovers
- `ptsFastBreak` (Int) — points in fast break
- `ptsSecondChance` (Int) — points after offensive rebound
- `ptsAfterSubstitutions` (Int) — bench scoring
- `biggestLead` (Int) — largest point spread
- `biggestRun` (Int) — longest consecutive points

**New Tables:**
- `GameSubstitution` — track player in/out with timing
- `GameOnCourt` — track which 5 players per team on court

**UI/UX Issues:**
- Dashboard missing "Substitution" button
- No tracking of who's on court
- No ability to mark point type (fast break, second chance, etc.)
- No +/- calculation
- Missing timeout counter (0/2 per team)
- Protocol missing EFF and +/- columns

---

## Implementation Plan

### Phase 1: Database Schema Updates ✅ PLANNED

**File:** `prisma/schema.prisma`

**New Migration:**
```sql
-- Add fields to BoxScore
ALTER TABLE BoxScore ADD COLUMN plusMinus INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN efficiency FLOAT DEFAULT 0.0;
ALTER TABLE BoxScore ADD COLUMN minutesPlayed INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN fgMade INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN fgAttempted INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN fg2Made INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN fg2Attempted INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN fg3Made INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN fg3Attempted INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN ftMade INT DEFAULT 0;
ALTER TABLE BoxScore ADD COLUMN ftAttempted INT DEFAULT 0;

-- Add fields to Game
ALTER TABLE Game ADD COLUMN ptsOffTurnovers INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN ptsFastBreak INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN ptsSecondChance INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN ptsAfterSubstitutions INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN biggestLead INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN biggestRun INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN awayPtsOffTurnovers INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN awayPtsFastBreak INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN awayPtsSecondChance INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN awayPtsAfterSubstitutions INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN awayBiggestLead INT DEFAULT 0;
ALTER TABLE Game ADD COLUMN awayBiggestRun INT DEFAULT 0;

-- New tables
CREATE TABLE GameSubstitution (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gameId INT NOT NULL,
  playerId INT NOT NULL,
  teamId INT NOT NULL,
  action ENUM('in', 'out'),
  quarter INT,
  gameTime VARCHAR(10),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gameId) REFERENCES Game(id),
  FOREIGN KEY (playerId) REFERENCES Player(id),
  FOREIGN KEY (teamId) REFERENCES Team(id)
);

CREATE TABLE GameOnCourt (
  gameId INT,
  playerId INT,
  teamId INT,
  onCourt BOOLEAN DEFAULT false,
  PRIMARY KEY (gameId, playerId),
  FOREIGN KEY (gameId) REFERENCES Game(id),
  FOREIGN KEY (playerId) REFERENCES Player(id),
  FOREIGN KEY (teamId) REFERENCES Team(id)
);

-- Add event type tracking
ALTER TABLE GameEvent ADD COLUMN eventSubtype VARCHAR(50);
-- Subtypes: 'normal', 'fastbreak', 'second_chance', 'off_turnover'
```

### Phase 2: Schema Update in Prisma ✅ PLANNED

**Updates to `prisma/schema.prisma`:**

```prisma
model BoxScore {
  id               Int     @id @default(autoincrement())
  gameId           Int
  playerId         Int
  teamId           Int
  points           Int     @default(0)
  rebounds         Int     @default(0)
  assists          Int     @default(0)
  steals           Int     @default(0)
  blocks           Int     @default(0)
  fouls            Int     @default(0)
  minutes          Int     @default(0)
  minutesPlayed    Int     @default(0)     // NEW: MM:SS format or just total
  isStarter        Boolean @default(false)
  
  // Field Goal tracking
  fgMade           Int     @default(0)     // NEW: total FG made
  fgAttempted      Int     @default(0)     // NEW: total FG attempted
  fg2Made          Int     @default(0)     // NEW: 2-pointers made
  fg2Attempted     Int     @default(0)     // NEW: 2-pointers attempted
  fg3Made          Int     @default(0)     // NEW: 3-pointers made
  fg3Attempted     Int     @default(0)     // NEW: 3-pointers attempted
  ftMade           Int     @default(0)     // NEW: free throws made
  ftAttempted      Int     @default(0)     // NEW: free throws attempted
  
  missedFg2        Int     @default(0)
  missedFg3        Int     @default(0)
  missedFt         Int     @default(0)
  reboundsDef      Int     @default(0)
  reboundsOff      Int     @default(0)
  turnovers        Int     @default(0)
  
  // New statistics
  plusMinus        Int     @default(0)     // NEW: +/- per player
  efficiency       Float   @default(0.0)   // NEW: EFF = (pts + reb + ast + stl + blk) - (fgmiss + ftmiss + tov)
  
  game             Game    @relation(fields: [gameId], references: [id])
  player           Player  @relation(fields: [playerId], references: [id])
  team             Team    @relation(fields: [teamId], references: [id])
}

model Game {
  id               Int          @id @default(autoincrement())
  seasonId         Int
  homeTeamId       Int
  awayTeamId       Int
  scheduledAt      DateTime
  status           String       @default("SCHEDULED")
  quarter          Int          @default(1)
  homeScore        Int          @default(0)
  awayScore        Int          @default(0)
  
  // Home team advanced stats
  ptsOffTurnovers  Int          @default(0)      // NEW: points after opponent turnovers
  ptsFastBreak     Int          @default(0)      // NEW: points in fast breaks
  ptsSecondChance  Int          @default(0)      // NEW: points after offensive rebound
  ptsAfterSubst    Int          @default(0)      // NEW: bench player points
  biggestLead      Int          @default(0)      // NEW: largest point spread
  biggestRun       Int          @default(0)      // NEW: longest scoring streak
  
  // Away team advanced stats
  awayPtsOffTurnovers Int       @default(0)      // NEW
  awayPtsFastBreak    Int       @default(0)      // NEW
  awayPtsSecondChance Int       @default(0)      // NEW
  awayPtsAfterSubst   Int       @default(0)      // NEW
  awayBiggestLead     Int       @default(0)      // NEW
  awayBiggestRun      Int       @default(0)      // NEW
  
  boxScores        BoxScore[]
  awayTeam         Team         @relation("AwayTeam", fields: [awayTeamId], references: [id])
  homeTeam         Team         @relation("HomeTeam", fields: [homeTeamId], references: [id])
  season           Season       @relation(fields: [seasonId], references: [id])
  events           GameEvent[]
  substitutions    GameSubstitution[]
  onCourt          GameOnCourt[]
}

model GameEvent {
  id               Int          @id @default(autoincrement())
  gameId           Int
  playerId         Int?
  teamId           Int
  type             String
  points           Int?
  quarter          Int
  eventSubtype     String?      // NEW: 'normal', 'fastbreak', 'second_chance', 'off_turnover'
  createdAt        DateTime     @default(now())
  game             Game         @relation(fields: [gameId], references: [id])
  player           Player?      @relation(fields: [playerId], references: [id])
}

model GameSubstitution {
  id               Int          @id @default(autoincrement())
  gameId           Int
  playerId         Int
  teamId           Int
  action           String       // 'in' or 'out'
  quarter          Int?
  gameTime         String?      // e.g., "5:23" for time in quarter
  createdAt        DateTime     @default(now())
  game             Game         @relation(fields: [gameId], references: [id])
  player           Player       @relation(fields: [playerId], references: [id])
  team             Team         @relation(fields: [teamId], references: [id])
}

model GameOnCourt {
  gameId           Int
  playerId         Int
  teamId           Int
  onCourt          Boolean      @default(false)
  game             Game         @relation(fields: [gameId], references: [id])
  player           Player       @relation(fields: [playerId], references: [id])
  team             Team         @relation(fields: [teamId], references: [id])
  
  @@id([gameId, playerId])
}
```

### Phase 3: Game Actions Updates ✅ PLANNED

**New actions in `actions/game.ts`:**

1. **Substitution tracking** — `addSubstitution(gameId, playerOut, playerIn, teamId)`
2. **Update on-court players** — `updateOnCourt(gameId, playerId, teamId, onCourt)`
3. **Event with subtype** — Enhance `addScore()` to support eventSubtype
4. **Calculate +/-** — Auto-update on-court players' plusMinus when scoring
5. **Calculate EFF** — Auto-update efficiency after each box score change

### Phase 4: Dashboard UI Updates ✅ PLANNED

**Updates to `LiveScoreTracker.tsx`:**

1. Add "On Court Players" display (5 highlighted)
2. Add "Substitution" button → modal for in/out selection
3. Add event type selector before scoring (Normal / Fast Break / Second Chance / Off Turnover)
4. Add timeout counter (0/2)
5. Add command fouls counter per quarter

### Phase 5: Protocol Display Updates ✅ PLANNED

**Updates to game protocol page:**

1. Add `EFF` column to player stats table
2. Add `+/-` column to player stats table
3. Add "Team Advanced Stats" section at bottom with:
   - Points off turnovers
   - Points in fast breaks
   - Points second chance
   - Biggest lead
   - Biggest run

---

## Timeline

| Phase | Component | Estimated Time |
|-------|-----------|-----------------|
| 1 | Database Migration | 15 min |
| 2 | Prisma Schema Update | 20 min |
| 3 | Server Actions | 45 min |
| 4 | Dashboard UI | 1-2 hours |
| 5 | Protocol Display | 30 min |
| - | Testing & Fixes | 1 hour |
| **TOTAL** | | **4-5 hours** |

---

## Success Criteria

✅ Database schema supports all new fields  
✅ Players tracked in real-time on court  
✅ Substitutions logged with proper timing  
✅ EFF calculated and displayed  
✅ +/- tracked per player  
✅ Protocol shows all FIBA-standard columns  
✅ Team advanced stats displayed  
✅ Dashboard UI intuitive for live score entry  

---

**Next Step:** Start with Phase 1 (Database Migration)
