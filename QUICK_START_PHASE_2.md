# ⚡ Quick Start — Phase 2 Dashboard Integration

**Current Status:** Phase 1 Complete ✅  
**Next Step:** Phase 2 - Testing & QA  
**Time to Complete Phase 2:** 2-3 days

---

## 🎮 What You Can Do Now (In Code)

### Test the New Actions

```typescript
// Test scoring with event type
await addScoreWithType(gameId, teamId, playerId, 2, "normal");
await addScoreWithType(gameId, teamId, playerId, 3, "fastbreak");
await addScoreWithType(gameId, teamId, playerId, 2, "second_chance");
await addScoreWithType(gameId, teamId, playerId, 1, "off_turnover");

// Check +/- calculation
const boxScore = await prisma.boxScore.findUnique({
  where: { id: boxScoreId }
});
console.log(boxScore.plusMinus); // Should be +/- points based on team's scores while on-court

// Check advanced team stats
const game = await prisma.game.findUnique({ where: { id: gameId } });
console.log(game.ptsFastBreak);    // Fast break points
console.log(game.ptsSecondChance); // Second chance points
console.log(game.ptsOffTurnovers); // Points after turnovers
```

### Query On-Court Players

```typescript
// Get all on-court players for a team
const onCourt = await prisma.gameOnCourt.findMany({
  where: { gameId, teamId, onCourt: true },
  include: { player: true }
});

// Get starting 5
const starters = onCourt.map(ocp => ({
  number: ocp.player.number,
  name: `${ocp.player.firstName} ${ocp.player.lastName}`,
  position: ocp.player.position
}));
```

### Initialize Game with Starting 5

```typescript
// In your game start function
const team = await prisma.team.findUnique({
  where: { id: teamId },
  include: { players: { orderBy: { number: 'asc' } } }
});

const starters = team.players.slice(0, 5); // First 5 by number

for (const starter of starters) {
  await updateOnCourt(gameId, starter.id, teamId, true);
}
```

---

## 📱 Phase 3 UI Changes Required

### New Components to Add

**1. OnCourtDisplay.tsx**
```typescript
// Show 5 highlighted on-court players
// Used to verify who's active for scoring
interface OnCourtDisplayProps {
  gameId: number;
  teamId: number;
}
```

**2. SubstitutionModal.tsx**
```typescript
// Select player OUT (from on-court 5)
// Select player IN (from bench)
// Call: addSubstitution(gameId, teamId, outId, inId, quarter, time)
```

**3. EventTypeSelector.tsx**
```typescript
// Before clicking score button, select:
// • Normal
// • Fast Break ⚡
// • Second Chance 🔄
// • Off Turnover 💥
// Then: addScoreWithType(..., eventSubtype)
```

### Buttons to Update

Replace in LiveScoreTracker:
```typescript
// OLD: +1, +2, +3
// NEW: +1, +2, +3 with event type selector
//      OR: separate buttons like:
//          [+2 Normal] [+2 Fast Break] [+2 Sec Chance] [+2 Off Turnover]
//      OR: dropdown before clicking score
```

---

## 🧪 Testing Checklist for Phase 2

### Database Tests
- [ ] Test game initialization (set starting 5)
- [ ] Check GameOnCourt records created
- [ ] Verify BoxScore records have plusMinus field
- [ ] Query Game table has all new fields

### Scoring Tests
```javascript
// Test normal score
await addScoreWithType(gameId, teamId, playerId, 2, "normal");
// Check: 
// ✅ Game.homeScore incremented by 2
// ✅ BoxScore.points incremented
// ✅ BoxScore.plusMinus updated for on-court players
// ✅ GameEvent created with eventSubtype="normal"

// Test fast break
await addScoreWithType(gameId, teamId, playerId, 3, "fastbreak");
// Check:
// ✅ Game.ptsFastBreak incremented by 3
// ✅ All above checks

// Test second chance
await addScoreWithType(gameId, teamId, playerId, 2, "second_chance");
// Check:
// ✅ Game.ptsSecondChance incremented by 2

// Test off turnover
await addScoreWithType(gameId, teamId, playerId, 1, "off_turnover");
// Check:
// ✅ Game.ptsOffTurnovers incremented by 1
```

