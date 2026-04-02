const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function redactEnv(content) {
  if (!content) return null;
  return content
    .replace(/(npg_[A-Za-z0-9]+)/g, '[REDACTED_PG_PASS]')
    .replace(/VERCEL_OIDC_TOKEN="[^"]+"/g, 'VERCEL_OIDC_TOKEN="[REDACTED_TOKEN]"')
    .replace(/(PGPASSWORD=)[^\n]+/g, '$1[REDACTED]')
    .replace(/(POSTGRES_PASSWORD=)[^\n]+/g, '$1[REDACTED]');
}

const base = 'D:/n8n/basket-lviv';

const dbRaw = fs.readFileSync('C:/Users/Zabar/.claude/projects/D--n8n/666e846f-2ae3-4ccd-9f6a-88d925d415fd/tool-results/bp3exv0xz.txt', 'utf8');
const dbData = JSON.parse(dbRaw);
const settingsClean = dbData.settings.map(s => ({
  id: s.id, key: s.key,
  value: s.value && s.value.startsWith('data:') && s.value.length > 2000 ? '[base64-image]' : s.value,
  updatedAt: s.updatedAt
}));

const quizData = [
  {id:1,question:"Скільки гравців в баскетбольній команді на майданчику?",options:["4","5","6","7"],correctIndex:1,category:"rules",hpReward:15},
  {id:2,question:"Скільки очок дає кидок з-за лінії трьох очок?",options:["1","2","3","4"],correctIndex:2,category:"rules",hpReward:10},
  {id:3,question:"Яка висота баскетбольного кільця?",options:["2.65м","3.05м","3.25м","3.5м"],correctIndex:1,category:"rules",hpReward:20},
  {id:4,question:"Скільки хвилин триває одна чверть у баскетболі?",options:["8 хвилин","10 хвилин","12 хвилин","15 хвилин"],correctIndex:1,category:"rules",hpReward:10},
  {id:5,question:"Як називається порушення коли гравець переступає з м'ячем?",options:["Аут","Пробіжка","Фол","Блок"],correctIndex:1,category:"rules",hpReward:15}
];

