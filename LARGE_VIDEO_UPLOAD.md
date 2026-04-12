# Large Video Upload Implementation (>4.5MB)

## Problem
Vercel API routes have a strict 4.5MB body size limit. Videos larger than 4.5MB would fail during upload through the standard API route.

## Solution
Implemented client-side Vercel Blob upload that bypasses the API route, allowing large videos (20MB+) to upload directly from the browser to Vercel Blob Storage.

## Architecture

### 1. Upload Token Endpoint (`/api/gallery/upload-token`)
- **Method**: POST
- **Purpose**: Generate a client token for direct Blob upload
- **Input**:
  ```json
  {
    "gameId": 3,
    "filename": "video.mp4",
    "contentType": "video/mp4"
  }
  ```
- **Output**:
  ```json
  {
    "clientToken": "vercel_blob_client_...",
    "pathname": "videos/3/uploadId-timestamp.mp4"
  }
  ```
- **Validation**: Verifies game exists in database

### 2. Upload Complete Webhook (`/api/gallery/upload-complete`)
- **Method**: POST
- **Purpose**: Callback after successful Blob upload to save metadata in database
- **Input**:
  ```json
  {
    "blob": {
      "url": "https://aq5g7el...public.blob.vercel-storage.com/videos/3/uploadId-timestamp.mp4"
    },
    "tokenPayload": "{\"gameId\": 3, \"isVideo\": true, \"filename\": \"video.mp4\"}"
  }
  ```
- **Output**: Saves to Video table with `gameId` and `isPublished=true`

### 3. Client-Side Logic (GalleryTab.tsx)
File size detection:
```typescript
const fileSizeMB = file.size / (1024 * 1024);

if (isVideo && fileSizeMB > 4.5) {
  // Use client-side upload (Vercel Blob)
} else {
  // Use standard API route (<4.5MB)
}
```

## Flow Diagram

```
User selects video (20MB)
         ↓
GalleryTab detects size > 4.5MB
         ↓
Request token from /api/gallery/upload-token
         ↓
Receive clientToken + pathname
         ↓
upload() from @vercel/blob/client uploads directly to Blob storage
         ↓
Vercel Blob calls webhook: /api/gallery/upload-complete
         ↓
Callback saves metadata to Video table (gameId, URL, type, isPublished)
         ↓
Component refreshes UI with new video
```

## Testing

### Test 1: Token Generation
```bash
curl -X POST "https://basketball.lviv.ua/api/gallery/upload-token" \
  -H "Content-Type: application/json" \
  -d '{"gameId": 3, "filename": "test.mp4", "contentType": "video/mp4"}'
```
**Result**: ✅ Returns valid clientToken

### Test 2: Callback Handler
```bash
curl -X POST "https://basketball.lviv.ua/api/gallery/upload-complete" \
  -H "Content-Type: application/json" \
  -d '{
    "blob": {"url": "https://...video.mp4"},
    "tokenPayload": "{\"gameId\": 3, \"isVideo\": true, \"filename\": \"test.mp4\"}"
  }'
```
**Result**: ✅ Video saved to DB with id=15, gameId=3, published=true

### Test 3: Database Verification
```bash
SELECT id, title, url, type, "gameId", "isPublished" 
FROM "Video" 
WHERE type = 'highlight' 
ORDER BY "createdAt" DESC 
LIMIT 3;
```
**Result**: 
- ID=15, gameId=3, type=highlight, isPublished=true ✅
- ID=13, gameId=3, type=highlight, isPublished=true ✅

## Changes Made

### New Files
1. `app/api/gallery/upload-token/route.ts` (60 lines)
2. `app/api/gallery/upload-complete/route.ts` (52 lines)

### Modified Files
1. `app/admin/site-editor/tabs/GalleryTab.tsx`
   - Added import: `import { upload } from "@vercel/blob/client";`
   - Enhanced `handleUpload()` with size detection and branching logic
   - Large videos (>4.5MB) now use client-side upload
   - Small videos and photos still use API route

## Performance Impact
- **Large videos**: Upload directly from browser, no API timeout issues
- **Small files**: Still use fast API route with database validation
- **Network**: Reduced load on Vercel Functions, direct to Blob storage
- **UX**: No change - seamless upload experience for both file sizes

## Security Considerations
- Token generation validates game exists
- Client token is scoped to specific pathname
- Callback validates tokenPayload structure
- Files stored in public Vercel Blob (by design for media)
- gameId enforced per video record

## Future Improvements
1. Add progress tracking for large uploads (file.slice + resumable upload)
2. Add upload cancellation UI
3. Implement chunked upload for videos >100MB
4. Add video transcoding after upload
5. Track upload metrics (size, duration, success rate)

## Rollback Plan
If issues arise:
1. Revert GalleryTab.tsx to previous version
2. Fall back to API route for all videos
3. Keep token/callback endpoints for future use
