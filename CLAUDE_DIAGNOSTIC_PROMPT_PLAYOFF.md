# 🔍 CLAUDE CODE DIAGNOSTIC PROMPT
## Playoff Generation System — Complete Technical Diagnosis

**Version:** 2.0  
**Date:** 2026-05-08  
**Purpose:** Deep technical diagnosis WITHOUT any fixes  
**Mode:** Analysis only — NO code changes  

---

## 📋 CONTEXT

**Project:** basket-lviv (Next.js 14 Full-Stack Basketball Championship)

**Problem Statement:**
```
Button: "⚡ Згенерувати плей-офф" 
Location: http://localhost:3006/admin/site-editor
Expected: Creates 4 playoff games automatically
Actual: Button click fails silently with Internal Server Error
Result page: http://localhost:3006/schedule?ag=older shows "Дані плей-офф ще не додані"
```

**Tech Stack:**
- Frontend: Next.js 14 + React 19 + TypeScript
- Backend: API Routes + Server Actions
- Database: PostgreSQL + Prisma ORM
- Local: http://localhost:3006
- Production: https://basketball.lviv.ua

---

## 🎯 YOUR TASK

Conduct COMPLETE technical diagnosis of why playoff generation fails.

**DO:**
- ✅ Read actual code files
- ✅ Run runtime checks (localhost)
- ✅ Check browser DevTools (Network, Console)
- ✅ Check server logs
- ✅ Trace execution flow
- ✅ Identify root cause
- ✅ Analyze database state
- ✅ Show full error logs
- ✅ Explain safe fix strategy

**DO NOT:**
- ❌ Change ANY code
- ❌ Create patches
- ❌ Run migrations
- ❌ Modify database
- ❌ Deploy
- ❌ Write fixes
- ❌ Refactor
- ❌ Commit changes

---

## 🔍 STEP 1 — READ CONFIGURATION

**Find and read:**

1. `prisma/schema.prisma`
   - Look for: `model Game`, `model Playoff`, `model Season`, `model Team`
   - Find: relations, foreign keys, nullable fields, constraints
   - Show: exact schema for these 4 models

2. `.env.local` or `.env`
   - Check: DATABASE_URL, DATABASE_URL_UNPOOLED, NEXT_PUBLIC_API_URL
   - Verify: database connectivity variables

3. `package.json`
   - Check: available scripts for running the project

---

## 🔍 STEP 2 — FIND BUTTON CODE

**Search for:** "Згенерувати плей-офф" or "generatePlayoff" or "playoff"

**Commands:**
```bash
grep -r "Згенерувати\|generatePlayoff\|handleGeneratePlayoff" --include="*.tsx" --include="*.ts" -n
```

**When found — READ:**
- Component file
- Handler function
- onClick/onSubmit logic
- State changes
- API call details
- Error handling
- Response handling
- revalidatePath/router.refresh calls

**Show:**
- Exact file path
- Line numbers
- Full handler code
- What API endpoint is called
- What payload is sent

---

## 🔍 STEP 3 — FIND BACKEND HANDLER

**Look for:** `/api/games/playoff` or similar endpoints

**Commands:**
```bash
find . -path ./node_modules -prune -o -name "*playoff*" -type f -print
grep -r "api.*playoff\|POST.*playoff\|createPlayoff" --include="*.ts" -l
```

**When found — READ:**
- API route file (e.g., `app/api/games/playoff/route.ts`)
- POST handler function
- Request parsing
- Validation logic
- Prisma operations (all `.create()`, `.updateMany()`, etc.)
- Error handling
- Response logic

**Show:**
- Exact file path
- Full handler code
- All Prisma calls
- All error handling
- Response structure

---

## 🔍 STEP 4 — TRACE DATABASE SCHEMA

**Commands:**
```bash
grep -n "model Game\|model Playoff\|model Season\|model Team" prisma/schema.prisma
```

**Read from schema.prisma:**
1. `model Game` — Find:
   - homeTeamId field (type, nullable?)
   - awayTeamId field (type, nullable?)
   - seasonId field
   - stage field
   - All relations (Team, Season)
   - All foreign keys

2. `model Playoff` — Find:
   - ageGroup field (unique? how used?)
   - semifinal/final/thirdPlace fields
   - All types and nullable status

