# ✅ FIBA EVENT ENGINE — APPROVAL CHECKLIST

## 📋 Что было создано (ПЕРЕД реальной реализацией)

### ✅ Документы (4 файла)
- [x] `FIBA_SCHEMA_PROPOSAL.md` — Updated Prisma models
- [x] `FIBA_ARCHITECTURE_DIAGRAM.md` — Data flows + type graphs
- [x] `FIBA_IMPLEMENTATION_PLAN.md` — Next steps
- [x] `APPROVAL_CHECKLIST.md` — этот файл

### ✅ TypeScript исходные файлы (4 файла)

#### 1. `lib/fiba/types.ts` (600 lines)
- [x] FibaAction Union type (11 вариантов)
- [x] FieldGoalAction (2PT, 3PT, MISS)
- [x] FreeThrowAction
- [x] ReboundAction (OFF, DEF)
- [x] AssistAction
- [x] StealAction
- [x] BlockAction
- [x] TurnoverAction
- [x] FoulAction (4 типа: P, T, U, D + Coach)
- [x] SubstitutionAction
- [x] TimeoutAction
- [x] QuarterAction
- [x] FibaEventResult interface
- [x] BoxScoreStats interface
- [x] FIBA_RULES constants
- [x] Helper function: getFoulCount()

#### 2. `lib/fiba/fiba-event-engine.ts` (800+ lines)
- [x] recordFibaEvent() — main entry point
- [x] handleFieldGoal() — 2PT, 3PT, MISS
- [x] handleFreeThrow()
- [x] handleRebound() — OFF, DEF
- [x] handleAssist()
- [x] handleSteal()
- [x] handleBlock()
- [x] handleTurnover()
- [x] handleFoul() — with auto-DQ logic
- [x] handleSubstitution() — with court time calc
- [x] handleTimeout()
- [x] All handlers use Prisma.$transaction()
- [x] All handlers return FibaEventResult
- [x] QUARTER_DURATION_SECONDS constant

#### 3. `lib/fiba/stats-calculator.ts` (500+ lines)
- [x] calculateEfficiency() — FIBA formula
- [x] formatCourtTime() — MM:SS format
- [x] getPlayerCourtTime() — with current segment
- [x] calculatePlusMinus() — framework
- [x] calculateFGPercentage()
- [x] formatPercentage()
- [x] calculatePlayerStats() — bulk calculation
- [x] getTeamFoulCount()
- [x] isTeamInBonus()

#### 4. `lib/fiba/legacy-wrappers.ts` (600+ lines)
- [x] addScoreWithType() — main scoring wrapper
- [x] addScore() — deprecated
- [x] addReboundDef(), addReboundOff(), addRebound()
- [x] addAssist()
- [x] addSteal(), addBlock(), addTurnover()
- [x] addMissFg2(), addMissFg3(), addMissFt()
- [x] addFoul(), addFoulTechnical(), addFoulUnsportsmanlike(), addFoulDisqualifying()
- [x] addCoachFoul()
- [x] addSubstitution()
- [x] addTimeout()
- [x] addFreeThrow() — if separate endpoint
- [x] updatePlayerCourtTimes() — no-op with note
- [x] updateGameTimerState() — game state persist

---

## 🎯 ARCHITECTURE REVIEW

### ✅ Type Safety
- [x] FibaAction is exhaustive Union — no string literals
- [x] Each action has required fields enforced by TypeScript
- [x] FibaEventResult is typed with optional validation

### ✅ Single Responsibility
- [x] recordFibaEvent() routes only, doesn't repeat logic
- [x] Each handler has ONE responsibility
- [x] stats-calculator.ts is separate from event recording
- [x] types.ts contains only interfaces + constants

### ✅ Backward Compatibility
- [x] All legacy function signatures preserved
- [x] Legacy functions are thin wrappers (2-5 lines)
- [x] No breaking changes to LiveScoreTracker.tsx
- [x] Achievement sync can be re-added in actions/game.ts

### ✅ FIBA Compliance
- [x] fouledPlayerId captures "who was fouled"
- [x] gameClockSeconds stores exact timing
- [x] foulType split by FIBA categories (P/T/U/D)
- [x] ftSequence for free throw series
- [x] Auto-DQ on 5 personal fouls
- [x] Efficiency calculated by FIBA formula
- [x] Court time tracks per-segment

### ✅ Transaction Safety
- [x] Every handler wraps in Prisma.$transaction()
- [x] Each transaction is atomic (all-or-nothing)
- [x] No partial updates possible
- [x] Error handling returns FibaEventResult.success = false

### ✅ Extensibility
- [x] New action types can be added to Union without breaking existing
- [x] New handlers can follow pattern
- [x] Legacy wrappers can be deprecated gradually
- [x] FIBA rules enforced in engine (not in UI)

---

## 📊 CODE QUALITY

### ✅ Comments & Docs
- [x] Every type documented with JSDoc
- [x] Every function has example usage
- [x] Constants have explanations
- [x] handlers have step-by-step comments

### ✅ Error Handling
- [x] recordFibaEvent validates game status
- [x] FibaEventResult captures errors
- [x] handlers use try-catch around transactions
- [x] Validation info passed back to caller

