# Ghost Players Fix - Test Plan (2026-04-26)

## 🎯 Objective
Verify that disconnected/eliminated remote players no longer appear as "ghosts" on the game canvas.

## ✅ Fix Applied
**Commit:** 56e9639  
**File:** `src/components/public/RucheekGameCanvas.tsx` (line 2163)  
**Change:** Added status filter before rendering remote players:
```typescript
remotePlayersRef.current.forEach((rp: any, rpKey: string) => {
  if (rp.status !== 'alive') return;  // ← CRITICAL FIX
  // ... render remote player
```

---

## 📋 Test Scenarios

### Scenario 1: Player Joins & Leaves
1. **Setup:** Open game in 2+ browser tabs (same room)
2. **Action:**
   - Tab A: Click "Додати гравця", enter name
   - Tab B: Open DevTools Console, observe Tab A appearing in `remotePlayersRef`
   - Tab B: Close Tab A entirely
3. **Expected:** Tab A player disappears from canvas immediately (no ghost)

### Scenario 2: Player Gets Eliminated
1. **Setup:** Game with 2+ players, let game play until someone scores
2. **Action:**
   - Player A is eliminated
   - Player B watches canvas
3. **Expected:** Player A's visual (cyan circle + name) disappears from canvas

### Scenario 3: Network Lag / Race Condition
1. **Setup:** DevTools Network throttling → "Slow 3G"
2. **Action:**
   - Player joins slowly
   - Immediately disconnect
3. **Expected:** No ghost rendering even with network delay

---

## ✅ Test Checklist

- [ ] Player joins and leaves → no ghost
- [ ] Eliminated player disappears → no ghost
- [ ] Multiple join/leave cycles → no ghost accumulation
- [ ] Network throttling test → still filters correctly
- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors in console

---

## 🚀 Next Steps (if issues found)

1. **If ghosts still appear:**
   - Check if `handlePlayerLeave` is being called
   - Verify Pusher events are firing correctly
   - Check browser console for JavaScript errors