### Substitution Tests
```javascript
// Log substitution
await addSubstitution(gameId, teamId, playerOutId, playerInId, 2, "6:45");
// Check:
// ✅ GameSubstitution records created (both out + in)
// ✅ GameOnCourt updated (out player onCourt=false, in player onCourt=true)
// ✅ Next score event uses updated on-court list
```

### +/- Calculation Tests
```javascript
// Setup: Home team players A, B, C, D, E on court
// Score: A scores 2 points
// Expected: A gets +2, B, C, D, E each get +2, away team all get -2
// Verify: 
const boxScores = await prisma.boxScore.findMany({ 
  where: { gameId, playerId: { in: [A, B, C, D, E] } } 
});
boxScores.forEach(bs => {
  console.assert(bs.plusMinus === 2, `Expected +2, got ${bs.plusMinus}`);
});
```

---

## 📊 New Database Fields Reference

### BoxScore
```
fgMade: 0              // Field goals made
fgAttempted: 0         // Field goals attempted
fg2Made: 0             // 2-pointers made
fg2Attempted: 0        // 2-pointers attempted
fg3Made: 0             // 3-pointers made
fg3Attempted: 0        // 3-pointers attempted
ftMade: 0              // Free throws made
ftAttempted: 0         // Free throws attempted
minutesPlayed: null    // "MM:SS" format
plusMinus: 0           // +/- statistic
efficiency: 0.0        // EFF score
```

### Game
```
// Home team
ptsOffTurnovers: 0     // Points after opponent turnovers
ptsFastBreak: 0        // Fast break points
ptsSecondChance: 0     // Offensive rebound points
ptsAfterSubstitutions: 0
biggestLead: 0         // Max point spread
biggestRun: 0          // Longest streak

// Away team (prefixed with 'away')
awayPtsOffTurnovers: 0
awayPtsFastBreak: 0
awayPtsSecondChance: 0
awayPtsAfterSubstitutions: 0
awayBiggestLead: 0
awayBiggestRun: 0
```

### GameEvent
```
eventSubtype: "normal"  // or: "fastbreak", "second_chance", "off_turnover"
```

### GameSubstitution (New Table)
```
id: 1
gameId: 1
playerId: 5
teamId: 2
action: "out"           // or "in"
quarter: 2
gameTime: "5:23"
createdAt: 2026-04-18T...
```

### GameOnCourt (New Table)
```
gameId: 1
playerId: 5
teamId: 2
onCourt: true
```

---

## 🎯 What Gets Displayed in Protocol (Phase 4)

### Box Score (Player Stats)
```
№ | PLAYER      | POS | ОЧК | КП | %КД | 2О | %2 | 3О | %3 | ШТ | %ШТ | ПД | ЗПД | ПДБ | ПЕР | ВТ | БЛК | ПРХ | ФОЛ | EFF | +/-
1  | A. Osmukha  | PF  | 24  | 8  | 50  | 5  |60  | 3  | 33 | 2  | 100 | 5  | 2   | 3   | 1   | 2  | 1   | 1   | 2   | 19  | +8
```

### Advanced Team Stats
```
HOME TEAM STATISTICS
Points After Opponent Turnovers:  18
Points in Fast Breaks:            14
Points from Second Chance:        12
Points After Substitutions:       8
Biggest Lead:                     +15
Biggest Run:                      10 consecutive
```

---

## 🔗 File Locations

**Backend:**
- `/actions/game.ts` — All new server actions
- `/prisma/schema.prisma` — Database schema

**Upcoming (Phase 3):**
- `/components/live-tracker/OnCourtDisplay.tsx` — new
- `/components/live-tracker/SubstitutionModal.tsx` — new
- `/components/live-tracker/EventTypeSelector.tsx` — new
- `/components/live-tracker/LiveScoreTracker.tsx` — update

**Upcoming (Phase 4):**
- `/app/(public)/game/[id]/page.tsx` — protocol display

---

## ✅ Ready for Phase 2?

- [x] Database schema applied
- [x] Server actions compiled
- [x] Build successful
- [x] Deployed to GitHub
- [x] Documentation complete

**Status: Ready to begin Phase 2 testing!**

Next: Create test game and verify +/- calculations work correctly.

---

**Created:** 2026-04-18  
**Phase:** 1 ✅ | 2 (next) | 3 | 4 | 5  
**Est. Completion:** 2-3 days for all phases
