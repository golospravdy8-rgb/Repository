# 🔍 DIAGNOSTIC FINDINGS — PLAYOFF GENERATION BUG
## Summary of Analysis (2026-05-08)

> **Note:** This is what I (the AI assistant) found during my initial diagnostic.
> Claude Code will conduct its own comprehensive analysis using the diagnostic prompt.

---

## 🚨 ROOT CAUSE (SUMMARY)

**Foreign Key Constraint Violation**

When button "⚡ Згенерувати плей-офф" is clicked, the API endpoint `/api/games/playoff` attempts to create 4 Game records with `homeTeamId: 0` and `awayTeamId: 0` (placeholder values), but there is NO Team record with ID = 0 in the database. This violates the Foreign Key constraint `Game_awayTeamId_fkey`, causing all 4 INSERT operations to fail with:

```
Invalid `prisma.game.create()` invocation:
Foreign key constraint violated: `Game_awayTeamId_fkey (index)`
```

---

## 📍 FAILURE LAYER

**Backend + Database Constraint Violation**

The failure occurs in the API route handler, specifically during Prisma game creation.

---

## ✅ / ❌ EXECUTION FLOW

```
✅ Step 1: Button click
   Handler: ScheduleTab.tsx:266 handleGeneratePlayoff()

✅ Step 2: Confirmation dialog
   User confirms action

✅ Step 3: API request sent
   POST /api/games/playoff
   Body: { ageGroup: "younger" }

✅ Step 4: Backend receives request
   Route: app/api/games/playoff/route.ts:7

✅ Step 5: Validate ageGroup
   Check: ["younger", "older"].includes(ageGroup)
   Result: PASS

✅ Step 6: Find active season
   Query: prisma.season.findFirst({ isActive: true, ageGroup })
   Result: Found (e.g., seasonId = 1)

✅ Step 7: Check for existing playoff games
   Query: prisma.game.findFirst({ stage: { not: null } })
   Result: No blocking games found (or already exist)

❌ Step 8: Create 4 playoff games
   Attempt 1: prisma.game.create({ homeTeamId: 0, awayTeamId: 0, ... })
   Error: Foreign Key constraint violated - Team ID 0 does not exist
   
   Attempt 2-4: Same error (all 4 INSERT operations fail)

❌ Step 9: Catch exception
   Route handler catches Prisma error
   Returns: { error: "Internal server error" }, status: 500

❌ Step 10: Frontend receives error
   setError("Internal server error")
   Button shows error in UI (if user looks at it)
   showPlayoffForm NOT set to true
   router.refresh() NOT called

❌ Step 11: No page refresh
   Schedule page NOT revalidated
   Playoff data NOT refetched
   UI shows old data (or "no data" if this is first attempt)

❌ Step 12: Result
   User sees: "Дані плей-офф ще не додані" OR old playoff data
   Playoff NOT created
   Error silent (unless user checks error message)
```

---

## 🔴 PROBLEMATIC CODE

### File 1: `app/api/games/playoff/route.ts` (Lines 47-98)

**Problem:** Creating Game with invalid placeholder teamId values

```typescript
// Lines 47-57 (Semifinal 1)
prisma.game.create({
  data: {
    seasonId: season.id,
    homeTeamId: 0,    // ❌ PROBLEM: No Team with ID 0 exists
    awayTeamId: 0,    // ❌ PROBLEM: Violates FK constraint
    scheduledAt: semifinalDate,
    status: "SCHEDULED",
    stage: "semifinal",
    sourceA: "A1",
    sourceB: "B2",
  },
}),
// ... Lines 60-98: Same pattern for 3 more games
```

**Why it fails:**
- Schema defines: `awayTeam Team @relation(fields: [awayTeamId], references: [id])`
- This creates FK constraint: awayTeamId MUST reference valid Team.id
- Valid Team IDs in DB: 1, 5, 6, 7, 8, 9, 10, 11, 18, 19, ...
- ID 0 does not exist → constraint violation

---

## 📊 ERROR LOGS

From server terminal when `/api/games/playoff` POST is called:

