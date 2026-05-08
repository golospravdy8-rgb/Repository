# PHASE 4 — Новые типы и структура состояния
**Дата:** 2026-05-08  
**Статус:** ПЛАНИРОВАНИЕ ПЕРЕД РЕАЛИЗАЦИЕЙ

---

## 1. НОВЫЕ ТИПЫ

### PlayerOnCourtState
```typescript
interface PlayerOnCourtState {
  // Идентификация
  playerId: number
  number: number
  firstName: string
  lastName: string
  teamId: number
  
  // Статус на площадке
  onCourt: boolean           // true = на площадке, false = на скамейке
  isStarter: boolean         // true = стартовый пятерка, false = резерв
  
  // Время
  timeOnCourtSeconds: number //累積時間 (минут) = timeOnCourtSeconds (сек)
  lastSubInTimestamp: number | null // Когда игрок вошёл (в сек. от начала игры)
  
  // Статистика
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  turnovers: number
  plusMinus: number
}
```

### TeamPlayersState
```typescript
interface TeamPlayersState {
  teamId: number
  name: string
  players: Record<number, PlayerOnCourtState>  // playerId → state
}
```

### GameStateCompact
```typescript
interface GameStateCompact {
  gameId: number
  status: 'SCHEDULED' | 'LIVE' | 'FINAL'
  quarter: number
  homeScore: number
  awayScore: number
  homeTimeouts: number
  awayTimeouts: number
  
  gameClock: number          // Секунды ПРОШЕДШИЕ с начала четверти
  isClockRunning: boolean
  
  homeTeam: TeamPlayersState
  awayTeam: TeamPlayersState
}
```

---

## 2. НОВАЯ СТРУКТУРА СОСТОЯНИЯ В LiveScoreTracker

### основные useState'ы (ДО РЕФАКТОРА):
```typescript
// СТАРОЕ состояние (удалить):
const [boxScores, setBoxScores] = useState<...[]>(...)  // ❌ УДАЛИТЬ
const [onCourtHome, setOnCourtHome] = useState<Set<number>>(...)  // ❌ ЗАМЕНИТЬ
const [onCourtAway, setOnCourtAway] = useState<Set<number>>(...)  // ❌ ЗАМЕНИТЬ
```

### основные useState'ы (ПОСЛЕ РЕФАКТОРА):
```typescript
// НОВОЕ состояние (добавить):
const [gameState, setGameState] = useState<GameStateCompact>(() => ({
  gameId: game.id,
  status: game.status as 'SCHEDULED' | 'LIVE' | 'FINAL',
  quarter: game.quarter,
  homeScore: game.homeScore,
  awayScore: game.awayScore,
  homeTimeouts: game.homeTimeouts,
  awayTimeouts: game.awayTimeouts,
  gameClock: 0,  // Инициализируется в useEffect
  isClockRunning: false,
  
  homeTeam: { teamId: game.homeTeamId, name: game.homeTeam.name, players: {} },
  awayTeam: { teamId: game.awayTeamId, name: game.awayTeam.name, players: {} },
}))

// ВЫБОР СТАРТОВОЙ ПЯТЁРКИ (только для SCHEDULED статуса):
const [selectedStarters, setSelectedStarters] = useState<{
  home: Set<number>  // playerId'ы выбранных стартеров
  away: Set<number>
}>({ home: new Set(), away: new Set() })

// СОСТОЯНИЕ ЗАМЕНЫ (двухшаговый процесс):
type SubstitutionState = 
  | { phase: 'idle' }
  | { phase: 'selecting_bench', teamId: number, playerOutId: number }

const [substitutionMode, setSubstitutionMode] = useState<SubstitutionState>({ phase: 'idle' })
```

### Оставить без изменений:
```typescript
const [timeLeft, setTimeLeft] = useState(QUARTER_DURATION)  // ✓ Как было
const [timerRunning, setTimerRunning] = useState(false)      // ✓ Как было
const [selectedPlayerId, setSelectedPlayerId] = useState<...>  // ✓ Как было
const [eventType, setEventType] = useState<...>(...)         // ✓ Как было
const [showGridView, setShowGridView] = useState(false)      // ✓ Как было
```

---

