# DIAGNOSTIC REPORT 5: CLEAN ARCHITECTURE & RECOMMENDATIONS

**Generated:** 2026-05-11

---

## I. TARGET ARCHITECTURE (POST-FIXES)

### A. Data Layer (Prisma + Transactions)

**Current State:** ✅ GOOD
- Single Prisma client instance (assumed `lib/prisma.ts`)
- Transactions used for atomic operations
- Cascade deletes configured

**Target State:** ✅ MAINTAIN

```
┌─────────────────────────────────────────────┐
│ Database Layer                              │
├─────────────────────────────────────────────┤
│                                             │
│  Prisma ORM                                 │
│  ├─ lib/prisma.ts (singleton)               │
│  ├─ Schema (SSOT for all data)              │
│  └─ Migrations                              │
│                                             │
│  Transaction Types:                         │
│  ├─ recordGameAction() → atomic             │
│  ├─ recordSubstitution() → atomic           │
│  ├─ initializeGameData() → atomic           │
│  └─ END_GAME → atomic + verification       │
│                                             │
└─────────────────────────────────────────────┘
```

---

### B. Business Logic Layer (Server Actions)

**Current State:** ✅ GOOD
- Server actions in `app/actions/` and `actions/`
- Proper use of `"use server"` directive
- Transaction wrapping

**Target State:** ✅ MAINTAIN & CONSOLIDATE

```
┌──────────────────────────────────────────────────┐
│ Server Actions (Business Logic)                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ app/actions/game-events.ts (PRIMARY):            │
│ ├─ recordGameAction()          ← USE THIS       │
│ ├─ recordSubstitution()        ← USE THIS       │
│ ├─ undoGameAction()            ← USE THIS       │
│ ├─ updateGameTime()            ← USE THIS       │
│ └─ initializeGameData()        ← USE THIS       │
│                                                  │
│ actions/game.ts (LEGACY - CONSOLIDATE):         │
│ ├─ addScore()                  → MIGRATE        │
│ ├─ addFoul()                   → MIGRATE        │
│ ├─ syncAchievements()          → MIGRATE        │
│ └─ ...                         → MIGRATE        │
│                                                  │
│ GOAL: Single source for game mutations          │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Migration Plan:**
```typescript
// actions/game.ts (DEPRECATED)
export async function addScore(
  gameId: number,
  teamId: number,
  playerId: number,
  points: 1 | 2 | 3
) {
  // OLD WAY - multiple separate mutations
  await prisma.game.update({...});
  await prisma.gameEvent.create({...});
  await prisma.boxScore.upsert({...});
}

// INSTEAD, use app/actions/game-events.ts
export async function recordGameAction(payload: GameActionPayload) {
  // NEW WAY - single atomic transaction
  // All mutations happen together or not at all
}

// Migration path:
// 1. Update imports in client components
// 2. Replace calls to addScore() with recordGameAction()
// 3. Deploy and monitor
// 4. After 1 week: Remove actions/game.ts
```

---

### C. API Layer (Endpoints)

**Current State:** ⚠️ MIXED QUALITY

**Target State:** 🎯 CLEAN

```
┌────────────────────────────────────────────────────┐
│ API Routes (External Integration Only)             │
├────────────────────────────────────────────────────┤
│                                                    │
│ KEEP (Public APIs):                               │
│ ├─ /api/games                      [GET/POST]    │
│ ├─ /api/games/[id]/events          [GET]        │
│ ├─ /api/games/[id]/protocol-data   [GET]        │
│ └─ /api/teams, /api/standings, etc [GET]        │
│                                                   │
│ DELETE (Legacy/Duplicate):                        │
│ ├─ /api/games/[id]/score           [DELETE] ←  │
│ ├─ /api/admin/games/[id]/stat      [DELETE] ←  │
│ └─ /api/admin/games/[id]/boxscore  [FIX]    ←  │
│                                                   │
│ PATTERN: Admin → use server actions              │
│          Public → use read-only API               │
│                                                   │
└────────────────────────────────────────────────────┘
```

**Endpoint Guidelines:**

| Use Case | Transport | Method |
|----------|-----------|--------|
| Admin creates game | Server action | `recordGameAction()` |
| Admin updates stats | Server action | `recordGameAction()` |
| Admin imports scores | Server action | `recordGameAction()` (bulk) |
| Public views game | API route | `/api/games/[id]` [GET] |
| Public gets events | API route | `/api/games/[id]/events` [GET] |
| Mobile app scores | **NEW:** Mobile action layer | Webhook → server action |

---

### D. Component Layer (Client-Side)

**Current State:** ✅ GOOD

**Pattern Analysis:**
```
LiveScoreTracker.tsx (Client Component)
├─ Uses: recordGameAction() server action
├─ State: Local UI state (roster order, etc.)
├─ Re-render: After server action returns
└─ ✅ CORRECT - Server action → data refresh

