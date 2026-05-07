# 🚀 FULL RUNTIME COMPLETE AUDIT - QUICK START

## Prerequisites
✅ Node.js 18+ installed  
✅ `npm install puppeteer` (if not already installed)  
✅ Development server running on localhost:3006  
✅ PostgreSQL database accessible  

---

## 🎯 QUICK START (3 steps)

### Step 1: Ensure server is running
```bash
# In terminal 1:
cd D:\n8n\basket-lviv
npm run dev
# Wait for: "Ready in X.Xs"
```

### Step 2: Install puppeteer (if needed)
```bash
# In terminal 2:
npm install puppeteer --save-dev
```

### Step 3: Run the audit
```bash
# Still in terminal 2:
node FULL_RUNTIME_COMPLETE_AUDIT.js
```

---

## 📊 What Happens

The script will:

```
1. 🌐 Launch real Puppeteer browser (headful - you'll see it)
2. 🔓 Login to admin panel (admin@basket.lviv.ua / Admin123!@#)
3. 🎮 Create a LIVE game (Teams 1 vs 2)
4. 🎯 Click EVERY stat button (10+ buttons total)
5. 📊 For each button:
   ✓ Verify DOM updated
   ✓ Verify Network request sent
   ✓ Verify Database changed (BoxScore, GameEvent)
   ✓ Verify Game score updated
6. 🔄 Reload page and verify persistence
7. 📈 Check Leaders/Standings/Schedule aggregation
8. 📸 Generate 50+ screenshots
9. 📋 Save detailed JSON reports
```

---

## 📁 Output Files

After script completes, check:

```
audit-output/
├── COMPLETE_AUDIT_REPORT.json       ← MAIN REPORT (all data)
├── network-logs.json                 ← Network requests with payloads
├── db-verification.json              ← Database snapshots
├── assertions-failed.json            ← If any tests failed
├── FATAL_ERROR.json                  ← If script crashed
└── screenshots/
    ├── 01-login-page.png
    ├── 02-login-filled.png
    ├── 03-dashboard.png
    ├── 04-game-page-loaded.png
    ├── 05-stat-score_1-clicked.png
    ├── 05-stat-score_2-clicked.png
    ├── 05-stat-score_3-clicked.png
    ├── ... (all stat buttons)
    ├── 06-after-reload.png
    ├── 99-leaders-final.png
    ├── 99-standings-final.png
    └── 99-schedule-final.png
```

---

## 📊 How to Read Results

### COMPLETE_AUDIT_REPORT.json
```json
{
  "timestamp": "2026-05-07T...",
  "status": "COMPLETED",
  "summary": {
    "totalAssertions": 50,
    "passedAssertions": 50,
    "failedAssertions": 0,
    "buttonsTested": 10,
    "buttonsSuccess": 10,
    "buttonsFailed": 0,
    "successRate": "100.0"
  },
  "gameData": {
    "id": 999,
    "homeTeam": "Team A",
    "awayTeam": "Team B",
    "status": "LIVE",
    "initialBoxScores": 19
  },
  "statEntries": [
    {
      "stat": "+1 Очко",
      "playerId": 123,
      "result": "SUCCESS",
      "dbVerification": {
        "boxScore": {
          "points": 1,
          "rebounds": 0,
          "assists": 0
        },
        "gameScore": {
          "homeScore": 1,
          "awayScore": 0
        }
      }
    },
    // ... more entries
  ]
}
```

### network-logs.json
```json
[
  {
    "timestamp": "2026-05-07T...",
    "url": "http://localhost:3006/_next/rsc/abc123",
    "method": "POST",
    "status": 200,
    "requestSize": 256,
    "responseSize": 512,
    "request_body": "gameId=999&playerId=123&points=1&...",
    "response_body": "{\"success\":true,\"...\"}"
  },
  // ... more requests
]
```

### db-verification.json
```json
[
  {
    "timestamp": "2026-05-07T...",
    "boxScore": {
      "points": 5,
      "rebounds": 2,
      "reboundsOff": 1,
      "reboundsDef": 1,
      "assists": 1,
      "steals": 0,
      "blocks": 0,
      "fouls": 0,
      "turnovers": 0,
      "efficiency": 8
    },
    "lastEvent": {
      "type": "POINTS",
      "createdAt": "2026-05-07T...",
      "points": 1
    },
    "gameScore": {
      "homeScore": 5,
      "awayScore": 0,
      "status": "LIVE"
    }
  },
  // ... more verifications
]
```

---

## ✅ Expected Results

**Success = 100% assertions passed**

```
═══════════════════════════════════════════════════════════════════
                    AUDIT RESULTS SUMMARY
═══════════════════════════════════════════════════════════════════
Assertions: 50/50 (100.0%)
Buttons: 10/10
Screenshots: 50+
Network Requests: 40+
DB Verifications: 10
═══════════════════════════════════════════════════════════════════
```

---

## 🐛 If Something Fails

### Check the logs:
```bash
# View failed assertions
cat audit-output/assertions-failed.json

# View network errors
cat audit-output/network-logs.json | grep -i "error\|400\|500"

# View database errors
cat audit-output/db-verification.json | grep -i "null\|undefined"

# View fatal errors
cat audit-output/FATAL_ERROR.json
```

### Check screenshots:
- Open `audit-output/screenshots/` folder
- Look for red X marks or errors
- Check what failed and why

### Common Issues:

**Issue**: "Element not found: Очко"  
**Solution**: Button selector doesn't match. Check UI and update STAT_BUTTONS array.

**Issue**: "Database updated: points++ ... FAILED"  
**Solution**: Server Action didn't run or revalidation failed. Check browser console.

**Issue**: "Data persisted after page reload ... FAILED"  
**Solution**: Revalidation not working. Check if revalidatePath is uncommented in actions/game.ts.

---

## 🔧 Troubleshooting

### Server not responding
```bash
# Kill any process on port 3006
netstat -ano | findstr :3006
taskkill /PID <PID> /F

# Restart
npm run dev
```

### Puppeteer crashes
```bash
# Check if port 3006 is actually responsive
curl http://localhost:3006

# If not, check dev server logs for errors
npm run dev 2>&1 | tee server.log
```

### Database connection fails
```bash
# Check .env file
cat .env | grep DATABASE_URL

# Test connection
npx prisma db push --skip-generate
```

---

## 📈 Performance Metrics

The audit measures:
- ✅ Server Action response time
- ✅ Revalidation delay
- ✅ Network payload size
- ✅ Database write latency
- ✅ Page reload persistence

Check `audit-output/network-logs.json` for timing data.

---

## 🚀 Production Ready?

✅ All 50 assertions pass = **YES, PRODUCTION READY**
❌ Any assertion fails = **NO, needs investigation**

---

## 📞 Support

If audit fails:
1. Check FATAL_ERROR.json
2. Check assertions-failed.json
3. Check screenshots for visual clues
4. Check browser console in headful window
5. Check server logs in terminal 1

---

**Script Status**: 🟢 READY TO RUN

Run it now:
```bash
node FULL_RUNTIME_COMPLETE_AUDIT.js
```
