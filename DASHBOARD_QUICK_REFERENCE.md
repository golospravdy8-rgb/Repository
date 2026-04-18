# 🎮 Dashboard Quick Reference Guide

## Screen Layout (No Scroll!)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KYIVSTARS        23 : 19        Q2 · 04:32        ФОЛ: 2/4  ТО: 2/2        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ▶ Старт  → Наступна  Завершити                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│             ┌─────────────────────────────────────┐                         │
│  HOME       │ — виберіть гравця —        вибран  │  AWAY TEAM              │
│  ROSTER     ├─────────────────────────────────────┤                         │
│ (155px)     │ Тип кидка                           │  (155px)                │
│             │ [Звич] [⚡Відр] [↩2й] [💥Втр]    │                         │
│  ● На пар.  ├─────────────────────────────────────┤                         │
│  ● #5 Petro │ Очки                                │  ● На пар.              │
│  ● #7 Roman │ [ +1  |  +2  |  +3  ]             │  ● #3 Vasilyk           │
│  ● #11 Ivan ├─────────────────────────────────────┤  ● #8 Dmytro            │
│  ● #23 Oleh │ Штрафні                             │  ● #15 Petro            │
│  ● #34 Vlad │ [✓ влучив] [✗ промах]             │  ● #22 Roman            │
│              ├─────────────────────────────────────┤  ● #44 Viktor           │
│  ○ Лавка    │ Статистика                          │                         │
│  ○ #12 Serg │ [Передача] [Перехват]             │  ○ Лавка                │
│  ○ #13 Ilya │ [Подбір(н)] [Подбір(з)]           │  ○ #2 Denys             │
│  ○ #21 Kylo │ [Блок] [Втрата]                   │  ○ #6 Serhiy            │
│  ○ #31 Gost ├─────────────────────────────────────┤  ○ #17 Oleg             │
│  ○ #40 Mark │ Фоли                                │  ○ #25 Ruslan           │
│  ○ #42 Yuri │ [Перс] [Тех] [Неспорт]            │  ○ #33 Pavlo            │
│              ├─────────────────────────────────────┤  ○ #50 Anatoliy         │
│              │ [↕ Заміна] [↩ Скасувати]         │                         │
│              └─────────────────────────────────────┘                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Log: Q2 · Petro · POINTS   Q2 · Roman · ASSIST   Q1 · Vlad · FOUL          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Button Groups

### Type Selector (4 buttons)
```
┌────────┬────────┬────────┬────────┐
│ Звич   │⚡Відр │ ↩2й   │💥Втр  │
└────────┴────────┴────────┴────────┘

Active = Orange border (#e8a030)
Inactive = Dark border (#1e3a50)
```

### Scoring (3 buttons)
```
┌────┬────┬────┐
│ +1 │ +2 │ +3 │
└────┴────┴────┘

Colors: Blue | Blue | Orange
```

### Free Throws (2 buttons)
```
┌──────────┬──────────┐
│✓ влучив  │✗ промах  │
└──────────┴──────────┘

Colors: Green | Red
```

### Stats (4 in 2×2)
```
┌──────────┬──────────┐
│ Передача │ Перехват │
├──────────┼──────────┤
│Подбір(н) │Подбір(з) │
└──────────┴──────────┘
Row 2:
┌──────────┬──────────┐
│  Блок    │  Втрата  │
└──────────┴──────────┘
```

### Fouls (3 buttons)
```
┌────────┬────────┬────────┐
│  Перс  │  Тех   │Неспорт │
└────────┴────────┴────────┘

Colors: Gold | Red | Red
```

---

## 🔄 Workflow

### 1. Start Game
```
Game Status: ЗАПЛАНОВАНО
↓
Click: ▶ Почати
↓
Dashboard becomes LIVE
Buttons become enabled
```

### 2. Score a Basket
```
1. Select Type: [Звич] or [⚡Відр] or [↩2й] or [💥Втр]
2. Select Player: Click name in HOME or AWAY panel
3. Select Points: [+1] [+2] [+3]
4. Event logged instantly
5. On-court ± updated
```