3. `model Team` — Find:
   - id field (type, starting value?)
   - seasonId field
   - ageGroup field

4. `model Season` — Find:
   - id field
   - ageGroup field
   - isActive field

**Show:**
- Exact schema for each model
- All relations
- All foreign keys
- Constraint definitions (@@unique, @@index)

---

## 🔍 STEP 5 — CHECK PLAYOFF FETCH ENDPOINT

**Find:** `/api/playoff` endpoint

**Commands:**
```bash
grep -r "api/playoff\|GET.*playoff" --include="*.ts" -l
```

**Read:**
- GET handler for `/api/playoff?ageGroup=...`
- How it fetches playoff data
- Query logic
- Return structure

**Show:**
- Full GET handler code
- Query examples

---

## 🔍 STEP 6 — START DEV SERVER & RUN TESTS

**Commands:**
```bash
cd [project-root]
npm run dev
# Wait for: "Ready in X.Xs"
```

**Test 1 — Check API endpoint:**
```bash
curl -s -X POST "http://localhost:3006/api/games/playoff" \
  -H "Content-Type: application/json" \
  -d '{"ageGroup":"younger"}'
```

**Show:**
- Response status (200? 409? 500?)
- Response body
- Any error messages

**Test 2 — Check if playoff data exists:**
```bash
curl -s "http://localhost:3006/api/playoff?ageGroup=younger"
curl -s "http://localhost:3006/api/playoff?ageGroup=older"
```

**Show:**
- Full response
- What data is returned
- What fields are null/missing

**Test 3 — Check schedule page rendering:**
```bash
curl -s "http://localhost:3006/schedule?ag=older" | grep -o "плей\|Дані\|playoff" | head -10
```

**Show:**
- If page renders
- If playoff section appears
- If empty state message shows

---

## 🔍 STEP 7 — BROWSER DEVTOOLS DEBUGGING

**Open:** http://localhost:3006/admin/site-editor in browser

**Steps:**
1. Open DevTools (F12)
2. Go to Network tab
3. Click "⚡ Згенерувати плей-офф" button
4. Watch Network requests

**Capture:**
- Request URL
- Request method
- Request headers
- Request body
- Response status
- Response headers
- Response body
- Any errors

**Also check Console tab:**
- Are there any red errors?
- What's being logged?
- Any uncaught exceptions?

**Show:**
- Full Network request/response
- Console errors (if any)
- Timing information

---

## 🔍 STEP 8 — SERVER LOGS ANALYSIS

**Watch terminal where `npm run dev` is running:**

After clicking the button:
- Are there any error logs?
- What's being printed?
- Any "Failed to create" messages?
- Any Prisma errors?

**Commands to enable more logs:**
```bash
# In new terminal:
tail -f dev.log | grep -i "playoff\|error\|prisma"
```

**Show:**
- All relevant logs
- Error messages
- Stack traces
- Prisma query errors

---

## 🔍 STEP 9 — DATABASE STATE CHECK

**Check if Team records exist with valid IDs:**

Look in the code or run check:
- What are valid Team IDs in database?
- Do any teams have ID = 0?
- What's the minimum ID value?
- How many teams exist for "younger" age group?
- How many teams exist for "older" age group?

**Hints to find:**
- Query teams from `/api/teams` endpoint if it exists
- Check admin panel what teams are listed
- Look at Team list on website

**Show:**
- List of valid Team IDs
- Minimum/maximum ID values
- How many teams per age group

---

## 🔍 STEP 10 — ANALYZE EXECUTION FLOW

**Map full flow:**

```
USER ACTION
  ↓
BUTTON CLICK
  ↓
JavaScript handler
  ↓
fetch() API call
  ↓
Backend receives request
  ↓
Parse + validate
  ↓
Find Season
  ↓
Check existing playoff games
  ↓
Create 4 Game records (INSERT × 4)
  ↓
Prisma query execution
  ↓
Database response
  ↓
Return response to frontend
  ↓
Frontend state update
  ↓
UI refresh (router.refresh or revalidatePath)
  ↓
Schedule page re-fetches playoff
  ↓
Bracket component renders
```

**For each step — determine:**
- ✅ Does it work?
- ❌ Does it fail?
- If fails: What's the error?
- What should happen?