const backup = {
  backup_meta: {
    created_at: new Date().toISOString(),
    project: "basket-lviv LDBL",
    description: "Full system backup",
    git_log: "14ddc0a Fix standings button text color to white\naa70e7e Fix site-editor crash: strip large base64 images from SSR props\n7a327c4 Fix: make header tagline white\n0b1cc27 Add back button to chat page\n9d08215 Fix image upload: show errors, reset input, fix banner type handling, 1MB limit",
    git_remote: "origin https://golospravdy8-rgb@github.com/golospravdy8-rgb/Repository.git"
  },
  config_files: {
    package_json: readFile(path.join(base, 'package.json')),
    env: redactEnv(readFile(path.join(base, '.env'))),
    env_local: redactEnv(readFile(path.join(base, '.env.local'))),
    next_config: readFile(path.join(base, 'next.config.mjs')),
    tailwind_config: readFile(path.join(base, 'tailwind.config.ts')),
    tsconfig: readFile(path.join(base, 'tsconfig.json')),
    middleware: readFile(path.join(base, 'middleware.ts')),
    globals_css: readFile(path.join(base, 'app/globals.css'))
  },
  database: {
    schema_prisma: readFile(path.join(base, 'prisma/schema.prisma')),
    data: {
      seasons: dbData.seasons,
      teams: dbData.teams,
      games: dbData.games,
      players: dbData.players,
      standings: dbData.standings,
      news: dbData.news,
      settings: settingsClean,
      contacts: dbData.contacts,
      products: dbData.products,
      listings: dbData.listings,
      quizzes: quizData
    }
  },
  lib_files: {
    auth_ts: readFile(path.join(base, 'lib/auth.ts')),
    prisma_ts: readFile(path.join(base, 'lib/prisma.ts')),
    require_auth_ts: readFile(path.join(base, 'lib/require-auth.ts')),
    site_settings_ts: readFile(path.join(base, 'lib/site-settings.ts')),
    achievements_ts: readFile(path.join(base, 'lib/achievements.ts'))
  },
  api_routes: {
    "app/api/admin/login/route.ts": readFile(path.join(base, 'app/api/admin/login/route.ts')),
    "app/api/admin/logout/route.ts": readFile(path.join(base, 'app/api/admin/logout/route.ts')),
    "app/api/admin/test-email/route.ts": readFile(path.join(base, 'app/api/admin/test-email/route.ts')),
    "app/api/admin/apply-colors/route.ts": readFile(path.join(base, 'app/api/admin/apply-colors/route.ts')),
    "app/api/admin/standings/reset/route.ts": readFile(path.join(base, 'app/api/admin/standings/reset/route.ts')),
    "app/api/admin/standings/update/route.ts": readFile(path.join(base, 'app/api/admin/standings/update/route.ts')),
    "app/api/admin/stats/players/route.ts": readFile(path.join(base, 'app/api/admin/stats/players/route.ts')),
    "app/api/auth/login/route.ts": readFile(path.join(base, 'app/api/auth/login/route.ts')),
    "app/api/auth/[...nextauth]/route.ts": readFile(path.join(base, 'app/api/auth/[...nextauth]/route.ts')),
    "app/api/chat/route.ts": readFile(path.join(base, 'app/api/chat/route.ts')),
    "app/api/chat/messages/route.ts": readFile(path.join(base, 'app/api/chat/messages/route.ts')),
    "app/api/chat/upload/route.ts": readFile(path.join(base, 'app/api/chat/upload/route.ts')),
    "app/api/chat-proxy/route.ts": readFile(path.join(base, 'app/api/chat-proxy/route.ts')),
    "app/api/chat-widget/push/route.ts": readFile(path.join(base, 'app/api/chat-widget/push/route.ts')),
    "app/api/chat-widget/settings/route.ts": readFile(path.join(base, 'app/api/chat-widget/settings/route.ts')),
    "app/api/gallery/route.ts": readFile(path.join(base, 'app/api/gallery/route.ts')),
    "app/api/games/[id]/events/route.ts": readFile(path.join(base, 'app/api/games/[id]/events/route.ts')),
    "app/api/games/[id]/score/route.ts": readFile(path.join(base, 'app/api/games/[id]/score/route.ts')),
    "app/api/guest-contacts/route.ts": readFile(path.join(base, 'app/api/guest-contacts/route.ts')),
    "app/api/health/route.ts": readFile(path.join(base, 'app/api/health/route.ts')),
    "app/api/leaders/weekly/route.ts": readFile(path.join(base, 'app/api/leaders/weekly/route.ts')),
    "app/api/marketplace/auctions/route.ts": readFile(path.join(base, 'app/api/marketplace/auctions/route.ts')),
    "app/api/marketplace/bid/route.ts": readFile(path.join(base, 'app/api/marketplace/bid/route.ts')),
    "app/api/marketplace/listings/route.ts": readFile(path.join(base, 'app/api/marketplace/listings/route.ts')),
    "app/api/match-fact/route.ts": readFile(path.join(base, 'app/api/match-fact/route.ts')),
    "app/api/mvp-votes/route.ts": readFile(path.join(base, 'app/api/mvp-votes/route.ts')),
    "app/api/online/route.ts": readFile(path.join(base, 'app/api/online/route.ts')),
    "app/api/parents/me/route.ts": readFile(path.join(base, 'app/api/parents/me/route.ts')),
    "app/api/parents/register/route.ts": readFile(path.join(base, 'app/api/parents/register/route.ts')),
    "app/api/pdf/game/[gameId]/route.ts": readFile(path.join(base, 'app/api/pdf/game/[gameId]/route.ts')),
    "app/api/players/route.ts": readFile(path.join(base, 'app/api/players/route.ts')),
    "app/api/quizzes/answer/route.ts": readFile(path.join(base, 'app/api/quizzes/answer/route.ts')),
    "app/api/quizzes/daily/route.ts": readFile(path.join(base, 'app/api/quizzes/daily/route.ts')),
    "app/api/quizzes/migrate/route.ts": readFile(path.join(base, 'app/api/quizzes/migrate/route.ts')),
    "app/api/reviews/route.ts": {"status": "skipped_per_instructions"},
    "app/api/shop/orders/route.ts": readFile(path.join(base, 'app/api/shop/orders/route.ts')),
    "app/api/shop/products/route.ts": readFile(path.join(base, 'app/api/shop/products/route.ts')),
    "app/api/standings/route.ts": readFile(path.join(base, 'app/api/standings/route.ts')),
    "app/api/stream/status/route.ts": readFile(path.join(base, 'app/api/stream/status/route.ts')),
    "app/api/upload/route.ts": readFile(path.join(base, 'app/api/upload/route.ts')),
    "app/api/videos/route.ts": readFile(path.join(base, 'app/api/videos/route.ts'))
  },
  pages: {
    "/": readFile(path.join(base, 'app/(public)/page.tsx')),
    "/schedule": readFile(path.join(base, 'app/(public)/schedule/page.tsx')),
    "/standings": readFile(path.join(base, 'app/(public)/standings/page.tsx')),
    "/news": readFile(path.join(base, 'app/(public)/news/page.tsx')),
    "/news/[slug]": readFile(path.join(base, 'app/(public)/news/[slug]/page.tsx')),
    "/teams": readFile(path.join(base, 'app/(public)/teams/page.tsx')),
    "/players": readFile(path.join(base, 'app/(public)/players/page.tsx')),
    "/players/[id]": readFile(path.join(base, 'app/(public)/players/[id]/page.tsx')),
    "/leaders": readFile(path.join(base, 'app/(public)/leaders/page.tsx')),
    "/contacts": readFile(path.join(base, 'app/(public)/contacts/page.tsx')),
    "/media": readFile(path.join(base, 'app/(public)/media/page.tsx')),
    "/game/[id]": readFile(path.join(base, 'app/(public)/game/[id]/page.tsx')),
    "/gallery": readFile(path.join(base, 'app/(public)/gallery/page.tsx')),
    "/highlights": readFile(path.join(base, 'app/(public)/highlights/page.tsx')),
    "/quiz": readFile(path.join(base, 'app/(public)/quiz/page.tsx')),
    "/achievements": readFile(path.join(base, 'app/(public)/achievements/page.tsx')),
    "/vote": readFile(path.join(base, 'app/(public)/vote/page.tsx')),
    "/vip": readFile(path.join(base, 'app/(public)/vip/page.tsx')),
    "/partners": readFile(path.join(base, 'app/(public)/partners/page.tsx')),
    "/reviews": {"status": "skipped_per_instructions"},
    "layout": readFile(path.join(base, 'app/layout.tsx')),
    "(public)/layout": readFile(path.join(base, 'app/(public)/layout.tsx'))
  },
  components: {
    "Header": readFile(path.join(base, 'components/layout/Header.tsx')),
    "Footer": readFile(path.join(base, 'components/layout/Footer.tsx')),
    "HeaderWrapper": readFile(path.join(base, 'components/layout/HeaderWrapper.tsx')),
    "FooterWrapper": readFile(path.join(base, 'components/layout/FooterWrapper.tsx')),
    "FooterNav": readFile(path.join(base, 'components/layout/FooterNav.tsx')),
    "StandingsTable": readFile(path.join(base, 'components/public/StandingsTable.tsx')),
    "GameCard": readFile(path.join(base, 'components/public/GameCard.tsx')),
    "NewsCard": readFile(path.join(base, 'components/public/NewsCard.tsx')),
    "AdBanner": readFile(path.join(base, 'components/public/AdBanner.tsx')),
    "AuthButton": readFile(path.join(base, 'components/public/AuthButton.tsx')),
    "AuthModal": readFile(path.join(base, 'components/public/AuthModal.tsx')),
    "SponsorBanner": readFile(path.join(base, 'components/public/SponsorBanner.tsx')),
    "AdminButton": readFile(path.join(base, 'components/public/AdminButton.tsx')),
    "AgeGroupSwitcher": readFile(path.join(base, 'components/public/AgeGroupSwitcher.tsx')),
    "AgeGroupTabs": readFile(path.join(base, 'components/public/AgeGroupTabs.tsx')),
    "DonateButton": readFile(path.join(base, 'components/public/DonateButton.tsx')),
    "HeroButtons": readFile(path.join(base, 'components/public/HeroButtons.tsx')),
    "LeadersSection": readFile(path.join(base, 'components/public/LeadersSection.tsx')),
    "LiveStreamWidget": readFile(path.join(base, 'components/public/LiveStreamWidget.tsx')),
    "MarketplaceClient": readFile(path.join(base, 'components/public/MarketplaceClient.tsx')),
    "ShopClient": readFile(path.join(base, 'components/public/ShopClient.tsx')),
    "ChatModal": readFile(path.join(base, 'components/public/ChatModal.tsx')),
    "ChatPage": readFile(path.join(base, 'components/public/ChatPage.tsx')),
    "LiveScoreTracker": readFile(path.join(base, 'components/live-tracker/LiveScoreTracker.tsx')),
    "ActionButtons": readFile(path.join(base, 'components/live-tracker/ActionButtons.tsx')),
    "ActionLog": readFile(path.join(base, 'components/live-tracker/ActionLog.tsx')),
    "TeamRoster": readFile(path.join(base, 'components/live-tracker/TeamRoster.tsx')),
    "ScoreButtons": readFile(path.join(base, 'components/live-tracker/ScoreButtons.tsx')),
    "ui/badge": readFile(path.join(base, 'components/ui/badge.tsx')),
    "ui/button": readFile(path.join(base, 'components/ui/button.tsx')),
    "ui/card": readFile(path.join(base, 'components/ui/card.tsx')),
    "ui/dialog": readFile(path.join(base, 'components/ui/dialog.tsx')),
    "ui/input": readFile(path.join(base, 'components/ui/input.tsx')),
    "ui/select": readFile(path.join(base, 'components/ui/select.tsx')),
    "ui/table": readFile(path.join(base, 'components/ui/table.tsx')),
    "ui/tabs": readFile(path.join(base, 'components/ui/tabs.tsx'))
  },
  admin_pages: {
    "admin/layout": readFile(path.join(base, 'app/admin/layout.tsx')),
    "admin/login": readFile(path.join(base, 'app/admin/login/page.tsx')),
    "admin/dashboard": readFile(path.join(base, 'app/admin/dashboard/page.tsx')),
    "admin/site-editor": readFile(path.join(base, 'app/admin/site-editor/page.tsx')),
    "admin/games/[id]": readFile(path.join(base, 'app/admin/games/[id]/page.tsx')),
    "admin/site-editor/SiteEditorClient": readFile(path.join(base, 'app/admin/site-editor/SiteEditorClient.tsx')),
    "admin/site-editor/tabs/ColorsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/ColorsTab.tsx')),
    "admin/site-editor/tabs/FontsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/FontsTab.tsx')),
    "admin/site-editor/tabs/FooterTab": readFile(path.join(base, 'app/admin/site-editor/tabs/FooterTab.tsx')),
    "admin/site-editor/tabs/HeaderTab": readFile(path.join(base, 'app/admin/site-editor/tabs/HeaderTab.tsx')),
    "admin/site-editor/tabs/ImagesTab": readFile(path.join(base, 'app/admin/site-editor/tabs/ImagesTab.tsx')),
    "admin/site-editor/tabs/NavButtonsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/NavButtonsTab.tsx')),
    "admin/site-editor/tabs/NewsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/NewsTab.tsx')),
    "admin/site-editor/tabs/ScheduleTab": readFile(path.join(base, 'app/admin/site-editor/tabs/ScheduleTab.tsx')),
    "admin/site-editor/tabs/ShopTab": readFile(path.join(base, 'app/admin/site-editor/tabs/ShopTab.tsx')),
    "admin/site-editor/tabs/VideosTab": readFile(path.join(base, 'app/admin/site-editor/tabs/VideosTab.tsx')),
    "admin/site-editor/tabs/WidgetsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/WidgetsTab.tsx')),
    "admin/site-editor/tabs/TeamsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/TeamsTab.tsx')),
    "admin/site-editor/tabs/TextsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/TextsTab.tsx')),
    "admin/site-editor/tabs/ContactsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/ContactsTab.tsx')),
    "admin/site-editor/tabs/GalleryTab": readFile(path.join(base, 'app/admin/site-editor/tabs/GalleryTab.tsx')),
    "admin/site-editor/tabs/GuestContactsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/GuestContactsTab.tsx')),
    "admin/site-editor/tabs/StreamTab": readFile(path.join(base, 'app/admin/site-editor/tabs/StreamTab.tsx')),
    "admin/site-editor/tabs/ChatModeratorsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/ChatModeratorsTab.tsx')),
    "admin/site-editor/tabs/StandingsManageTab": readFile(path.join(base, 'app/admin/site-editor/tabs/StandingsManageTab.tsx')),
    "admin/site-editor/tabs/StatsTab": readFile(path.join(base, 'app/admin/site-editor/tabs/StatsTab.tsx'))
  },
  apps: {
    marketplace: {"status": "missing"},
    courses: {"status": "missing"},
    shop: {"status": "missing"},
    news: {"status": "missing"}
  },
  assets: {
    public_files: [
      "public/.gitkeep",
      "public/data/gallery.json",
      "public/data/highlights.json",
      "public/data/sponsors.json",
      "public/uploads/chat/chat-1774775837532.jpeg",
      "public/uploads/gallery-1-1774894094050.jpg",
      "public/uploads/gallery-1-1774894781452.jpg",
      "public/uploads/gallery-1-1774894807564.jpg",
      "public/uploads/gallery-1-1774894819034.jpg",
      "public/uploads/gallery-1-1774894827110.jpg",
      "public/uploads/gallery-1-1774894836925.jpg",
      "public/uploads/gallery-1-1774894844773.jpg",
      "public/uploads/gallery-1-1774894852239.jpg",
      "public/uploads/gallery-2-1774894049810.jpg",
      "public/uploads/gallery-3-1774894182462.jpg",
      "public/uploads/gallery-3-1774894689521.jpg",
      "public/uploads/marketplace/auction-1774966563807.jpeg",
      "public/uploads/marketplace/auction-1774967049777.jpeg",
      "public/uploads/marketplace/auction-1774971286829.jpeg",
      "public/uploads/marketplace/auction-1774979066805.jpeg",
      "public/uploads/marketplace/auction-1774979549363.jpeg",
      "public/uploads/marketplace/auction-1774979638747.jpeg",
      "public/uploads/marketplace/auction-1774980721664.jpeg",
      "public/uploads/news/news_1774866544285.jpg",
      "public/uploads/news/news_1774896588150.jpg",
      "public/uploads/player-photo-1774897444736.jpg",
      "public/uploads/player-photo-1774897535601.jpg",
      "public/uploads/player-photo-1774897552621.jpg",
      "public/uploads/player-photo-1774897579431.jpg",
      "public/uploads/player-photo-1774897591821.jpg",
      "public/uploads/team-logo-1774884402688.jpeg",
      "public/uploads/team-logo-1774884656142.jpeg",
      "public/uploads/team-logo-1774884689955.jpeg",
      "public/uploads/team-logo-1774884790063.jpeg",
      "public/uploads/team-logo-1774894979773.jpg",
      "public/uploads/team-logo-1774894992571.jpg",
      "public/uploads/team-logo-1774895029355.jpg",
      "public/uploads/team-logo-blackhawks.jpg",
      "public/uploads/team-logo-dream-team.jpg",
      "public/uploads/team-logo-dymchasti-leopardy.jpg",
      "public/uploads/team-logo-golden-eagles.jpg",
      "public/uploads/team-logo-indianski-leopardy.jpg",
      "public/uploads/team-logo-koaly.png",
      "public/uploads/team-logo-mighty-ducks.jpg",
      "public/uploads/team-logo-stepovi-bizony.jpg",
      "public/uploads/team-logo-street-kings.jpg",
      "public/uploads/team-logo-vedmedi.jpg",
      "public/uploads/team-logo-wildcats.jpg",
      "public/uploads/video-1774895755916.jpg",
      "public/uploads/video-1774895848955.mp4"
    ]
  },
  gamification: {
    spin_sectors: [
      {"label": "+5",  "hp": 5,  "color": "#334155"},
      {"label": "+10", "hp": 10, "color": "#1e3a5f"},
      {"label": "+5",  "hp": 5,  "color": "#334155"},
      {"label": "+15", "hp": 15, "color": "#1e4040"},
      {"label": "+10", "hp": 10, "color": "#1e3a5f"},
      {"label": "+50", "hp": 50, "color": "#7c2d12"},
      {"label": "+5",  "hp": 5,  "color": "#334155"},
      {"label": "+20", "hp": 20, "color": "#1e293b"},
      {"label": "+10", "hp": 10, "color": "#1e3a5f"},
      {"label": "+25", "hp": 25, "color": "#14532d"}
    ],
    hp_rules: {
      registration: 25,
      referral: 50,
      daily_message: 15,
      first_of_day: 25,
      quiz_correct: "10-20 depending on question",
      ambassador_threshold: 100,
      recruiter_threshold: 300,
      legend_threshold: 1000
    },
    badges_by_hp: {
      "0+": "",
      "25+": "🌱 Новачок",
      "50+": "⭐ Активний учасник",
      "100+": "🔥 Легенда ліги",
      "300+": "👑 Рекрутер",
      "1000+": "🏆 Амбасадор клубу"
    }
  },
  auth_system: {
    admin: {
      "table": "AdminUser",
      "endpoint": "/api/admin/login",
      "cookie": "admin_token=ldbl_admin_2025",
      "also_jwt": "next-auth.session-token (NextAuth)"
    },
    parent: {
      "table": "ParentSession",
      "endpoints": ["/api/parents/register", "/api/parents/me"],
      "storage": "localStorage:parent_token",
      "header": "Authorization: Bearer <token>"
    },
    chat_user: {
      "table": "GuestContact",
      "endpoint": "/api/chat action:register",
      "storage": "localStorage:ldbl_chat_user (JSON with phone, firstName, lastName, hp, isMod)"
    }
  },
  chat_system: {
    rooms: [
      {"id": "general", "name": "Балачка", "requires": null},
      {"id": "parents", "name": "Чат батьків", "requires": "role:parent or role:player"}
    ],
    sse_endpoint: "GET /api/chat",
    message_endpoint: "POST /api/chat action:message",
    online_endpoint: "/api/online",
    actions: ["register", "message", "react", "mvp_vote", "pin", "delete_message", "ban", "unban", "mute", "warn", "spin", "checkin"],
    mod_features: ["ban", "unban", "mute", "warn", "pin", "delete_message"],
    sticker_sources: [
      "MEME_STICKERS (github pavanpatil45/Classic-Meme-Stickers)",
      "CLASSIC_MEMES (local /stickers/classic/)",
      "PARROTS (cultofthepartyparrot.com)",
      "ANIMATED_EMOJIS (fonts.gstatic.com Noto)",
      "COOL_GIFS (local /stickers/cool/)",
      "CAT_GIFS (local /stickers/cat/)",
      "PEPE_GIFS (local /stickers/pepe/)"
    ]
  }
};

const json = JSON.stringify(backup, null, 2);
fs.writeFileSync(path.join(base, 'backup_full_system.json'), json, 'utf-8');
console.log('Backup written. Size:', json.length, 'chars,', Math.round(json.length/1024), 'KB');
