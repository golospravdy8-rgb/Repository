# 📋 FIBA Schema Proposal (Parte 1: Models)

## ✅ ПОТОЧНІ МОДЕЛІ (не змінюються)
- Game (додаємо нові поля)
- Team, Player, Season, Tour
- GameOnCourt
- ProtocolOverride, ProtocolAuditLog

## 🔄 ПЕРЕПИСАНІ МОДЕЛІ

### 1. GameEvent (розширена для FIBA)

```prisma
model GameEvent {
  id            Int      @id @default(autoincrement())
  gameId        Int
  playerId      Int?     // Гравець який виконав дію
  teamId        Int
  
  // === ОСНОВНА ДІЯ ===
  type          String   // "FIELD_GOAL" | "FREE_THROW" | "REBOUND" | "ASSIST" | ...
  subtype       String?  // "2PT" | "3PT" | "MISS_2PT" | "MISS_3PT" | "MISS_FT"
  
  // === ОЧКИ ===
  points        Int?     // 0, 1, 2, 3 для FIELD_GOAL
  
  // === КОНТЕКСТ ДІЇ ===
  eventContext  String?  // "normal" | "fastbreak" | "second_chance" | "off_turnover"
  
  // === ФОЛИ (якщо type = "FOUL") ===
  foulType      String?  // "PERSONAL" | "TECHNICAL" | "UNSPORTSMANLIKE" | "DISQUALIFYING"
  fouledPlayerId Int?    // На кого був фол (НОВE!)
  wasShooting   Boolean @default(false) // Це був shooting foul?
  
  // === ШТРАФНІ (якщо type = "FREE_THROW") ===
  ftSequence    Int?     // 1, 2, 3 (скільки штрафних у серії)
  ftSuccess     Boolean? // true/false для кожного FT
  
  // ===  ЧАС В ГРІ ===
  quarter       Int
  gameClockSeconds Int?  // Реальний час в грі (600 - timeLeft)
  
  // === ТЕХНІЧНІ ПОЛЯ ===
  idempotencyKey String? @unique  // Захист від дубліків
  createdAt     DateTime @default(now())
  
  // RELATIONS
  game          Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player        Player?  @relation(fields: [playerId], references: [id])
}
```

### 2. BoxScore (розширена для FIBA)

```prisma
model BoxScore {
  id               Int     @id @default(autoincrement())
  gameId           Int
  playerId         Int
  teamId           Int
  
  // === ОЧКИ ===
  points           Int     @default(0)
  
  // === КИДКИ З ГРИ (Field Goals) ===
  fgMade           Int     @default(0)      // Всього закинутих (2PT + 3PT)
  fgAttempted      Int     @default(0)      // Всього спроб
  fg2Made          Int     @default(0)      // Двохочкові закинуті
  fg2Attempted     Int     @default(0)      // Двохочкові спроби
  fg3Made          Int     @default(0)      // Трьохочкові закинуті
  fg3Attempted     Int     @default(0)      // Трьохочкові спроби
  
  // === ШТРАФНІ (Free Throws) ===
  ftMade           Int     @default(0)      // Штрафні закинуті
  ftAttempted      Int     @default(0)      // Штрафні спроби
  
  // === ВІДСКОКИ (Rebounds) ===
  reboundsOff      Int     @default(0)      // Атакуючі (offensive)
  reboundsDef      Int     @default(0)      // Захисні (defensive)
  rebounds         Int     @default(0)      // Всього
  
  // === ІНШІ СТАТИСТИКИ ===
  assists          Int     @default(0)
  steals           Int     @default(0)
  blocks           Int     @default(0)
  turnovers        Int     @default(0)
  
  // === ФОЛИ (розширена структура) ===
  foulsPersonal    Int     @default(0)      // Personal (P)
  foulsTechnical   Int     @default(0)      // Technical (T)
  foulsUnsports    Int     @default(0)      // Unsportsmanlike (U)
  foulsDisq        Int     @default(0)      // Disqualifying (D)
  fouls            Int     @default(0)      // Всього (backward compat)
  
  // === СПЕЦІАЛЬНІ ПОЛЯ ===
  minutesPlayed    String? // "MM:SS" format
  isStarter        Boolean @default(false)
  isFouledOut      Boolean @default(false)  // 5+ фолів (або DQ)
  isDisqualified   Boolean @default(false)  // Technical/Unsports × 2 або DQ
  
  // === МЕТРИКИ ===
  plusMinus        Int     @default(0)
  efficiency       Float   @default(0.0)    // (PTS+REB+AST+STL+BLK)-(FGA-FGM+FTA-FTM+TO)
  
  // RELATIONS
  game             Game    @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player           Player  @relation(fields: [playerId], references: [id])
  team             Team    @relation(fields: [teamId], references: [id])
  
  @@unique([gameId, playerId])
}
```

