# 🚀 Development Server Startup Guide

## Quick Start

### ✅ Recommended: Safe Development Server
```bash
npm run dev
```

**This runs:** `node start.js` which internally calls `npx next dev -p 3006`

**What it does:**
- ✨ Kills any zombie processes on ports 3006-3012
- 🚀 Starts Next.js development server on port 3006
- 📊 Shows colored logs with progress
- ⏸️ Graceful shutdown on Ctrl+C

**Startup time:** ~4-8 seconds (includes Next.js compilation)

### 🌐 Open in Browser
- **Main app:** http://localhost:3006
- **Game (Younger U-14):** http://localhost:3006?ag=younger
- **Game (Older U-16):** http://localhost:3006?ag=older

---

## Port Mapping

| Port | Service | Notes |
|------|---------|-------|
| 3006 | **Main Next.js** | Production-equivalent |
| 3007 | Marketplace (optional) | `npm run marketplace` |
| 3008 | Courses (optional) | `npm run courses` |
| 3009 | Shop (optional) | `npm run shop` |
| 3010 | News (optional) | `npm run news-app` |
| 3011 | Chat (optional) | `npm run chat` |
| 3012 | Auth (optional) | `npm run auth` |

---

## Advanced Startup Options

### Single Command: Full Portal (All Services)
```bash
npm run portal
```
Starts: Main + Auth + Marketplace + Courses + Shop + News + Chat (7 ports)

### Just Auth Server
```bash
npm run auth
```
Auth server on port 3012 (authentication middleware)

### Multiple Services (Custom)
```bash
npm run marketplace &  # Port 3007
npm run courses &      # Port 3008
npm run shop &         # Port 3009
npm run dev            # Port 3006 (in foreground)
```

---

## Troubleshooting

### ❌ Port Already in Use
```bash
# Automatic: Our safe startup script cleans zombie processes
npm run dev

# Manual cleanup (if needed):
# Windows:
netstat -ano | findstr :3006
taskkill /PID <PID> /F /T

# macOS/Linux:
lsof -i :3006 -t | xargs kill -9
```

### ❌ "Module not found" Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Then start:
npm run dev
```

### ❌ Build Issues Before Startup
```bash
# Full clean rebuild
npm install
npx prisma generate
npm run build
npm run dev
```

### ❌ Server Crashes After Startup
Our startup script auto-restarts 3 times. If it keeps crashing:

1. Check console for error messages
2. Verify `.env` and `.env.local` are present
3. Check database connectivity: `npx prisma db execute --stdin < /dev/null`
4. Try clean restart:
   ```bash
   npm run dev:safe
   ```

---

## How the Startup Works

### 1. Environment Validation (start-dev.js)
- ✅ Checks for required files (package.json, next.config.mjs, prisma/schema.prisma)
- ✅ Sets NODE_ENV=development

### 2. Port Cleanup
- 🔍 Scans ports 3006-3012 using netstat (Windows) or lsof (Unix)
- 🔥 Force-kills any zombie Node processes
- ⏳ Waits 500ms for ports to fully release

### 3. Server Start
- 🚀 Spawns `next dev -p 3006` in development mode
- 📊 Streams output to console (logs visible)
- 🔄 Auto-restarts up to 3 times on crash

### 4. Graceful Shutdown
- Press `Ctrl+C` to stop cleanly
- Kills server process and exits

---

## Process Management (Advanced)

### Kill All Development Processes
```bash
# Windows
taskkill /F /IM node.exe

# macOS/Linux
pkill -f "next dev" || pkill -f node
```

### Check Running Ports
```bash
# Windows
netstat -ano | findstr "LISTEN"

# macOS/Linux
lsof -i -P -n | grep LISTEN
```

### Run in Background (Unix)
```bash
npm run dev > dev.log 2>&1 &
tail -f dev.log  # Watch logs
```

---

## Environment Files

### Required Files
- `.env` — Production environment variables (Vercel secrets)
- `.env.local` — Local overrides (Firebase config, API keys)

### Check Configuration
```bash
# Verify Next.js sees env vars
npx next info

# Verify Prisma
npx prisma validate
```

---

## Performance Notes

- **Cold start:** ~15-20 seconds (initial compilation)
- **Hot reload:** ~2-3 seconds (Turbopack)
- **Port cleanup:** ~1 second
- **Memory:** ~400-500 MB for single Next.js instance

---

## Legacy Scripts (Deprecated)

These still exist but are superseded:

| Script | Use Instead | Notes |
|--------|-------------|-------|
| `npm run dev:safe` | `npm run dev` | Old port cleanup script |
| `npm run dev:legacy` | `npm run dev` | Requires deleted server.ts |
| `npm run dev:all:safe` | `npm run portal` | Multiple services |

---

## Questions?

- Check `.env` and `.env.local` for missing credentials
- Verify Node v18+ and npm v10+ installed: `node -v && npm -v`
- Check database with: `npx prisma studio`
- Review server logs for startup errors

**Happy coding! 🏀**