**Show:**
- Complete flow map
- Mark all working steps with ✅
- Mark all broken steps with ❌
- Show exact error at failure point

---

## 🔍 STEP 11 — CHECK FOR SPECIFIC ISSUES

### Issue 1: Foreign Key Constraints

**Check:**
- Does Game table have foreign key on homeTeamId?
- Does Game table have foreign key on awayTeamId?
- What happens when you try to insert Game with homeTeamId = 0?
- What happens when you try to insert Game with awayTeamId = 0?
- Are there any Team records with ID = 0?

**Run test:**
- Try to create a Game with invalid teamId
- Check exact Prisma error message
- Show error type (what constraint is violated?)

### Issue 2: Stale Cache

**Check:**
- Is `/api/playoff` using cache?
- Are there any `cache: "no-store"` settings?
- Could browser cache be stale?
- Could server cache be preventing updates?

### Issue 3: Revalidation

**Check:**
- Is `revalidatePath()` called after successful creation?
- Is `router.refresh()` called?
- What paths are being revalidated?
- Could revalidation be failing?

---

## 🔍 STEP 12 — COMPARE EXPECTED VS ACTUAL

**Expected flow:**
```
POST /api/games/playoff { ageGroup: "younger" }
  ↓
Backend creates 4 game records
  ↓
Database returns success
  ↓
Frontend receives { success: true, games: [...] }
  ↓
Schedule page refreshes
  ↓
Playoff data fetched from /api/playoff
  ↓
PlayoffBracket renders with team names
  ↓
User sees: Semifinal 1: Team A vs Team B
```

**Actual flow:**
```
POST /api/games/playoff { ageGroup: "younger" }
  ↓
Backend tries to create game
  ↓
Prisma throws Foreign Key Error
  ↓
try/catch catches error
  ↓
Backend returns { error: "Internal server error" }
  ↓
Frontend receives error
  ↓
Frontend shows error or silently fails
  ↓
No refresh happens
  ↓
Schedule page shows old data or empty state
  ↓
User sees: "Дані плей-офф ще не додані"
```

**Show:**
- Where actual differs from expected
- What exactly goes wrong
- What the error is

---

## 📊 FINAL DIAGNOSTIC REPORT FORMAT

After completing all steps above, provide this exact report:

```markdown
# DIAGNOSTIC REPORT — PLAYOFF GENERATION SYSTEM

## 1. ROOT CAUSE ANALYSIS

[One precise statement describing the problem]

## 2. FAILURE LAYER

frontend / backend / database / constraint / rendering / all

## 3. EXECUTION FLOW WITH STATUS

[Step-by-step with ✅/❌ marks]

## 4. PROBLEMATIC CODE

File: [path]
Lines: [numbers]
Code: [exact snippet causing failure]

## 5. ERROR MESSAGES

[Full error logs from server]

## 6. DATABASE STATE

[What's actually in the database]

## 7. TYPE/CONSTRAINT ISSUES

[Any enum mismatches, constraint violations, etc.]

## 8. FILES INVOLVED

[Complete list of all files in the execution path]

## 9. SAFE FIX STRATEGY

[Description without code of how to fix this]

## 10. CONCLUSION

[Final summary]
```

---

## ⚠️ CRITICAL REQUIREMENTS

**You MUST:**
- Run the project locally
- Check browser DevTools (Network + Console)
- Check server logs
- Test API endpoints directly (curl)
- Trace full execution flow
- Provide exact error messages
- Show exact file paths and line numbers
- Show exact code causing the failure

**You MUST NOT:**
- Change ANY code
- Write patches
- Modify schema
- Run migrations
- Deploy anything
- Fix the bug
- Refactor anything
- Make commits

**You SHOULD:**
- Be thorough
- Check every layer (frontend → backend → database)
- Verify assumptions with actual runtime data
- Show full error logs
- Explain why it fails
- Prepare safe fix description (strategy, not code)

---

## 🚀 START HERE

1. Read this prompt carefully
2. Start with STEP 1 (read configuration)
3. Work through all 12 steps
4. Run actual tests on localhost
5. Write final diagnostic report in the format specified
6. Send report to user

---

**Remember:** This is DIAGNOSIS ONLY. You are investigating, not fixing.