## 3. ИНИЦИАЛИЗАЦИЯ gameState ИЗ PROPS

### useEffect при загрузке game:
```typescript
useEffect(() => {
  if (!game.boxScores || !game.onCourt) return

  // Построить Record игроков для обоих команд
  const buildTeamPlayers = (teamId: number): Record<number, PlayerOnCourtState> => {
    const players: Record<number, PlayerOnCourtState> = {}
    
    const teamPlayers = teamId === game.homeTeamId 
      ? game.homeTeam.players 
      : game.awayTeam.players
    
    teamPlayers.forEach(p => {
      const boxScore = game.boxScores.find(bs => bs.playerId === p.id)
      const onCourtRecord = game.onCourt.find(oc => oc.playerId === p.id)
      
      players[p.id] = {
        playerId: p.id,
        number: p.number,
        firstName: p.firstName,
        lastName: p.lastName,
        teamId: p.teamId,
        
        onCourt: onCourtRecord?.onCourt ?? false,
        isStarter: onCourtRecord?.isStarter ?? false,
        timeOnCourtSeconds: onCourtRecord?.timeOnCourtSeconds ?? 0,
        lastSubInTimestamp: onCourtRecord?.lastSubInTimestamp ?? null,
        
        points: boxScore?.points ?? 0,
        rebounds: boxScore?.rebounds ?? 0,
        assists: boxScore?.assists ?? 0,
        steals: boxScore?.steals ?? 0,
        blocks: boxScore?.blocks ?? 0,
        fouls: boxScore?.fouls ?? 0,
        turnovers: boxScore?.turnovers ?? 0,
        plusMinus: boxScore?.plusMinus ?? 0,
      }
    })
    
    return players
  }
  
  setGameState(prev => ({
    ...prev,
    status: game.status as 'SCHEDULED' | 'LIVE' | 'FINAL',
    quarter: game.quarter,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeTimeouts: game.homeTimeouts,
    awayTimeouts: game.awayTimeouts,
    
    homeTeam: {
      ...prev.homeTeam,
      players: buildTeamPlayers(game.homeTeamId),
    },
    awayTeam: {
      ...prev.awayTeam,
      players: buildTeamPlayers(game.awayTeamId),
    },
  }))
}, [game.id, game.boxScores, game.onCourt, game.status])
```

---

## 4. ПЛАН ИЗМЕНЕНИЙ (какие части кода менять)

### A. Файл: `LiveScoreTracker.tsx`

#### Изменение 1: Импорты (строка 4)
- ❌ Удалить `startGame, addSubstitution` 
- ✅ Добавить `startGameRefactored, addSubstitutionRefactored`

#### Изменение 2: Типы (строки 8–16)
- Обновить `GameWithAll` тип с новыми полями `onCourt`

#### Изменение 3: Переменные состояния (строки 259–272)
- ❌ Удалить `boxScores, setBoxScores`
- ❌ Удалить `onCourtHome, setOnCourtHome`
- ❌ Удалить `onCourtAway, setOnCourtAway`
- ✅ Добавить `gameState, setGameState`
- ✅ Добавить `selectedStarters, setSelectedStarters`
- ✅ Добавить `substitutionMode, setSubstitutionMode`

#### Изменение 4: useEffect инициализации (строки 280–319)
- ❌ Заменить старый useEffect (boxScores merge)
- ✅ Добавить новый useEffect (buildTeamPlayers, инициализация gameState)

#### Изменение 5: RosterPanel компонент (строки 47–250)
- Изменить пропсы: вместо `players: Player[]` → `players: Record<number, PlayerOnCourtState>`
- Вместо `onCourtIds: Set<number>` → `gameState: GameStateCompact`
- Обновить фильтрацию `onCourt` и `bench`
- Добавить отображение **минут** для каждого игрока
- Добавить кнопку **"Замена"** для игроков на площадке
- Обновить кнопки **лампочек** (лампочка = `player.onCourt` или `player.isStarter` зависит от статуса игры)

#### Изменение 6: Кнопка "Старт игры" (строка 514)
- ❌ `startGame(game.id)` → ✅ `startGameRefactored(game.id, [...selectedStarters.home], [...selectedStarters.away])`
- После успеха: обновить local state на `status = 'LIVE'`

