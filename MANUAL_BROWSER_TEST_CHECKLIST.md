# Manual Browser Testing Checklist — Game 240

## Setup
- **URL:** http://localhost:3006/game/240
- **Game:** Mighty Ducks (Home) vs Димчасті Леопарди (Away)
- **Players available:** Both teams have multiple players
- **Status:** LIVE (ready for testing)

---

## ✅ Test Step 1: Page Load & Initial State

**Action:** Open http://localhost:3006/game/240 in browser

**Expected Results:**
- [ ] Page loads without errors
- [ ] Team names visible: "Mighty Ducks" and "Димчасті Леопарди"
- [ ] Score displayed: currently showing (from DB)
- [ ] Quarter: 2 (from previous tests)
- [ ] Status: FINISHED (from previous tests) — but should still show UI
- [ ] Timer showing: 00:00 (game ended in tests)
- [ ] Roster panel visible on both sides
- [ ] Buttons visible (gray/disabled or enabled)

**Screenshot:** Take one to document initial state

---

## ✅ Test Step 2: Player Selection & Highlighting

**Action:** Click on a player from home team roster (e.g., #3 Кривохиж)

**Expected Results:**
- [ ] Player becomes highlighted/selected (visual feedback)
- [ ] Selected player background changes color
- [ ] Buttons should now be ENABLED (were disabled without selection)
- [ ] Try second player — selection should switch

**Screenshot:** Show selected player with highlighted row

---

## ✅ Test Step 3: +2 Points Button

**Action:** 
1. Select a player (#3 Кривохиж)
2. Click "+2 Двоочковий" button
3. Wait for response (should be quick, <1 second)

**Expected Results:**
- [ ] Button click works (no error)
- [ ] Score increments (Home score should change)
- [ ] GameProtocol updates with new score
- [ ] Player's "Points" stat increases by 2
- [ ] "FG2: X/X" value updates
- [ ] Event appears in event log at bottom
- [ ] No page reload occurs

**Screenshot:** Show updated score and stats

---

## ✅ Test Step 4: +1 Button with FreeThrowModal

**Action:**
1. Keep player selected
2. Click "+1 Очко" button
3. Modal should appear with two choices

**Expected Results:**
- [ ] FreeThrowModal appears
- [ ] Two options visible: "Звичайне очко" and "Штрафний кидок"
- [ ] Click "Звичайне очко"
- [ ] Modal closes
- [ ] Score increments by 1
- [ ] FG2 (not FT) increments
- [ ] Return and test "Штрафний кидок" — should increment FT instead

**Screenshot:** Show modal with both options

---

## ✅ Test Step 5: Substitution (Заміна)

**Action:**
1. Select a player (#3 Кривохиж)
2. Click "Заміна" button
3. Modal appears asking who goes OUT and who comes IN

**Expected Results:**
- [ ] Modal shows player selection lists
- [ ] "Хто ВИХОДИТЬ" — #3 should be pre-selected
- [ ] "Хто ЗАХОДИТЬ" — select another player (e.g., #4)
- [ ] Click "✓ Замінити"
- [ ] Modal closes
- [ ] Event logged: "SUBSTITUTION"
- [ ] Time on court updated in roster
- [ ] Player #3 moves to bench (no longer on court)
- [ ] Player #4 moves to on-court section

**Screenshot:** Show substitution modal and result

---

## ✅ Test Step 6: Rebound (Підбір) 

**Action:**
1. Select a player
2. Click "Підбір захист" button

**Expected Results:**
- [ ] No modal appears (direct action)
- [ ] Player's rebounds increase
- [ ] "Rebounds: X (OFF: X, DEF: X)" updates
- [ ] Event logged: "REBOUND_DEF"
- [ ] Score unchanged (rebound doesn't add points)

**Screenshot:** Show updated rebound stats

---

## ✅ Test Step 7: Assist (Передача)

**Action:**
1. Select a player
2. Click "Передача" button

**Expected Results:**
- [ ] Button works instantly
- [ ] Player's "Assists: X" increments
- [ ] Event logged: "ASSIST"
- [ ] No other stats change

**Screenshot:** Show assist count increased

---

## ✅ Test Step 8: Personal Foul (Фол П)

**Action:**
1. Select a player (defender)
2. Click "Фол П" button
3. Modal should ask which opponent player was fouled

**Expected Results:**
- [ ] FoulPlayerModal appears
- [ ] Shows opponent team's players to select from
- [ ] Select an opponent (away team player)
- [ ] Modal closes
- [ ] Defender's fouls increase: "Fouls (Personal): X"
- [ ] Event logged: "FOUL"
- [ ] Opponent's foul count (visual indicators) updated if visible

**Screenshot:** Show foul modal and result

---

## ✅ Test Step 9: Undo (↩ Відкат)

**Action:**
1. After any action, click "↩ Відкат" button
2. Should undo the last action

**Expected Results:**
- [ ] Last action is reversed
- [ ] Stats revert to previous values
- [ ] Score reverts if it was scoring action
- [ ] Event removed from log
- [ ] Button works multiple times for multiple undos

**Screenshot:** Show stat reverting after undo

---

## ✅ Test Step 10: Timer Display

**Action:** 
1. Check the timer in the header (center top, showing MM:SS)
2. Note the current display

**Expected Results:**
- [ ] Timer displays in MM:SS format
- [ ] Currently shows 00:00 (because game is FINISHED from tests)
- [ ] Format is correct (HH:MM or MM:SS depending on quarter length)
- [ ] Visible and readable

**Screenshot:** Show timer display

---

## ✅ Test Step 11: GameProtocol Table

**Action:** Scroll down to see the protocol/stats table

**Expected Results:**
- [ ] Table shows team stats at top
- [ ] Player rows show stats columns: Points, Rebounds, Assists, Fouls, etc.
- [ ] Time on court shows in MM:SS format (e.g., "8:20")
- [ ] Updated after each action
- [ ] Color coding: Home blue, Away different color
- [ ] Sortable or clearly organized

**Screenshot:** Show full protocol table

---

## ✅ Test Step 12: RosterPanel Indicators

**Action:** Look at the roster panels on left and right

**Expected Results:**
- [ ] "На паркеті" section shows on-court players
- [ ] Green dot (●) next to on-court players
- [ ] Gray dot (○) for bench players
- [ ] Time on court displayed next to each player
- [ ] After substitution, players move between sections
- [ ] Foul indicators (red squares) show fouls per player

**Screenshot:** Show roster with indicators

---

## ✅ Test Step 13: Rapid Button Clicks

**Action:** Click multiple buttons in quick succession to test responsiveness

**Expected Results:**
- [ ] Buttons respond smoothly
- [ ] No errors or crashes
- [ ] Stats update correctly for each action
- [ ] Events logged in order
- [ ] No "double action" issues

**Screenshot:** Show final state after multiple actions

---

## ✅ Test Step 14: Accuracy Check — Score Calculation

**Action:** Manually verify the score calculation

**Example:**
- Start: Home 0, Away 0 (fresh game state)
- Action 1: +2 for player → Home 2, Away 0
- Action 2: +1 regular for away → Home 2, Away 1
- Action 3: +3 for home → Home 5, Away 1

**Expected Results:**
- [ ] Score updates match actions
- [ ] No off-by-one errors
- [ ] Statistics (fg2Made, points) align with score

---

## ✅ Test Step 15: No Console Errors

**Action:** Open browser DevTools (F12) → Console tab

**Expected Results:**
- [ ] No RED errors
- [ ] Warnings OK (yellow) — these are usually from libraries
- [ ] Network tab shows all requests successful (200 status)
- [ ] No failed API calls

**Screenshot:** Show console with no errors

---

## Summary of Expected Behavior

| Action | Expected | Status |
|--------|----------|--------|
| Page load | HTML loads, components visible | [ ] |
| Select player | Player highlights, buttons enable | [ ] |
| +2 button | Score +2, FG2 +1, event logged | [ ] |
| +1 modal | Shows choices, distinct scoring | [ ] |
| Substitution | Player moves on/off court, time tracked | [ ] |
| Rebound | Rebounds +1, no score change | [ ] |
| Assist | Assists +1, event logged | [ ] |
| Foul | Fouls +1, opponent selected | [ ] |
| Undo | Last action reversed | [ ] |
| Timer | Displays MM:SS format | [ ] |
| Protocol | Updates without reload | [ ] |
| Roster | On-court/bench separation, time display | [ ] |
| Performance | Smooth, no lag, no errors | [ ] |
| Console | No red errors | [ ] |

---

## Final Checklist

After completing all tests above:

- [ ] All buttons work
- [ ] Score calculation accurate
- [ ] Stats update correctly
- [ ] No page reloads
- [ ] No console errors
- [ ] Substitution time tracking works
- [ ] GameProtocol displays properly
- [ ] UI responsive and smooth

**If all boxes checked: ✅ READY FOR PRODUCTION**

---

## Notes

- Game 240 was used for E2E tests, so score might be 5:1 or different from initial 0:0
- Don't worry about quarter/status from previous tests — just verify buttons work
- Focus on: Does action → server → UI update → display happen correctly?
- No errors or crashes = success

---

Date: 2026-05-09
Game: 240
Status: Ready for Manual Testing