```
prisma:error 
Invalid `prisma.game.create()` invocation:

Foreign key constraint violated: `Game_awayTeamId_fkey (index)`
[playoff-post] PrismaClientKnownRequestError: 
Invalid `prisma.game.create()` invocation:

Foreign key constraint violated: `Game_awayTeamId_fkey (index)`
    at $n.handleRequestError (node_modules/@prisma/client/...)
    ...stack trace...

 POST /api/games/playoff 500 in 947ms
```

**Happens 4 times** (one for each game creation attempt)

---

## 📁 FILES INVOLVED

**Frontend:**
- `app/admin/site-editor/tabs/ScheduleTab.tsx` (lines 266-291)
  - Button click handler
  - API fetch call
  - Error handling

**Backend:**
- `app/api/games/playoff/route.ts` (lines 7-105) ← MAIN PROBLEM
  - POST handler
  - Season lookup
  - Game creation with invalid teamId
  - Error catch block

- `app/api/playoff/route.ts` (lines 7-80)
  - GET handler to fetch playoff data
  - Fetches from Playoff table and Game table

**Database/Prisma:**
- `prisma/schema.prisma`
  - `model Game` (lines 88-161)
  - `model Team` (lines 21-39)
  - `model Season` (lines 10-19)
  - `model Playoff` (lines 788-821)

**Components:**
- `components/public/PlayoffBracket.tsx` (lines 31-39)
  - Renders playoff or empty state
  - Condition: `if (!playoff) return "Дані плей-офф ще не додані"`

---

## 💾 DATABASE STATE

**Playoff table HAS data:**
```
ageGroup: "younger"
- semifinal1TeamA: "КИЕВ"
- semifinal1TeamB: "ЛЬВІВ"
- semifinal1ScoreA: 10
- semifinal1ScoreB: 8
- (etc. from previous manual entries)

ageGroup: "older"
- semifinal1TeamA: "йййй"
- semifinal1TeamB: "ввв"
- (etc. from previous manual entries)
```

**Team table:**
- Valid IDs: 1, 5, 6, 7, 8, 9, 10, 11, 18, 19
- NO ID = 0
- NO ID = negative values

**Game table:**
- Has records with stage = "semifinal", "final", "third_place"
- But likely have placeholder/invalid teamId OR manually set teamId

---

## 🔧 TYPE/ENUM CONSISTENCY

**Status:** ✅ GOOD — No enum mismatches found

- `ageGroup` values: "younger" | "older" (consistent everywhere)
- `stage` values: "semifinal" | "final" | "third_place" (hardcoded in route)
- `sourceA`/`sourceB` values: "A1", "B1", "Winner SF1", etc. (descriptive)
- All enum values match between frontend, backend, and database

---

## 💡 SAFE FIX STRATEGY (No Code)

**Problem:** Game creation uses invalid placeholder teamId values

**Solution Options (choose one):**

**Option A: Use NULL for teamId**
- Instead of `homeTeamId: 0, awayTeamId: 0`
- Use: `homeTeamId: null, awayTeamId: null`
- Requires: Game schema allows nullable teamId (check schema)
- Advantage: Stores playoff structure without team assignment

**Option B: Use real Team IDs**
- Query standings to get top teams
- Use valid Team ID from database
- Example: `homeTeamId: topTeams[0].id, awayTeamId: topTeams[1].id`
- Advantage: Teams are already assigned

**Option C: Store in Playoff table only**
- Don't create Game records
- Store only in Playoff table (already has semifinal1TeamA, etc.)
- Frontend fetches from /api/playoff directly
- Advantage: Simpler, avoids FK constraints

**Option D: Create placeholder teams**
- Pre-create "Team A", "Team B" with known IDs
- Use those IDs in playoff games
- Not recommended: confuses with real teams

**Implementation order:**
1. Choose Option A, B, or C
2. Modify `/api/games/playoff/route.ts` to use chosen approach
3. Add `revalidatePath()` to ScheduleTab handler after successful response
4. Test locally with curl
5. Deploy to Vercel

---

## 📌 CONCLUSION

The playoff generation fails because the API tries to insert Game records with invalid foreign key values (Team ID 0). The database correctly rejects these attempts with a constraint violation. The fix requires either using NULL for teamId, using valid existing Team IDs, or changing the architecture to not use Game table for playoff storage.

---

**Analysis conducted:** 2026-05-08  
**Analysis type:** Manual diagnostic  
**Status:** Ready for Claude Code formal diagnosis
