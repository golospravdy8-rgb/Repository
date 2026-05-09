# 🏗️ FIBA EVENT ENGINE — ARCHITECTURE DIAGRAM

## Flow Diagram: От UI к базе данных

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LiveScoreTracker.tsx (UI)                        │
│                    (НЕ ЗМІНЮЄТЬСЯ - ЖОД змін!)                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ onClick()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      actions/game.ts (Legacy API)                       │
│                                                                         │
│  - addScoreWithType(gameId, teamId, playerId, points, eventType)       │
│  - addFoul(gameId, teamId, playerId)                                   │
│  - addFoulTechnical(gameId, teamId, playerId)                          │
│  - addReboundDef(gameId, teamId, playerId)                             │
│  - addAssist(gameId, teamId, playerId)                                 │
│  - ... + 20 більше                                                     │
│                                                                         │
│  ✅ Все це тепер ТОНКІ ОБГОРТКИ (2-3 рядка)                            │
│  ✅ Імпортуються з lib/fiba/legacy-wrappers.ts                         │
│  ✅ Викликають recordFibaEvent()                                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ await recordFibaEvent(action)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            lib/fiba/fiba-event-engine.ts (MAIN ENGINE)                  │
│                                                                         │
│  recordFibaEvent(action: FibaAction): Promise<FibaEventResult>         │
│                                                                         │
│  1. Валідація (game in LIVE status)                                    │
│  2. Розумна маршрутизація за type:                                     │
│     - action.type === "FIELD_GOAL" → handleFieldGoal()                 │
│     - action.type === "FOUL" → handleFoul()                            │
│     - action.type === "REBOUND" → handleRebound()                      │
│     - action.type === "SUBSTITUTION" → handleSubstitution()            │
│     - ... + 7 більше handlers                                          │
│                                                                         │
│  3. Кожен handler:                                                      │
│     - Гетує game (для quarter, currentTimeLeft, status)                │
│     - Обчислює gameClockSeconds = 600 - game.currentTimeLeft           │
│     - Відкриває Prisma transaction                                     │
│     - Оновлює Game (score, timeouts)                                   │
│     - Створює GameEvent (з повними FIBA полями)                        │
│     - Upsert BoxScore (з розподілом по типам)                          │
│     - Оновлює GameOnCourt (if substitution)                            │
│     - Видаляє гравця з площі (if 5th foul)                            │
│     - Повертає FibaEventResult                                         │
│                                                                         │
│  4. Після транзакції:                                                   │
│     - Обчислює efficiency (якщо потрібна)                              │
│     - Повертає ID подій                                                │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
        ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐
        │   Game Table    │ │ GameEvent Tbl│ │  BoxScore Tbl  │
        │                 │ │              │ │                │
        │ ✅ homeScore    │ │ ✅ playerId  │ │ ✅ fgMade      │
        │ ✅ awayScore    │ │ ✅ type      │ │ ✅ fgAttempted │
        │ ✅ quarter      │ │ ✅ subtype   │ │ ✅ fg2Made     │
        │ ✅ timeLeft     │ │ ✅ points    │ │ ✅ fg2Attempt  │
        │ ✅ timerRunning │ │ ✅ foulType  │ │ ✅ fg3Made     │
        │ ✅ homeTimeouts │ │ ✅ fouledId  │ │ ✅ fg3Attempt  │
        │ ✅ awayTimeouts │ │ ✅ quarter   │ │ ✅ ftMade      │
        │                 │ │ ✅ gameClk   │ │ ✅ ftAttempted │
        └─────────────────┘ │ ✅ createdAt │ │ ✅ rebounds    │
                            │              │ │ ✅ reboundsOff │
                            └──────────────┘ │ ✅ reboundsDef │
                                            │ ✅ foulsPersonal│
                                ┌───────────┼─┤ ✅ foulsTech   │
                                │           │ │ ✅ foulsUnspo  │
                        ┌────────┴────────┐  │ ✅ foulsDisq    │
                        │ GameOnCourt Tbl │  │ ✅ isFouledOut  │
                        │                 │  │ ✅ isDisqualif  │
                        │ ✅ onCourt      │  │ ✅ efficiency   │
                        │ ✅ isStarter    │  │ ✅ plusMinus    │
                        │ ✅ timeOnCourt  │  │                 │
                        │ ✅ lastSubIn    │  └─────────────────┘
                        │                 │
                        └─────────────────┘
