# 🏀 FIBA Protocol Enhancement — Phase 1 Complete

**Status:** ✅ **DATABASE SCHEMA & SERVER ACTIONS COMPLETE**  
**Date:** 2026-04-18  
**Commit:** `ccb3dae`

---

## 📊 What's Been Implemented

### Phase 1: Database Schema ✅ COMPLETE

**BoxScore Model Updates:**
- ✅ `fgMade` (Int) — field goals made
- ✅ `fgAttempted` (Int) — field goals attempted
- ✅ `fg2Made`, `fg2Attempted` (Int) — 2-point tracking
- ✅ `fg3Made`, `fg3Attempted` (Int) — 3-point tracking
- ✅ `ftMade`, `ftAttempted` (Int) — free throws made/attempted
- ✅ `minutesPlayed` (String) — time on court (e.g., "MM:SS")
- ✅ `plusMinus` (Int) — +/- per player
- ✅ `efficiency` (Float) — calculated EFF score

**Game Model Updates:**
- ✅ `ptsOffTurnovers`, `awayPtsOffTurnovers` — points after opponent turnovers
- ✅ `ptsFastBreak`, `awayPtsFastBreak` — points in fast breaks
- ✅ `ptsSecondChance`, `awayPtsSecondChance` — points from offensive rebounds
- ✅ `ptsAfterSubstitutions`, `awayPtsAfterSubstitutions` — bench scoring
- ✅ `biggestLead`, `awayBiggestLead` — largest point spreads
- ✅ `biggestRun`, `awayBiggestRun` — longest consecutive point streaks

**GameEvent Model Updates:**
- ✅ `eventSubtype` (String) — supports: 'normal', 'fastbreak', 'second_chance', 'off_turnover'

**New Tables:**
- ✅ `GameSubstitution` — logs player in/out with:
  - gameId, playerId, teamId, action (in/out), quarter, gameTime, createdAt
- ✅ `GameOnCourt` — tracks active players per team:
  - gameId, playerId, teamId, onCourt (boolean)
  - Composite primary key: (gameId, playerId)

**Migrations:**
- ✅ Applied via `npx prisma db push`
- ✅ Prisma Client regenerated
- ✅ Schema synced with database

---

### Phase 2: Server Actions ✅ COMPLETE

**New Actions in `actions/game.ts`:**

#### 1. **addSubstitution()**
```typescript
export async function addSubstitution(
  gameId: number,
  teamId: number,
  playerOutId: number,
  playerInId: number,
  quarter: number,
  gameTime: string
)
```
- Logs two substitution events (out + in)
- Updates GameOnCourt status
- Triggers revalidation

#### 2. **updateOnCourt()**
```typescript
export async function updateOnCourt(
  gameId: number,
  playerId: number,
  teamId: number,
  onCourt: boolean
)
```
- Upserts on-court player status
- Supports game initialization (setting starting 5)

#### 3. **addScoreWithType()** ⭐ MAJOR
```typescript
export async function addScoreWithType(
  gameId: number,
  teamId: number,
  playerId: number,
  points: 1 | 2 | 3,
  eventSubtype: "normal" | "fastbreak" | "second_chance" | "off_turnover" = "normal"
)
```
**Features:**
- Increments correct score (home or away)
- Logs event with subtype
- Updates BoxScore.points
- **AUTO-CALCULATES +/-:**
  - Finds all on-court players for scoring team
  - Increments their plusMinus by points
  - Finds all on-court players for opponent
  - Decrements their plusMinus by points
- **TRACKS ADVANCED STATS:**
  - If fastbreak → increments `ptsFastBreak`
  - If second_chance → increments `ptsSecondChance`
  - If off_turnover → increments `ptsOffTurnovers`
- Handles all on-court updates in single transaction

#### 4. **recalcGameEfficiency()**
```typescript
export async function recalcGameEfficiency(gameId: number)
```
- Recalculates EFF for all players in game
- Formula: `(pts + reb + ast + stl + blk) - (fgmiss + ftmiss + tov)`
- Updates all BoxScore.efficiency fields

#### 5. **calculateEfficiency()** (utility)
```typescript
function calculateEfficiency(boxScore: any): number
```
- Non-exported helper function
- Computes EFF score from box score data

---

## 🏗️ Architecture

