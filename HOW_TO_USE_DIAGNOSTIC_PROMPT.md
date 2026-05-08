# 📖 HOW TO USE THE DIAGNOSTIC PROMPT

## Quick Reference

**File:** `CLAUDE_DIAGNOSTIC_PROMPT_PLAYOFF.md`

**What it is:** Professional diagnostic prompt for Claude Code to analyze playoff generation failure

**What it does:** 12-step comprehensive diagnosis without any code changes

**Expected output:** Detailed diagnostic report with root cause analysis

---

## 🎯 How to Use

### Step 1: Copy the prompt

Open `CLAUDE_DIAGNOSTIC_PROMPT_PLAYOFF.md` and copy its entire contents.

### Step 2: Open Claude Code in new chat

Create a NEW conversation with Claude Code (don't reuse existing chats).

### Step 3: Paste and send

Paste the diagnostic prompt as your message:

```
[Paste entire CLAUDE_DIAGNOSTIC_PROMPT_PLAYOFF.md content]

Please conduct this diagnostic analysis. Start with Step 1 and work through all 12 steps.
Do NOT make any code changes - only diagnosis and analysis.
Send the final diagnostic report in the format specified.
```

### Step 4: Wait for results

Claude Code will:
- Read configuration files
- Find button code
- Find API endpoint code
- Check Prisma schema
- Start dev server (localhost:3006)
- Run API tests with curl
- Check browser DevTools
- Analyze server logs
- Create execution flow map
- Write diagnostic report

Expected time: 10-15 minutes

### Step 5: Get the report

Claude Code will send back detailed diagnostic report with:
- Root cause analysis
- Failure layer identification
- Full execution flow (✅/❌ marks)
- Problematic code (with file paths and line numbers)
- Full error messages
- Database state analysis
- Safe fix strategy

---

## 📋 What the Diagnostic Covers

| Area | Coverage |
|------|----------|
| **Frontend** | Button handler, API calls, state updates, rendering |
| **Backend** | API endpoint, request handling, Prisma operations |
| **Database** | Schema, foreign keys, constraints, actual data |
| **Network** | API requests, responses, status codes, payloads |
| **Runtime** | Server logs, browser console, actual execution |
| **Flow** | Complete execution path with success/failure points |

---

## 🎯 Expected Diagnostic Output

The report should clearly answer:

1. **What's broken?** (exact problem)
2. **Where?** (which file, which function, which line)
3. **Why?** (root cause)
4. **When?** (at which step does it fail)
5. **Error?** (what's the actual error message)
6. **Data?** (what's in the database)
7. **Fix?** (what needs to be changed, strategically)

---

## ✅ Quality Checklist

After Claude Code sends the report, verify it contains:

- [ ] Root cause clearly stated
- [ ] File paths with line numbers
- [ ] Full error messages from logs
- [ ] Execution flow with status marks (✅/❌)
- [ ] List of all involved files
- [ ] Database state (what exists, what doesn't)
- [ ] Safe fix strategy (without code)
- [ ] No code modifications made
- [ ] No patches or changes in git
- [ ] No database changes

---

## 📝 If Claude Code Asks Questions

If Claude Code needs clarification:
- Answer in the context of the diagnostic prompt
- You can say "check /api/playoff endpoint" or similar
- You can ask "what happens when you test curl command X"
- Keep responses focused on diagnosis

---

## 🚀 Next Steps After Diagnosis

1. **Review** the diagnostic report
2. **Understand** the root cause
3. **Share** the report with ChatGPT (optional second opinion)
4. **Create** FIX_PROMPT.md based on the diagnosis
5. **Send** FIX_PROMPT to Claude Code for implementation + Vercel deployment

---

## 📌 Important Notes

- This diagnostic prompt is designed to be self-contained
- Claude Code should NOT need your help (it has full instructions)
- The prompt includes all 12 diagnostic steps
- It includes expected output format
- It explicitly forbids code changes
- It requires runtime verification (localhost, curl, DevTools)

---

**Status:** Ready to use  
**Created:** 2026-05-08  
**Version:** 2.0