```

---

## Type Flow

```typescript
┌─────────────────────────────────────────────────────┐
│        FibaAction (Union Type)                      │
│                                                     │
│  = FieldGoalAction                                  │
│  | FreeThrowAction                                  │
│  | ReboundAction                                    │
│  | PassAction (Assist)                              │
│  | StealAction                                      │
│  | BlockAction                                      │
│  | TurnoverAction                                   │
│  | FoulAction                                       │
│  | SubstitutionAction                               │
│  | TimeoutAction                                    │
│  | QuarterAction                                    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│    recordFibaEvent(action: FibaAction)              │
│    → Promise<FibaEventResult>                       │
│                                                     │
│  FibaEventResult = {                                │
│    success: boolean                                 │
│    gameEventId?: number                             │
│    boxScoreId?: number                              │
│    error?: string                                   │
│    validation?: {                                   │
│      playerFouledOut?: boolean                      │
│      playerDisqualified?: boolean                   │
│      teamFoulThreshold?: boolean                    │
│    }                                                │
│  }                                                  │
└─────────────────────────────────────────────────────┘
```

---

## Data Model Relationships

```
                    ┌──────────────┐
                    │    Game      │
                    │              │
                    │ id (PK)      │
                    │ homeTeamId   │
                    │ awayTeamId   │
                    │ status       │◄──────┐
                    │ quarter      │       │
                    │ homeScore    │       │
                    │ awayScore    │       │
                    └──────┬───────┘       │
                           │              │
            ┌──────────────┼──────────────┤
            │              │              │
            ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────────────┐
      │GameEvent │  │GameOnCourt│  │GameSubstitution  │
      │          │  │           │  │                  │
      │id (PK)   │  │gameId (PK)│  │id (PK)           │
      │gameId(FK)│  │playerId(FK)  │gameId (FK)      │
      │playerId  │  │teamId     │  │playerId (FK)     │
      │teamId    │  │onCourt    │  │playerOutId       │
      │type      │  │isStarter  │  │teamId (FK)       │
      │subtype   │  │timeOnCourt   │action (IN/OUT)   │
      │foulType  │  │lastSubInTs    │quarter           │
      │fouledId  │  │           │  │gameClockSeconds  │
      │points    │  └──────────┘  │                  │
      │quarter   │       ▲         └──────────────────┘
      │gameClkSec│       │                │
      │          │       └────────────────┘
      └────┬─────┘              (track player
           │                    entry/exit)
           │
           ▼
      ┌──────────────┐
      │   BoxScore   │
      │              │
      │id (PK)       │
      │gameId (FK)   │
      │playerId (FK) │
      │teamId (FK)   │
      │              │
      │ SCORING      │
      │ points       │
      │ fgMade       │
      │ fgAttempted  │
      │ fg2Made      │
      │ fg2Attempted │
      │ fg3Made      │
      │ fg3Attempted │
      │ ftMade       │
      │ ftAttempted  │
      │              │
      │ REBOUNDS     │
      │ rebounds     │
      │ reboundsOff  │
      │ reboundsDef  │
      │              │
      │ DEFENSE      │
      │ assists      │
      │ steals       │
      │ blocks       │
      │ turnovers    │
      │              │
      │ FOULS        │
      │ fouls        │ (total)
      │ foulsPersonal│
      │ foulsTech    │
      │ foulsUnsport │
      │ foulsDisq    │
      │ isFouledOut  │
      │ isDisqualif  │
      │              │
      │ METRICS      │
      │ efficiency   │
      │ plusMinus    │
      │ minutesPlayed│
      │ isStarter    │
      └──────────────┘
```

---

## Handler Logic Example: Field Goal

```
addScoreWithType(gameId=237, teamId=5, playerId=42, points=2)
    │
    ▼
recordFibaEvent({
  type: "FIELD_GOAL",
  subtype: "2PT",
  gameId: 237,
  teamId: 5,
  playerId: 42,
  points: 2,
  eventContext: "normal"
})
    │
    ├─ 1. Fetch game (validator)
    │      └─ game.status === "LIVE" ✓
    │      └─ game.quarter = 1
    │      └─ game.currentTimeLeft = 294
    │
    ├─ 2. Route → handleFieldGoal()
    │      └─ gameClockSeconds = 600 - 294 = 306
    │      └─ isHome = (5 === game.homeTeamId) = true
    │
    ├─ 3. Begin Prisma.$transaction([...])
    │
    │      ├─ UPDATE Game
    │      │   SET homeScore = homeScore + 2
    │      │
    │      ├─ CREATE GameEvent
    │      │   INSERT {
    │      │     gameId: 237,
    │      │     playerId: 42,
    │      │     teamId: 5,
    │      │     type: "FIELD_GOAL",
    │      │     subtype: "2PT",
    │      │     points: 2,
    │      │     quarter: 1,
    │      │     eventContext: "normal",
    │      │     gameClockSeconds: 306
    │      │   }
    │      │
    │      ├─ UPSERT BoxScore
    │      │   UPDATE {
    │      │     points: +2,
    │      │     fgMade: +1,
    │      │     fgAttempted: +1,
    │      │     fg2Made: +1,
    │      │     fg2Attempted: +1
    │      │   }
    │      │   or CREATE with same values
    │      │
    │      └─ COMMIT (all or nothing)
    │
    └─ 4. After transaction
          ├─ calculateEfficiency(237, 42)
          │  └─ (PTS + REB + AST + STL + BLK) - (FGA - FGM + FTA - FTM + TO)
          │  └─ UPDATE BoxScore efficiency = value
          │
          └─ RETURN FibaEventResult {
               success: true,
               gameEventId: 12345,
               boxScoreId: 67890
             }
