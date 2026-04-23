# Chat Session Time Tracking

## Overview
This feature adds automatic tracking of when chat participants join and leave the chat. Users can now see the exact time (in HH:MM format) when each participant joined and, if they've left, when they exited.

## Implementation Details

### Database Schema Changes
- **ChatOnline model** now includes two new timestamps:
  - `joinedAt`: Recorded when user first joins the chat (default: current time)
  - `leftAt`: Recorded when user leaves the chat (nullable)

### API Endpoints

#### 1. `/api/chat/participants` (GET)
Returns list of all chat participants with session times.

Response includes:
```json
{
  "members": [
    {
      "phone": "+380...",
      "firstName": "Name",
      "lastName": "Last",
      "hp": 100,
      "role": "player",
      "isMod": false,
      "isOnline": true,
      "joinedAt": "2026-04-23T06:49:13.974Z",  // NEW
      "leftAt": null                             // NEW
    }
  ]
}
```

#### 2. `/api/chat/heartbeat` (POST)
Updates user's online status and preserves existing `joinedAt`.

Body:
```json
{
  "phone": "+380...",
  "name": "User Name",
  "role": "player",
  "room": "general"
}
```

Behavior:
- On first join: Sets `joinedAt` to current time, `leftAt` to NULL
- On reconnect: Preserves existing `joinedAt`, clears `leftAt`

#### 3. `/api/chat/logout` (POST) - NEW
Marks when user leaves the chat.

Body:
```json
{
  "phone": "+380..."
}
```

Effect:
- Sets `leftAt` to current timestamp
- Does not delete the participant record

### UI Display

#### Mobile (ChatPageMobile.tsx)
Session time shows in participants sheet:
- **Online**: "онлайн з 14:23"
- **Offline**: "14:23 - 14:45"

Format: Two-line layout per participant
```
Name Surname              ● Online/Offline
💛 150 HP          14:23 - 14:45
```

#### Desktop (ChatPage.tsx)
Session time shows in participants sidebar:
- **Online**: "● онлайн 14:23 - 15:10"
- **Offline**: "○ оффлайн 14:23 - 14:45"

Format: Inline with status indicator

### Time Format
- Uses 24-hour format (HH:MM)
- Displayed in user's local timezone
- Format: `formatTime(date)` → "HH:MM"

### Session Tracking Logic

#### On User Join
1. Client sends `/api/chat` with `action: "register"`
2. Client sends heartbeat to `/api/chat/heartbeat`
3. Database records:
   - `joinedAt = NOW()` (if new record) or preserves existing
   - `leftAt = NULL` (clear any previous logout time)
   - `lastSeen = NOW()`

#### On User Leave
1. Page unload event triggers `beforeunload` listener
2. Client sends POST to `/api/chat/logout`
3. Database records:
   - `leftAt = NOW()`
   - `lastSeen` remains unchanged (for 2-minute online detection)

### Notes

**isOnline vs leftAt**
- `isOnline` = determined by `lastSeen > NOW() - 2 minutes`
- `leftAt` = explicit logout timestamp
- A user can have `leftAt` set but still appear `isOnline` if they were active within last 2 minutes
- This is intentional behavior for chat presence detection

**Data Persistence**
- Session data is NOT deleted when user logs out
- Historical data available for analytics
- Participants remain in the list even after they leave

### Testing

Run the test script:
```bash
npm run test:session-times
# or
node scripts/test-session-times.js
```

Expected output:
```
✅ SUCCESS: Session times are being tracked correctly!
```

### Migration

For new environments, run:
```bash
npx prisma migrate deploy
```

Or use the helper script:
```bash
node scripts/add-session-timestamps.js
```

## Files Changed
- `prisma/schema.prisma` - Added joinedAt/leftAt to ChatOnline
- `app/api/chat/heartbeat/route.ts` - Updated to preserve joinedAt
- `app/api/chat/participants/route.ts` - Returns session times
- `app/api/chat/logout/route.ts` - NEW endpoint for logout tracking
- `components/public/ChatPageMobile.tsx` - Display session times
- `components/public/ChatPage.tsx` - Display session times + helpers
- `prisma/migrations/add_chat_session_timestamps/` - DB migration

## Future Enhancements
- Session duration tracking (total time spent in chat)
- Peak hours analytics
- Session history dashboard
- Automatic cleanup of old session records
