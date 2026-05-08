================================================================================
DIAGNOSTIC WORKFLOW — PLAYOFF GENERATION BUG
================================================================================

FILES CREATED:
--------------
1. CLAUDE_DIAGNOSTIC_PROMPT_PLAYOFF.md
   → Professional 12-step diagnostic prompt for Claude Code
   → Use this to run complete analysis
   
2. HOW_TO_USE_DIAGNOSTIC_PROMPT.md
   → Instructions on how to use the diagnostic prompt
   → Quick reference guide
   
3. MY_DIAGNOSTIC_FINDINGS.md
   → Summary of my (human assistant) initial diagnostic
   → Quick overview of root cause
   
4. README_DIAGNOSTIC_WORKFLOW.txt
   → This file — workflow guide

================================================================================

WORKFLOW:

Step 1: REVIEW MY FINDINGS
   - Read MY_DIAGNOSTIC_FINDINGS.md
   - Understand the root cause
   - Know what to expect

Step 2: RUN CLAUDE CODE DIAGNOSTIC
   - Copy entire content of CLAUDE_DIAGNOSTIC_PROMPT_PLAYOFF.md
   - Create NEW chat with Claude Code
   - Paste prompt and add message:
     "Please conduct this diagnostic analysis. Start with Step 1 and 
      work through all 12 steps. Do NOT make any code changes."
   - Wait 10-15 minutes for analysis

Step 3: GET DETAILED DIAGNOSTIC REPORT
   - Claude Code will provide comprehensive report
   - Will include file paths, line numbers, exact errors
   - Will map execution flow with ✅/❌ marks
   - Will show database state
   - Will describe safe fix strategy

Step 4: OPTIONAL — SHARE WITH CHATGPT
   - If you want second opinion
   - Copy Claude Code's diagnostic report
   - Ask ChatGPT to review and confirm findings

Step 5: CREATE FIX PROMPT
   - Based on diagnostic findings
   - Create FIX_PROMPT_PLAYOFF.md
   - Include exact fix strategy and implementation steps

Step 6: RUN CLAUDE CODE FIX & DEPLOY
   - Send FIX_PROMPT to Claude Code
   - It will implement the fix
   - It will deploy to Vercel
   - It will verify on production

================================================================================

ROOT CAUSE (SUMMARY):
---------------------

Foreign Key Constraint Violation

When "⚡ Згенерувати плей-офф" button is clicked:
- API tries to create 4 Game records
- Uses placeholder teamId values: homeTeamId: 0, awayTeamId: 0
- Database has NO Team with ID = 0
- Constraint violation → Foreign key error
- Backend returns 500 Internal Server Error
- Frontend fails silently or shows error to user
- Playoff not created

File: app/api/games/playoff/route.ts (lines 47-98)
Error: Foreign key constraint violated: `Game_awayTeamId_fkey`

================================================================================

WHAT CLAUDE CODE WILL PROVIDE:
------------------------------

✅ Exact root cause analysis
✅ Complete execution flow map (✅/❌ marks)
✅ File paths with line numbers
✅ Full error messages from logs
✅ Database state analysis
✅ All involved files listed
✅ Safe fix strategy (without code)

NO CODE CHANGES (diagnosis only)
NO PATCHES created
NO COMMITS made
NO DATABASE modifications
NO DEPLOYMENTS

================================================================================

NEXT ACTIONS:

After Claude Code diagnostic:
1. Review findings
2. (Optional) Share with ChatGPT
3. Create FIX_PROMPT_PLAYOFF.md
4. Send to Claude Code for implementation + deployment

Timeline:
- Diagnostic: 10-15 minutes
- Fix implementation: 5-10 minutes
- Vercel deployment: 5-10 minutes
- Total: ~30 minutes

================================================================================

STATUS: READY TO RUN DIAGNOSTIC

Use: CLAUDE_DIAGNOSTIC_PROMPT_PLAYOFF.md
Reference: HOW_TO_USE_DIAGNOSTIC_PROMPT.md
Summary: MY_DIAGNOSTIC_FINDINGS.md

================================================================================