#### Изменение 7: Двухшаговая замена (новый блок кода)
- Функция `handleSubstitutionStep1(playerId, teamId)` — отмечает игрока как "уходящий"
- Функция `handleSubstitutionStep2(playerId, teamId)` — вызывает API и обновляет state

#### Изменение 8: Обновление минут (новый useEffect)
- Каждую секунду пересчитывать `getDisplayTime()` для игроков на площадке

#### Изменение 9: StatEntryGrid передача props (строка 608)
- ❌ `boxScores={boxScores}` → ✅ `gameState={gameState}`

### B. Файл: `StatEntryGrid.tsx`

#### Изменение 1: Пропсы (строка 23)
- ❌ `boxScores: (BoxScore & { player: Player })[]`
- ✅ `gameState: GameStateCompact`

#### Изменение 2: getBoxScore функция (строки 77–79)
- ❌ `boxScores.find(...)` (O(n))
- ✅ `gameState.homeTeam.players[playerId] || gameState.awayTeam.players[playerId]` (O(1))

#### Изменение 3: renderTeamSection (пересчёт инстанций)
- Вместо `team.players` итерировать `Object.values(gameState.homeTeam.players)`
- Использовать новую структуру PlayerOnCourtState

---

## 5. НОВЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

### Функция: getDisplayTime()
```typescript
function getDisplayTime(player: PlayerOnCourtState, gameClock: number): string {
  let totalSeconds = player.timeOnCourtSeconds
  
  if (player.onCourt && player.lastSubInTimestamp !== null) {
    totalSeconds += gameClock - player.lastSubInTimestamp
  }
  
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
```

### Функция: updatePlayerStats()
```typescript
function updatePlayerStats(
  state: GameStateCompact,
  teamId: number,
  playerId: number,
  updates: Partial<PlayerOnCourtState>
): GameStateCompact {
  const isHome = teamId === state.homeTeam.teamId
  const team = isHome ? state.homeTeam : state.awayTeam
  
  const player = team.players[playerId]
  if (!player) return state
  
  const updated = isHome ? { ...state.homeTeam } : { ...state.awayTeam }
  updated.players = { ...team.players }
  updated.players[playerId] = { ...player, ...updates }
  
  return isHome
    ? { ...state, homeTeam: updated }
    : { ...state, awayTeam: updated }
}
```

---

## 6. ОЖИДАЕМЫЕ ИЗМЕНЕНИЯ В ПОЛЬЗОВАТЕЛЬСКОМ ПОТОКЕ

### ДО (старое поведение):
```
1. Кликнуть "Старт" → сразу 5 первых игроков стартовальты
2. Нет UI для замены (или не работает)
3. Нет отображения минут
```

### ПОСЛЕ (новое поведение):
```
1. Статус SCHEDULED: все лампочки выключены → админ кликает 5 на команду → кликает "Старт"
2. Статус LIVE: лампочки горят зелёным у тех, кто на площадке
3. Замена: клик на игрока + кнопка "Замена" → выбрать игрока на скамейке → применить
4. Все игроки видны в списке (20 строк: 5 на площадке + 7 на скамейке × 2 команды)
5. Видно время каждого игрока (MM:SS), обновляется каждую секунду для игроков на площадке
```

---

## 7. ТИПОВЫЕ ОШИБКИ, КОТОРЫХ ИЗБЕЖИМ

❌ ЖДУ избежать:
- ❌ `Object.values()` вместо прямого доступа к players[playerId]
- ❌ Пересоздание объектов Record при каждом обновлении
- ❌ Замена всего gameState при получении server update
- ❌ Использование array.find() вместо O(1) Record lookup
- ❌ Потеря timeOnCourtSeconds при refresh

✅ Будет гарантировано:
- ✅ О(1) lookups везде
- ✅ Atomic merges на уровне игроков
- ✅ Корректный расчёт минут при page refresh
- ✅ Всегда все 12+ игроков видны
- ✅ Лампочки работают правильно на каждом шаге

---

## READY FOR IMPLEMENTATION ✓

Структура ясна, типы определены, план детализирован.

Начинаю писать код согласно этому плану.