DraggableRosterPanel.tsx (Memo'd Component)
├─ Uses: recordSubstitution() server action
├─ State: Local drag state
├─ Re-render: After substitution completes
└─ ✅ CORRECT - Drag → server action → list updates

GameProtocol.tsx (Server Component)
├─ Uses: Prisma queries directly
├─ Data: Fetched server-side
├─ Re-render: On route change or revalidatePath
└─ ✅ CORRECT - SSR, no client mutations
```

**Target State:** ✅ MAINTAIN

---

## II. SINGLE SOURCE OF TRUTH PROPOSAL

### Current SSOT Map (Verified)

```
GAME STATE:
  Game.homeScore        ← SSOT for home team points
  Game.awayScore        ← SSOT for away team points
  Game.status           ← SSOT for game state
  Game.quarter          ← SSOT for quarter number
  Game.currentTimeLeft  ← SSOT for timer

PLAYER COURT STATUS:
  BoxScore.isOnCourt        ← SSOT for on-court/bench
  BoxScore.lineupPosition   ← SSOT for position (0 = bench, 1-5 = active)
  BoxScore.enteredAt        ← SSOT for entry time (gameClockSeconds)
  BoxScore.timeOnCourtSeconds ← SSOT for accumulated court time

PLAYER STATS:
  BoxScore.points       ← SSOT for player points
  BoxScore.rebounds     ← SSOT for total rebounds
  BoxScore.assists      ← SSOT for player assists
  ... (all numeric fields)

AUDIT TRAIL:
  GameEvent.*           ← SSOT for action log
  GameSubstitution.*    ← SSOT for sub log
```

### Verification at End-Game

```typescript
// Verification logic (IMPORTANT - protects integrity)
const allBoxScores = await tx.boxScore.findMany({ where: { gameId } });

// Verify points sum matches game score
const homePoints = allBoxScores
  .filter(bs => bs.teamId === game.homeTeamId)
  .reduce((sum, bs) => sum + (bs.points || 0), 0);

if (homePoints !== game.homeScore) {
  // Current: Log error, allow game to finish
  // Recommended: HALT and alert (see Report 4)
}
```

---

## III. COMPONENT HIERARCHY

### Optimal Structure

```
app/
├── (public)/
│   └── game/
│       └── [id]/
│           ├── page.tsx                ← Server component (SSR)
│           │   ├─ Fetch: Game + boxscores + events
│           │   ├─ Render: GameProtocol (server component)
│           │   └─ Render: LiveScoreTracker (client component)
│           │
│           ├── secretarial-protocol/
│           │   └── page.tsx            ← Server component (SSR)
│           │
│           ├── error.tsx               ← Error boundary
│           ├── not-found.tsx           ← 404 handler
│           └── loading.tsx             ← Skeleton (optional)
│
├── admin/
│   └── games/
│       └── [id]/
│           └── page.tsx                ← Admin dashboard (SSR)
│               ├─ Fetch: Game + boxscores + timeline
│               ├─ Render: GameInfoForm (manages game metadata)
│               ├─ Render: LiveScoreTracker (score tracking)
│               └─ Render: StatEntryGrid (stat editing)
│
└── api/
    ├── games/
    │   ├── route.ts                    ← [GET/POST] Create game
    │   └── [id]/
    │       ├── score/
    │       │   └── route.ts            ← [DELETE - deprecate]
    │       ├── events/
    │       │   └── route.ts            ← [GET] Fetch events
    │       └── protocol-data/
    │           └── route.ts            ← [GET] FIBA protocol
    │
    ├── admin/
    │   ├── games/
    │   │   └── [id]/
    │   │       ├── stat/
    │   │       │   └── route.ts        ← [DELETE - move to action]
    │   │       └── boxscore/
    │   │           └── route.ts        ← [REFACTOR - use upsert]
    │   └── ...
    │
    └── ... (other APIs: teams, players, standings, etc.)
```

---

## IV. MIGRATION PRIORITY (By Week)

### Week 1: Emergency Fixes (CRITICAL)

**Goal:** Eliminate data loss risks

**Tasks:**
1. Add transaction to `/api/admin/games/[id]/stat` ✅ [1 day]
2. Replace deleteMany with upsert in `/api/admin/games/[id]/boxscore` ✅ [1 day]
3. Add idempotency to `/api/games/[id]/score` ✅ [1 day]
4. Test full game scenario (init → play → sub → end) ✅ [2 days]
5. Deploy to staging + monitor ✅ [1 day]

**Owner:** Senior engineer  
**Review:** Code review by 2 reviewers  
**Testing:** E2E test suite

---

### Week 2: Code Quality (HIGH)

**Goal:** Reduce query overhead and improve code organization

**Tasks:**
1. Extract time formatting to `lib/format-time.ts` ✅ [1 day]
2. Optimize N+1 query in recordGameAction ✅ [1 day]
3. Fix score verification logic (emit vs correct) ✅ [1 day]
4. Add rate limiting to API endpoints ✅ [1 day]
5. Test + deploy ✅ [2 days]

**Owner:** Mid-level engineer + QA  
**Review:** Code review + performance testing

---

### Week 3-4: Architecture Consolidation (MEDIUM)

**Goal:** Unify game mutation paths

**Tasks:**
1. Consolidate `actions/game.ts` into `app/actions/game-events.ts`
2. Update all client components to use consolidated actions
3. Deprecate legacy endpoints (return 410 Gone)
4. Test all game flows
5. Deploy + monitor

**Owner:** Senior architect + team  
**Review:** Architecture review + integration testing

---

### Week 5+: Cleanup & Optimization (LOW)

**Goal:** Technical debt

**Tasks:**
1. Remove deprecated fields from schema (fgMade, minutes, etc.)
2. Create migration script
3. Remove backup files
4. Remove test/debug routes from production
5. Performance audit

---

## V. WHAT NOT TO CHANGE

### Immutable Patterns

Do NOT refactor these without extensive testing:

1. **recordSubstitution() Logic**
   - Position inheritance: `lineupPosition: outPosition`
   - Time calculation: `gameClockSeconds - enteredAt`
   - Shift tracking: `shiftStartHomeScore`, `shiftStartAwayScore`

2. **BoxScore Schema Keys**
   - `gameId_playerId` composite primary key
   - All tracking fields: `enteredAt`, `isOnCourt`, `timeOnCourtSeconds`
   - All foul breakdown fields: `foulsPersonal`, `foulsTechnical`, etc.

3. **Game Status Transitions**
   - `SCHEDULED → LIVE → [PAUSED ↔ LIVE] → FINISHED`
   - Don't add new statuses without schema migration

4. **GameEvent Type Enum**
   - FIBA requires specific event types
   - Event log is permanent (audit trail)
   - Don't remove or rename types

---

## VI. DOCUMENTATION REQUIREMENTS

### By Component

| Component | Needs | Status |
|-----------|-------|--------|
| recordGameAction() | JSDoc + examples | ⚠️ MISSING |
| recordSubstitution() | JSDoc + examples | ⚠️ MISSING |
| BoxScore schema | Entity relationship diagram | ⚠️ MISSING |
| Game state machine | State transition diagram | ✅ DOCUMENTED IN COMMENTS |
| API endpoints | OpenAPI/Swagger spec | ⚠️ MISSING |

### Add to Codebase

```typescript
/**
 * Record a game action (score, foul, rebound, etc.)
 * 
 * @param payload - Game action with type, player, timestamp
 * @returns Success status and updated game state
 * 
 * @example
 * const result = await recordGameAction({
 *   gameId: 5,
 *   actionType: "POINTS",
 *   playerId: 12,
 *   quarter: 1,
 *   gameClockSeconds: 250,
 *   payload: { points: 2, isFreeThrow: false }
 * });
 * 
 * @example
 * // Substitution
 * const result = await recordGameAction({
 *   gameId: 5,
 *   actionType: "SUBSTITUTION",
 *   playerId: null,
 *   quarter: 1,
 *   gameClockSeconds: 250,
 *   payload: { playerOutId: 12, playerInId: 15 }
 * });
 * 
 * @see GameActionPayload for detailed type definition
 */
export async function recordGameAction(payload: GameActionPayload): Promise<RecordGameActionResult>
```

---

## VII. METRICS & SUCCESS CRITERIA

### Before Fixes
```
- Critical bugs: 3
- Race conditions: 2
- Silent failures: 1
- Code duplication: 3 patterns
- Test coverage: Unknown
- Uptime SLA: Unknown
```

### After Fixes (Target)
```
- Critical bugs: 0 ✅
- Race conditions: 0 ✅
- Silent failures: 0 ✅
- Code duplication: 0 ✅
- Test coverage: > 80% (game critical paths) 🎯
- Uptime SLA: 99.5% (production) 🎯
```

### Key Metrics to Monitor

| Metric | Target | Tool |
|--------|--------|------|
| API response time (P95) | < 500ms | New Relic / Vercel Analytics |
| Database query count per request | < 5 | DataDog / query logging |
| Error rate (5xx) | < 0.1% | Sentry / logs |
| Cache hit rate | > 85% | Vercel Cache Analytics |
| Score verification failures | 0 | Custom metric |

---

## VIII. DEPLOYMENT CHECKLIST

### Pre-Deployment (Dev)

- [ ] All 3 critical fixes implemented
- [ ] Code review approved by 2 reviewers
- [ ] Linter passes: `npm run lint`
- [ ] Type check passes: `npx tsc --noEmit`
- [ ] Build passes: `npm run build`
- [ ] All unit tests pass
- [ ] Manual E2E test: Full game scenario
  - [ ] Start game
  - [ ] Add scores (10+ times)
  - [ ] Substitute players (5+ times)
  - [ ] Verify DB state
  - [ ] End game
  - [ ] Check leaderboard updates
  - [ ] Verify protocol renders

### Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Performance test: 100 concurrent users
- [ ] Monitor logs for errors
- [ ] Verify score accuracy with backup system
- [ ] Check cache invalidation timing
- [ ] Test error scenarios (network failures, timeouts)

### Production Deployment

- [ ] Blue-green deployment setup
- [ ] Backup database before deploy
- [ ] Deploy to 10% of traffic first
- [ ] Monitor error rates for 30 min
- [ ] Monitor response times for 30 min
- [ ] Verify game scores post-deployment
- [ ] Gradually roll to 100% traffic
- [ ] Keep rollback procedure ready (< 5 min)

### Post-Deployment (24h)

- [ ] Monitor error rate (should stay < 0.1%)
- [ ] Monitor response times (should stay < 500ms P95)
- [ ] Check game completion rate (should be 100%)
- [ ] Verify all leaderboards updated correctly
- [ ] Review logs for warnings/errors
- [ ] Get user feedback (no score issues?)

---

## IX. ARCHITECTURE DIAGRAM (Post-Fixes)

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│                                                         │
│  Browser (Desktop/Mobile)                              │
│  ├─ LiveScoreTracker.tsx (score, lineup, subs)        │
│  ├─ GameProtocol.tsx (display FIBA protocol)          │
│  ├─ RosterPanel.tsx (drag-drop substitutions)         │
│  └─ StatEntryGrid.tsx (admin stat entry)              │
│                                                         │
└────────────────┬──────────────────────────────────────┘
                 │
                 │ fetch() / server action
                 │
┌────────────────▼──────────────────────────────────────┐
│                  SERVER LAYER (Next.js)               │
│                                                       │
│  Server Components (SSR):                            │
│  ├─ app/(public)/game/[id]/page.tsx                  │
│  ├─ app/admin/games/[id]/page.tsx                    │
│  └─ GameProtocol.tsx (server)                        │
│                                                       │
│  Server Actions (Business Logic):                    │
│  ├─ recordGameAction()        ✅ PRIMARY             │
│  ├─ recordSubstitution()      ✅ PRIMARY             │
│  ├─ initializeGameData()      ✅ PRIMARY             │
│  └─ updateGameTime()          ✅ PRIMARY             │
│                                                       │
│  API Routes (Public Read):                           │
│  ├─ GET /api/games/[id]                              │
│  ├─ GET /api/games/[id]/events                       │
│  ├─ GET /api/standings                               │
│  └─ GET /api/players                                 │
│                                                       │
└────────────────┬──────────────────────────────────────┘
                 │
                 │ Prisma ORM
                 │ @transaction
                 │
┌────────────────▼──────────────────────────────────────┐
│              DATA LAYER (PostgreSQL)                  │
│                                                       │
│  Tables (SSOT):                                      │
│  ├─ Game         (score, status, timer, quarter)     │
│  ├─ BoxScore     (player stats, court status)        │
│  ├─ GameEvent    (audit trail, score log)            │
│  ├─ Substitution (lineup changes log)                │
│  ├─ Team, Player (master data)                       │
│  └─ Standing     (season rankings)                   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## X. FINAL RECOMMENDATIONS

### Immediate Actions (Next Commit)

1. **🔴 CRITICAL:** Apply all 3 fixes from Report 4
2. **🟡 HIGH:** Add JSDoc to key functions
3. **🟢 GOOD:** Add this diagnostic suite to `/docs/DIAGNOSTICS.md`

### Short-Term (This Sprint)

1. ✅ Deploy critical fixes
2. ✅ Extract utilities (time formatting)
3. ✅ Optimize queries (N+1)
4. ✅ Monitor metrics

### Medium-Term (Next Sprint)

1. ✅ Consolidate game actions
2. ✅ Deprecate legacy endpoints
3. ✅ Update documentation
4. ✅ Performance testing

### Long-Term (Next Quarter)

1. ✅ Remove deprecated code
2. ✅ Schema optimization
3. ✅ API versioning (v2)
4. ✅ Mobile-specific optimizations

---

## XI. CONCLUSION

**Overall Assessment:** The basket-lviv project has a **SOLID FOUNDATION** with a few critical bugs that need immediate attention.

**Key Strengths:**
- ✅ Proper transaction usage for atomic operations
- ✅ Server actions instead of multiple API endpoints
- ✅ Clean component separation
- ✅ FIBA-compliant event logging
- ✅ User-facing functionality working well

**Key Weaknesses:**
- 🔴 3 race conditions in API endpoints
- 🔴 Destructive deleteMany without safeguards
- 🔴 Missing idempotency checks
- 🟡 Some N+1 queries
- 🟡 Silent failure in score verification

**Path Forward:**
1. **Week 1:** Fix critical bugs (3 items)
2. **Week 2:** Optimize performance + quality
3. **Week 3-4:** Architecture consolidation
4. **Week 5+:** Technical debt cleanup

**Expected Outcome:** Production-grade system with 99.5% uptime, zero silent failures, and clear code ownership.

---

**Report Authors:** Senior Engineer + Software Architect  
**Review Date:** 2026-05-11  
**Next Review:** 2026-06-11 (post-fixes)

---

**End of Report 5 - Full Diagnostic Complete**

---

## APPENDIX: QUICK REFERENCE

### File Structure (Key Files)

```
basket-lviv/
├── DIAGNOSTIC_REPORT_1_FULL_AUDIT.md          ← You are here
├── DIAGNOSTIC_REPORT_2_SOURCES_OF_TRUTH.md    ← Data flow
├── DIAGNOSTIC_REPORT_3_SAFE_CLEANUP_PLAN.md   ← Refactoring
├── DIAGNOSTIC_REPORT_4_PRODUCTION_RISKS.md    ← Bugs + fixes
├── DIAGNOSTIC_REPORT_5_CLEAN_ARCHITECTURE.md  ← This file
│
├── prisma/
│   └── schema.prisma                          ← SSOT definitions
│
├── app/
│   ├── (public)/game/[id]/page.tsx           ← Game viewer
│   ├── admin/games/[id]/page.tsx             ← Admin dashboard
│   ├── api/games/[id]/score/route.ts         ← 🔴 DEPRECATE
│   ├── api/admin/games/[id]/stat/route.ts    ← 🔴 FIX
│   └── api/admin/games/[id]/boxscore/route.ts ← 🔴 FIX
│
├── app/actions/
│   └── game-events.ts                        ← ✅ PRIMARY HANDLER
│
├── actions/
│   └── game.ts                               ← ⚠️ LEGACY, consolidate
│
└── components/
    ├── live-tracker/
    │   ├── LiveScoreTracker.tsx              ← Main UI
    │   ├── LiveScoreTracker.tsx.backup       ← 🔴 DELETE
    │   └── StatEntryGrid.tsx                 ← Admin stats
    └── GameProtocol.tsx                       ← FIBA protocol display
```

### Critical Fixes (Copy-Paste Ready)

See DIAGNOSTIC_REPORT_4_PRODUCTION_RISKS.md for:
- CRITICAL-001: Race condition fix (transactional)
- CRITICAL-002: Delete → Upsert fix
- CRITICAL-003: Idempotency fix

### Commands Checklists

```bash
# Validate before commit
npm run build
npx tsc --noEmit
npm run lint

# Test after fixes
npm run test
npm run test:e2e

# Deploy to staging
vercel deploy --prod  # staging environment

# Monitor in production
# - Vercel Analytics
# - Error tracking (Sentry)
# - Database monitoring (DataDog)
```

---

**All Reports Complete** ✅