### 3. GameSubstitution (розширена)

```prisma
model GameSubstitution {
  id           Int      @id @default(autoincrement())
  gameId       Int
  playerId     Int
  playerOutId  Int?     // Кого замінює (якщо є)
  teamId       Int
  
  action       String   // "IN" | "OUT"
  quarter      Int?
  gameClockSeconds Int?  // Точний час в грі (600 - timeLeft)
  gameTime     String?  // "5:23" (для UI)
  
  createdAt    DateTime @default(now())
  
  // RELATIONS
  game         Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player       Player   @relation(fields: [playerId], references: [id])
  team         Team     @relation(fields: [teamId], references: [id])
}
```

### 4. GameOnCourt (розширена)

```prisma
model GameOnCourt {
  gameId                Int
  playerId              Int
  teamId                Int
  
  // === СТ СТАНУ ===
  onCourt               Boolean   @default(false)
  isStarter             Boolean   @default(false)
  
  // === ТАЙМІНГ ===
  timeOnCourtSeconds    Int       @default(0)    // Накопичена секунди
  lastSubInTimestamp    Int?                     // Game clock (сек) при останньому sub in
  
  // RELATIONS
  game                  Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player                Player    @relation(fields: [playerId], references: [id])
  team                  Team      @relation(fields: [teamId], references: [id])
  
  @@id([gameId, playerId])
}
```

## 📝 SQL MIGRATION SKELETON

```sql
-- 1. Додати нові колонки до GameEvent
ALTER TABLE "GameEvent" ADD COLUMN "fouledPlayerId" INTEGER;
ALTER TABLE "GameEvent" ADD COLUMN "foulType" TEXT;
ALTER TABLE "GameEvent" ADD COLUMN "wasShooting" BOOLEAN DEFAULT false;
ALTER TABLE "GameEvent" ADD COLUMN "ftSequence" INTEGER;
ALTER TABLE "GameEvent" ADD COLUMN "ftSuccess" BOOLEAN;
ALTER TABLE "GameEvent" ADD COLUMN "gameClockSeconds" INTEGER;
ALTER TABLE "GameEvent" RENAME COLUMN "eventSubtype" TO "eventContext";
ALTER TABLE "GameEvent" ADD COLUMN "subtype" TEXT;

-- 2. Додати нові колонки до BoxScore
ALTER TABLE "BoxScore" ADD COLUMN "fg2Made" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "fg2Attempted" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "fg3Made" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "fg3Attempted" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "foulsPersonal" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "foulsTechnical" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "foulsUnsports" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "foulsDisq" INTEGER DEFAULT 0;
ALTER TABLE "BoxScore" ADD COLUMN "isFouledOut" BOOLEAN DEFAULT false;
ALTER TABLE "BoxScore" ADD COLUMN "isDisqualified" BOOLEAN DEFAULT false;

-- 3. Додати gameClockSeconds до GameSubstitution
ALTER TABLE "GameSubstitution" ADD COLUMN "gameClockSeconds" INTEGER;
ALTER TABLE "GameSubstitution" ADD COLUMN "playerOutId" INTEGER;
```

## 🎯 КЛЮЧОВІ ЗМІНИ

✅ **GameEvent** тепер універсальний для всіх FIBA подій  
✅ **BoxScore** містить всі необхідні поля для протоколу  
✅ **Фоли** розділені по типам (P, T, U, D)  
✅ **Штрафні** отримали власну структуру  
✅ **fouledPlayerId** вирішує проблему "на кого був фол"  
✅ **gameClockSeconds** дає точний час кожної дії  