```

---

## Foul Handler Logic (with Auto-DQ)

```
addFoul(gameId=237, teamId=5, playerId=42)
    │
    ▼
recordFibaEvent({
  type: "FOUL",
  foulType: "PERSONAL",
  gameId: 237,
  teamId: 5,
  playerId: 42
})
    │
    ▼
handleFoul()
    │
    ├─ BEGIN Prisma.$transaction()
    │
    │  ├─ CREATE GameEvent
    │  │  { type: "FOUL", foulType: "PERSONAL", ... }
    │  │
    │  ├─ UPSERT BoxScore
    │  │  UPDATE {
    │  │    fouls: +1,
    │  │    foulsPersonal: +1
    │  │  }
    │  │
    │  ├─ Check DQ condition:
    │  │  totalFouls = boxScore.fouls + 1
    │  │
    │  └─ If totalFouls >= 5:
    │     │
    │     ├─ UPDATE BoxScore SET isFouledOut = true
    │     │
    │     ├─ UPDATE GameOnCourt
    │     │  SET onCourt = false
    │     │  (player automatically removed from court)
    │     │
    │     └─ CREATE GameSubstitution (implicit "OUT" event)
    │
    └─ COMMIT

RETURN FibaEventResult {
  success: true,
  validation: {
    playerFouledOut: true
  }
}
```

---

## Substitution Handler Logic (Court Time Tracking)

```
addSubstitution(gameId=237, teamId=5, playerId=42, action="out")
    │
    ▼
recordFibaEvent({
  type: "SUBSTITUTION",
  subtype: "OUT",
  gameId: 237,
  teamId: 5,
  playerId: 42
})
    │
    ▼
handleSubstitution()
    │
    ├─ BEGIN Prisma.$transaction()
    │
    │  ├─ CREATE GameSubstitution
    │  │  { playerId: 42, action: "OUT", quarter: 1, gameClockSeconds: 306 }
    │  │
    │  ├─ Fetch GameOnCourt record
    │  │  { onCourt: true, lastSubInTimestamp: 45, timeOnCourtSeconds: 120 }
    │  │
    │  ├─ If action === "OUT" AND lastSubInTimestamp !== null:
    │  │  │
    │  │  ├─ segmentDuration = 306 - 45 = 261 seconds
    │  │  ├─ newTimeOnCourtSeconds = 120 + 261 = 381 seconds
    │  │  │
    │  │  └─ UPDATE GameOnCourt
    │  │     {
    │  │       onCourt: false,
    │  │       lastSubInTimestamp: null,
    │  │       timeOnCourtSeconds: 381
    │  │     }
    │  │
    │  └─ (If action === "IN", just set onCourt = true + lastSubInTimestamp)
    │
    └─ COMMIT

RESULT:
- Player 42 now has 381 seconds recorded (6:21 on court)
- Next "IN" action will reset segment tracking
```

---

## Summary: What's New vs Legacy

```
┌────────────────────────┬──────────────────┬──────────────────────────┐
│ Aspect                 │ LEGACY           │ NEW (FIBA Event Engine)  │
├────────────────────────┼──────────────────┼──────────────────────────┤
│ Scoring                │ Direct in actions│ Via recordFibaEvent()    │
│ Fouls tracking         │ Basic (just count)│ Breakdown (P/T/U/D)      │
│ Auto-DQ (5 fouls)      │ Manual           │ Automatic               │
│ fouledPlayerId         │ ❌ Missing        │ ✅ Tracked              │
│ gameClockSeconds       │ ❌ Missing        │ ✅ Tracked              │
│ Court time calc        │ Simple           │ With current segment    │
│ FT vs FG distinction   │ No               │ Yes (subtype)           │
│ Running score          │ ❌ Impossible     │ ✅ Possible             │
│ Efficiency calc        │ Missing          │ Auto-calculated         │
│ Substitution pairs     │ Manual input     │ Auto (playerOutId)      │
│ Atomic transactions    │ Per function     │ Consistent in engine    │
└────────────────────────┴──────────────────┴──────────────────────────┘
```

---

## Files Dependency Graph

```
components/
└─ LiveScoreTracker.tsx
   └─ imports: addScoreWithType, addFoul, ... (from actions/game.ts)
      └─ actions/game.ts
         └─ re-exports from: lib/fiba/legacy-wrappers.ts
            └─ lib/fiba/legacy-wrappers.ts
               └─ imports: recordFibaEvent from lib/fiba/fiba-event-engine.ts
               └─ imports: types from lib/fiba/types.ts
                  │
                  ├─ lib/fiba/fiba-event-engine.ts
                  │  ├─ imports: types
                  │  ├─ imports: stats-calculator
                  │  └─ imports: prisma client
                  │
                  └─ lib/fiba/stats-calculator.ts
                     └─ imports: prisma client
                        │
                        └─ prisma/schema.prisma
                           └─ PostgreSQL (Neon DB)
```

