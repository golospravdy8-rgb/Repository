# 🏀 Basketball.lviv — Youth Basketball League Platform

Production-ready Next.js 14 + Firebase + Prisma application for managing youth basketball leagues with multiplayer game physics.

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ ([download](https://nodejs.org/))
- **npm** v10+ (included with Node.js)
- **Git** (for version control)

### Installation & Startup (2 minutes)

```bash
# 1. Clone or navigate to project
cd basket-lviv

# 2. Install dependencies
npm install

# 3. Start development server (✅ RECOMMENDED)
npm run dev
```

**Exact command that works on Windows/macOS/Linux:**
```bash
node start.js
```

This script:
- ✅ Kills zombie processes on ports 3006-3012
- ✅ Starts `npx next dev -p 3006`
- ✅ Shows colored status logs
- ✅ Auto-handles Ctrl+C graceful shutdown

**Open browser:** http://localhost:3006

---

## 📱 Game URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3006` | Main site (homepage) |
| `http://localhost:3006?ag=younger` | Game: Younger age group (U-14) |
| `http://localhost:3006?ag=older` | Game: Older age group (U-16) |

---

## 🛠️ Development

### Main Development Commands

```bash
npm run dev           # ✅ Start main app (port 3006) — USE THIS
npm run dev:safe      # Alternative: manual port cleanup first
npm run dev:next      # Direct Next.js (port 3007)
npm run portal        # Start ALL services (main + 6 optional apps)
npm run build         # Production build
npm run start         # Production start
npm run lint          # Check code style
```

### Optional Services

```bash
npm run auth          # Auth server (port 3012)
npm run marketplace   # Marketplace app (port 3007)
npm run courses       # Courses app (port 3008)
npm run shop          # Shop app (port 3009)
npm run news-app      # News app (port 3010)
npm run chat          # Chat app (port 3011)
```

### Database

```bash
npx prisma generate      # Generate Prisma client
npx prisma db push       # Sync schema with database
npx prisma db seed       # Populate sample data
npx prisma studio        # Open database admin UI
```

---

## 🐛 Troubleshooting

### "Port 3006 already in use"
```bash
npm run dev
# Automatic cleanup handles this — try again
```

### "Module 'next' not found"
```bash
npm install
npm run dev
```

### "ECONNREFUSED" when starting
Check `.env` and `.env.local` exist:
```bash
ls -la .env .env.local
```

If missing:
1. Check `.secrets/apis.md` for environment setup
2. Copy credentials to `.env.local`
3. Run `npm run dev` again

### Server crashes immediately
```bash
# Full rebuild
npm install
npx prisma generate
npm run dev
```

---

## 📁 Project Structure

```
basket-lviv/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── (public)/        # Public pages
│   │   ├── admin/           # Admin panel (protected)
│   │   ├── api/             # API routes
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   ├── lib/                 # Utilities (db.ts, auth.ts, etc)
│   └── types/               # TypeScript types
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Sample data
├── public/                  # Static files
├── .env                     # Production secrets (Vercel)
├── .env.local               # Local dev overrides
├── next.config.mjs          # Next.js config
├── start.js                 # ✨ Startup script
└── package.json
```

---

## 🎮 Game Architecture

### Multiplayer System
- **Real-time Sync:** Firebase Realtime Database
- **Physics Engine:** Matter.js + custom basketball collisions
- **Canvas Rendering:** HTML5 2D Canvas with 60fps updates

### Shot Physics
- Pure physics-based system (SI units: meters, seconds)
- Realistic rim contact (16-segment collision ring)
- Multiple outcomes: swish, rattle, rim out, bank shot, miss
- Spin mechanics affecting trajectory

### Player State
- Local state: players list, game rounds, scores
- Firebase sync: real-time position, ball flight
- Multiplayer deduplication: prevents ghost players

---

## 🔐 Authentication

### Admin Login
- **Route:** `/admin/login`
- **Auth:** NextAuth.js v5 (credentials only)
- **Protected:** `/admin/*` routes

### Default Credentials
Check `.env.local` for admin user setup.

---

## 📊 Database

**Provider:** PostgreSQL (Neon)  
**ORM:** Prisma  

### Key Tables
- `users` — Players & admins
- `teams` — Team data
- `games` — Match records
- `boxscores` — Game statistics
- `sitesettings` — Configuration

### Backup & Restore
```bash
npm run db:backup-current      # Export current state
npm run db:restore-current     # Import from backup
npm run db:studio              # Open admin UI
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# One-time setup
npm i -g vercel
vercel login
vercel link

# Deploy
vercel deploy --prod
```

Environment variables are auto-synced from Vercel dashboard.

### Manual Setup
1. Set `DATABASE_URL` in Vercel env vars
2. Set `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
3. Deploy: `git push` (auto-triggers Vercel build)

---

## 📝 Development Tips

### Hot Reload
- CSS changes: instant (Turbopack)
- JS changes: ~2-3 seconds
- Server Actions: instant

### Debugging
```bash
# Enable debug logs
DEBUG=* npm run dev

# Open Prisma Studio
npx prisma studio

# Check env variables
npx next info
```

### Testing
```bash
# Run local game test
npm run dev
# Open http://localhost:3006?ag=younger
# Click "Помощь" → test shooting mechanics
```

---

## 🎯 Key Features

✅ **Real-time Multiplayer** — Firebase-based player sync  
✅ **Physics-Based Basketball** — Realistic shot mechanics  
✅ **Admin Panel** — Manage teams, players, games  
✅ **Season Statistics** — Leaderboards & MVP voting  
✅ **Media Gallery** — Team photos & match videos  
✅ **Mobile Responsive** — Tailwind CSS  
✅ **Production Ready** — Deployed on Vercel  

---

## 📚 Additional Resources

- [Startup Guide](./STARTUP.md) — Detailed port & service management
- [CLAUDE.md](./CLAUDE.md) — Project conventions & mobile dev rules
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)

---

## 🤝 Support

**Port Issues?**
→ See [STARTUP.md](./STARTUP.md) for troubleshooting

**Environment Setup?**
→ Check `.secrets/apis.md` for credentials

**Database Problems?**
→ Run `npx prisma db push` to sync schema

---

## 📄 License

Private project. All rights reserved.

---

**Happy coding! 🏀**

Last updated: 2026-05-02
