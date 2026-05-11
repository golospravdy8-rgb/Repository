# Next.js 15 Async Params Fix

**Date:** 2026-05-11  
**Commit:** e78dcda  
**Issue:** Dynamic route pages were returning 404 due to unresolved async params

---

## Root Cause

In Next.js 15, the `params` property passed to page components became a `Promise<T>` instead of a synchronous object. This is a breaking change from Next.js 14.

### ❌ Before (Broken in Next.js 15)

```typescript
export default async function Page({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);  // ← params still a Promise, params.id is undefined
  // parseInt(undefined) → NaN
  // findUnique({ id: NaN }) → null
  // notFound() → 404
}
```

### ✅ After (Fixed for Next.js 15)

```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;  // ← properly await params first
  const id = parseInt(rawId);          // ← now id is properly resolved
  // findUnique({ id: 256 }) → works!
}
```

---

## Files Fixed (5 Total)

### 1. Admin Route
**File:** `app/admin/games/[id]/page.tsx:9-10`

```diff
- export default async function AdminGamePage({ params }: { params: { id: string } }) {
+ export default async function AdminGamePage({ params }: { params: Promise<{ id: string }> }) {
+   const { id: rawId } = await params;
-   const gameId = parseInt(params.id);
+   const gameId = parseInt(rawId);
```

### 2. Secretarial Protocol Route
**File:** `app/(public)/game/[id]/secretarial-protocol/page.tsx:9-10`

```diff
- export default async function SecretarialProtocolPage({ params }: { params: { id: string } }) {
+ export default async function SecretarialProtocolPage({ params }: { params: Promise<{ id: string }> }) {
+   const { id: rawId } = await params;
-   const gameId = parseInt(params.id);
+   const gameId = parseInt(rawId);
```

### 3. Gallery Route
**File:** `app/(public)/gallery/[gameId]/page.tsx:7-14`

```diff
- export default async function GameGalleryPage({ params }: { params: { gameId: string } }) {
+ export default async function GameGalleryPage({ params }: { params: Promise<{ gameId: string }> }) {
+   const { gameId: rawGameId } = await params;
    let galleryData: any = { albums: [] };
    try {
      galleryData = JSON.parse(...);
    } catch {
      notFound();
    }
-   const gameId = parseInt(params.gameId);
+   const gameId = parseInt(rawGameId);
```

### 4. Highlights Route
**File:** `app/(public)/highlights/[id]/page.tsx:12-19`

```diff
- export default async function VideoPage({ params }: { params: { id: string } }) {
+ export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
+   const { id: rawId } = await params;
    let highlightsData: any = { videos: [] };
    try {
      highlightsData = JSON.parse(...);
    } catch {
      notFound();
    }
-   const videoId = parseInt(params.id);
+   const videoId = parseInt(rawId);
```

### 5. Players Route
**File:** `app/(public)/players/[id]/page.tsx:15-16`

```diff
- export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
+ export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
+   const { id: rawId } = await params;
-   const playerId = parseInt(params.id);
+   const playerId = parseInt(rawId);
```

---

## Public Route Already Fixed

**File:** `app/(public)/game/[id]/page.tsx:129-131`

This route was already correctly handling params:

```typescript
export default async function GamePage({ 
  params 
}: { 
  params: Promise<{ id: string }> | { id: string } 
}) {
  const resolvedParams = await Promise.resolve(params);  // ← correct approach
  const gameId = parseInt(resolvedParams.id);
```

---

## Verification

### Build Status
```
✅ TypeScript: ZERO ERRORS
✅ npm run build: SUCCESS
✅ All dynamic routes compiled
```

### Routes Verified
- ✅ `/admin/games/[id]` — admin game page
- ✅ `/game/[id]` — public game page (already correct)
- ✅ `/game/[id]/secretarial-protocol` — protocol page
- ✅ `/gallery/[gameId]` — gallery page
- ✅ `/highlights/[id]` — highlights page
- ✅ `/players/[id]` — player profile page

---

## Impact

**Before:** Accessing `/admin/games/256` or `/game/256` → 404 (undefined params)  
**After:** All dynamic routes now properly resolve params before use

This fix enables all dynamic route pages to function correctly in Next.js 15+.

---

## Next.js 15 Breaking Changes

This is a key breaking change in Next.js 15. For any **new** dynamic route pages:

```typescript
// Next.js 15+ REQUIRED pattern:
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // use slug here
}
```

Do NOT use the old pattern:
```typescript
// ❌ This will NOT work in Next.js 15:
export default function Page({ params }: { params: { slug: string } }) {
  // params.slug is undefined!
}
```

---

**Reference:** [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)

Commit: `e78dcda`  
Date: 2026-05-11