### 3. Free Throw
```
Select player
Type: (leave as Звич)
Click: [✓ влучив] (scores 1pt)
      or [✗ промах] (miss attempt)
```

### 4. Make Substitution
```
1. Click: [↕ Заміна]
2. Modal opens
3. Select player OUT (on-court 5)
4. Select player IN (from bench)
5. Click: [✓ Замінити]
6. On-court dots update
7. Modal closes
```

### 5. Add Foul
```
Select player
Click: [Перс] (personal) → counter +1
       [Тех] (technical)
       [Неспорт] (unsportsmanlike)
```

### 6. Take Timeout
```
Click: [⏱ ТО: 2]
Counter shows: ТО: 1
(Max 2 per team)
```

### 7. Undo Last Action
```
Click: [↩ Скасувати]
Last event removed
Stats rolled back
```

---

## 🎨 Color Reference

| Component | Color | Hex | Purpose |
|-----------|-------|-----|---------|
| **On-Court (Green)** | ● | #2ecc71 | Active player indicator |
| **Bench (Grey)** | ○ | #2a4060 | Inactive player indicator |
| **Selected (Orange)** | highlight | #fe6b22 | Selected player |
| **Scoring +1/+2** | Blue | #1a3a5c | Regular baskets |
| **Scoring +3** | Orange | #3d2000 | 3-pointers |
| **FT Made** | Green | #1a4a22 | Free throw made |
| **FT Miss** | Red | #3d1010 | Free throw miss |
| **Type Selector Active** | Orange | #e8a030 | Active event type |
| **Header** | Navy | #1a2737 | Background |

---

## ⌨️ Tips & Tricks

### Keyboard Shortcuts (if implemented)
```
F = Add Foul (when player selected)
S = Open Substitution modal
U = Undo last action
1 = Select +1
2 = Select +2
3 = Select +3
```

### Mouse Tricks
```
• Double-click player = Quick select
• Right-click foul button = Undo foul
• Click empty area = Deselect player
```

### Touch Friendly
```
• All buttons: ≥48px minimum touch target
• Modal: Large tap zones
• Scrollable lists: Smooth drag
```

---

## 📊 Counters Reference

### Header Counters (Updated in Real-Time)

**Home Team (LEFT):**
```
ФОЛ: 2/4        (Personal fouls 2 of 4 max)
ТО: 2/2         (Timeouts 2 of 2 max)
```

**Score Center:**
```
23 : 19         (Home : Away)
Q2 · 04:32      (Quarter · Time remaining)
```

**Away Team (RIGHT):**
```
ФОЛ: 0/4
ТО: 2/2
```

---

## 🐛 Troubleshooting

### Button Not Responding?
- ✓ Player selected?
- ✓ Game is LIVE?
- ✓ Button not disabled (greyed)?

### Substitution Modal Won't Open?
- ✓ Click the [↕ Заміна] button
- ✓ Make sure game is LIVE
- ✓ Modal appears as overlay on top

### On-Court Dots Not Updating?
- ✓ Players show as ● (green) when on court
- ✓ Shows as ○ (grey) when on bench
- ✓ Updates after substitution confirmed

### Action Log Empty?
- ✓ No events yet (just started?)
- ✓ Shows last 6 events only
- ✓ Horizontal strip at bottom

---

## 🚀 Live Game Checklist

- [ ] Game started (▶ Почати clicked)
- [ ] Home player selected (highlighted)
- [ ] Score type selected (border visible)
- [ ] Score entered (+1/+2/+3 clicked)
- [ ] Event appears in log
- [ ] ±/- updated for on-court players
- [ ] Fouls counter visible in header
- [ ] Substitution working (modal opens)
- [ ] Undo working (last action reversed)
- [ ] No console errors
- [ ] Page doesn't scroll

✅ All checks pass → **Ready for live game!**

---

**Last Updated:** 2026-04-18  
**Dashboard Version:** Compact v1.0  
**Build:** 2e4acd9