### Transaction Safety
All scoring and substitution updates use `prisma.$transaction()` to ensure:
- No partial updates if errors occur
- Consistent +/- calculations
- Atomic game score updates

### On-Court Player Tracking
```
Game Start → Initialize 5 players per team with onCourt=true
During Game → updateOnCourt() / addSubstitution() maintain state
Score Event → addScoreWithType() reads current onCourt players for +/- calc
```

### +/- Calculation Flow
```
1. Score event occurs (playerId on teamId scores points)
2. Query: find all GameOnCourt where gameId=X, teamId=teamId, onCourt=true
3. For each: upsert BoxScore with plusMinus += points
4. Query: find all GameOnCourt where gameId=X, teamId!=teamId, onCourt=true
5. For each: upsert BoxScore with plusMinus -= points
6. Single transaction commits all updates
```

---

## ⏭️ Next Phases (To Be Implemented)

### Phase 3: Dashboard UI Enhancements
- [ ] Display on-court players (5 highlighted)
- [ ] Add "Substitution" button with modal (select in/out players)
- [ ] Event type selector before scoring (Normal / Fast Break / Second Chance / Off Turnover)
- [ ] Timeout counter (0/2 per team)
- [ ] Team fouls counter per quarter
- [ ] Biggest lead / biggest run real-time displays

### Phase 4: Protocol Display Updates
- [ ] Add `EFF` column to player stats table
- [ ] Add `+/-` column to player stats table
- [ ] Add "Team Advanced Stats" section:
  - Points off turnovers
  - Points in fast breaks
  - Points second chance
  - Points after substitutions
  - Biggest lead
  - Biggest run

### Phase 5: Automatic Calculations
- [ ] Biggest lead tracking (update max on every score)
- [ ] Biggest run streak tracking (reset on opponent score)
- [ ] FG/FT percentage calculations (trigger on every attempted shot)
- [ ] Minutes played auto-calc (from substitution timing)

---

## 📝 Testing Checklist

**Database:**
- [x] Schema applies without errors
- [x] Prisma Client regenerates successfully
- [x] New tables/fields accessible via prisma
- [x] Migrations are idempotent

**Server Actions:**
- [x] addSubstitution compiles
- [x] updateOnCourt compiles
- [x] addScoreWithType compiles with async/await properly
- [x] recalcGameEfficiency compiles
- [x] Build succeeds with no TypeScript errors
- [ ] Runtime testing (after UI integration)

---

## 🔗 Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | +75 lines (schema updates) |
| `actions/game.ts` | +180 lines (5 new actions) |
| Total | **+255 lines** |

**Build Status:** ✅ Successful  
**Deploy Status:** ✅ Pushed to GitHub  

---

## 🎯 Success Criteria (Phase 1)

✅ Database supports all new fields  
✅ Substitution tracking implemented  
✅ On-court player status maintained  
✅ +/- auto-calculated per player  
✅ Advanced stats tracked (fast break, second chance, etc.)  
✅ EFF calculation available  
✅ Build and deploy successful  

**All Phase 1 criteria met!**

---

## 📖 How to Use (For Dashboard Implementation)

### Initialize Game with Starting 5
```typescript
// For each team
const starters = homeTeam.players.filter(p => p.isStarter).slice(0, 5);
for (const player of starters) {
  await updateOnCourt(gameId, player.id, player.teamId, true);
}
```

### Handle Scoring with Event Type
```typescript
// Simple score
await addScoreWithType(gameId, teamId, playerId, 2, "normal");

// Fast break
await addScoreWithType(gameId, teamId, playerId, 3, "fastbreak");

// Second chance
await addScoreWithType(gameId, teamId, playerId, 2, "second_chance");

// Points after turnover
await addScoreWithType(gameId, teamId, playerId, 1, "off_turnover");
```

### Handle Substitution
```typescript
// Player #5 out, Player #12 in
await addSubstitution(gameId, teamId, playerId_5, playerId_12, currentQuarter, "5:23");
```

### Recalculate Efficiencies (Post-Game)
```typescript
await recalcGameEfficiency(gameId);
```

---

**Phase 1 Status: ✅ COMPLETE & DEPLOYED**

Next: Implement Phase 3 (Dashboard UI) to make these features available in the live score tracker.