### ✅ Naming Conventions
- [x] Consistent naming (addScore, addFoul, etc.)
- [x] Clear action type names (FIELD_GOAL, REBOUND, FOUL)
- [x] Clear subtype names (2PT, 3PT, MISS_2PT, REBOUND_OFF, etc.)
- [x] Constants in UPPER_SNAKE_CASE

---

## 🚀 READY FOR NEXT PHASE

To proceed with ACTUAL IMPLEMENTATION:

### Phase 1: Schema & Migration
- [ ] Run FIBA_SCHEMA_PROPOSAL.md migrations
- [ ] Update prisma/schema.prisma
- [ ] Generate Prisma client
- [ ] Apply database migration

### Phase 2: Code Integration
- [ ] Create lib/fiba/ directory structure
- [ ] Copy 4 TypeScript files:
  - [ ] types.ts
  - [ ] fiba-event-engine.ts
  - [ ] stats-calculator.ts
  - [ ] legacy-wrappers.ts
- [ ] Test imports compile

### Phase 3: actions/game.ts Refactoring
- [ ] Replace function bodies with legacy wrapper imports
- [ ] Re-add achievement sync logic (if needed)
- [ ] Re-add revalidatePath calls
- [ ] Test all button clicks in LiveScoreTracker

### Phase 4: SecretarialProtocol Updates
- [ ] Update to use new BoxScore fields
- [ ] Display fg2Made-fg2Attempted (2P%)
- [ ] Display fg3Made-fg3Attempted (3P%)
- [ ] Display ftMade-ftAttempted (FT%)
- [ ] Display fouls breakdown (P/T/U/D)
- [ ] Optionally add running score

### Phase 5: Testing & QA
- [ ] Test +1, +2, +3 buttons
- [ ] Test all foul types (P/T/U/D)
- [ ] Test 5+ fouls DQ
- [ ] Test substitutions + court time
- [ ] Verify protocol displays correctly
- [ ] Verify PDF export quality

---

## ⚠️ POTENTIAL ISSUES & SOLUTIONS

### Issue 1: Achievement Sync
**Problem:** Old addScore() called syncAchievements()  
**Solution:** Keep in actions/game.ts wrapper, not in legacy-wrapper  
```typescript
export async function addScore(...) {
  await addScoreWithType(...);
  const newAchievements = await syncAchievements(playerId);
  revalidatePath(...);
  return { newAchievements };
}
```

### Issue 2: fouledPlayerId Missing
**Problem:** UI doesn't track "who was fouled"  
**Solution:** fouledPlayerId is optional in PersonalFoulAction  
```typescript
// Currently: no fouledPlayerId captured
// Future: can add UI select if needed
// For now: fouledPlayerId = null
```

### Issue 3: Plus/Minus Calculation
**Problem:** Requires event-by-event court time tracking  
**Solution:** Framework in place, implementation deferred to Phase 2  
```typescript
// Framework function exists
// Simplified version (always 0) acceptable for MVP
```

### Issue 4: Free Throws Series
**Problem:** How to track FT sequence (1st, 2nd, 3rd)?  
**Solution:** ftSequence in FreeThrowAction  
```typescript
// Manually passed from UI (or auto-incremented)
// Current UI: counts 3 separate clicks as 3 separate scoring actions
// OK for now, can be optimized later
```

---

## 📝 APPROVAL SIGNOFF

### Questions for User:

1. **Schema changes approved?**
   - [ ] Yes, proceed with migration
   - [ ] No, need modifications (specify)

2. **Type design approved?**
   - [ ] Yes, looks complete
   - [ ] No, need additions (specify)

3. **Handler logic approved?**
   - [ ] Yes, ready for implementation
   - [ ] No, need changes (specify)

4. **Legacy wrappers approach approved?**
   - [ ] Yes, maintain full backward compat
   - [ ] No, prefer different approach (specify)

5. **Statistics calculations approved?**
   - [ ] Yes, FIBA formulas correct
   - [ ] No, need adjustments (specify)

6. **Next phase (actual implementation) approved?**
   - [ ] Yes, proceed to Phase 1
   - [ ] No, gather more requirements

---

## ✅ IF APPROVED:

Once all ✅ checks above, proceed with:

1. **DB Migration** (5 min)
2. **File Creation** (5 min)
3. **Integration Testing** (30 min)
4. **UI Testing** (30 min)
5. **Build Verification** (5 min)

**Total estimated time:** 1-2 hours

---

## 📌 FINAL SUMMARY

**What's been designed:**
- ✅ Type-safe FibaAction system (11 action types)
- ✅ Central recordFibaEvent() engine with 10 handlers
- ✅ FIBA-compliant statistics calculations
- ✅ Backward-compatible legacy wrappers
- ✅ Zero UI changes required
- ✅ Full atomic transaction safety
- ✅ Auto-DQ, court time tracking, foul breakdown

**What's ready to be implemented:**
- ✅ Prisma schema updates
- ✅ 4 TypeScript source files
- ✅ Integration into actions/game.ts
- ✅ SecretarialProtocol component updates

**What's deferred to Phase 2:**
- [ ] Full Plus/Minus tracking (framework in place)
- [ ] Free Throw series automation (manual for now)
- [ ] Running score display (possible with events)
- [ ] PDF quality improvements (@react-pdf/renderer)

---

**STATUS: READY FOR APPROVAL ✅**

User should review above and confirm:
```
ЗАТВЕРДЖУЮ КРОК 1: Schema + Types + Engine Architecture
```

Then we proceed to actual implementation.

