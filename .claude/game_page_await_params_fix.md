---
name: Game Page Await Params Fix (2026-04-10)
description: Fixed /game/[id] dynamic route for Next.js 14.2+ (await params promise)
type: project
---

## Проблема
На Vercel basketball.lviv.ua/game/21 показувала помилку «Матч не знайдено»,
тоді як на localhost /game/4 працювала идеально.

## Корінь проблеми
Next.js 14.2+ / 15+ змінили як працюють динамічні параметри маршруту.
Параметри (params) тепер є **Promise**, а не звичайний об'єкт.

Поточний код використовував:
```typescript
export default async function GamePage({ params }: { params: { id: string } }) {
  const gameId = parseInt(params.id);  // ❌ params.id може бути undefined
}
```

На production це призводило до:
- `params.id` → undefined
- `parseInt(undefined)` → NaN
- `notFound()` → помилка "Матч не знайдено"

## Рішення (комміт 0fc91ed)

### 1. Await params (КРИТИЧНЕ)
```typescript
const resolvedParams = await Promise.resolve(params);
const gameId = parseInt(resolvedParams.id);
```

### 2. Type signature для Next.js 15+ compatibility
```typescript
{ params: Promise<{ id: string }> | { id: string } }
```

### 3. Детальніше error logging
```typescript
console.error("[GamePage] Error loading game...", {
  message, code, name, stack
});
```

## Результат
- ✅ /game/21 на Vercel тепер показує матч (якщо існує в БД)
- ✅ /game/999 показує not-found (правильна поведінка)
- ✅ Error logs детальні для діагностики

## Важливі env vars на Vercel
```
DATABASE_URL="...@ep-...-pooler...?sslmode=require&connect_timeout=15&pool_timeout=15"
PRISMA_DATABASE_URL="...@ep-...?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="..." (опціонально)
NEXT_PUBLIC_SUPABASE_ANON_KEY="..." (опціонально)
```

## Тестування
- localhost:3006/game/1 → ✅ матч показується
- basketball.lviv.ua/game/1 → ✅ матч показується (після redeploy)
