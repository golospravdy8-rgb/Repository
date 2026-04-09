"use client";

import { useState, useRef } from "react";
import TextsTab from "./tabs/TextsTab";
import ColorsTab from "./tabs/ColorsTab";
import ImagesTab from "./tabs/ImagesTab";
import HeaderTab from "./tabs/HeaderTab";
import FooterTab from "./tabs/FooterTab";
import WidgetsTab from "./tabs/WidgetsTab";
import TeamsTab from "./tabs/TeamsTab";
import ScheduleTab from "./tabs/ScheduleTab";
import NewsTab from "./tabs/NewsTab";
import FontsTab from "./tabs/FontsTab";
import NavButtonsTab from "./tabs/NavButtonsTab";
import GalleryTab from "./tabs/GalleryTab";
import ContactsTab from "./tabs/ContactsTab";
import GuestContactsTab from "./tabs/GuestContactsTab";
import StreamTab from "./tabs/StreamTab";
import ShopTab from "./tabs/ShopTab";
import ChatModeratorsTab from "./tabs/ChatModeratorsTab";
import StatsTab from "./tabs/StatsTab";
import StandingsManageTab from "./tabs/StandingsManageTab";
import ReviewsTab from "./tabs/ReviewsTab";

const TABS = [
  { id: "teams", label: "Команди та гравці" },
  { id: "schedule", label: "Розклад ігор" },
  { id: "news", label: "Новини" },
  { id: "texts", label: "Тексти" },
  { id: "colors", label: "Кольори" },
  { id: "fonts", label: "Шрифти" },
  { id: "images", label: "Фон та зображення" },
  { id: "gallery", label: "Медіа / Галерея" },
  { id: "header", label: "Хедер / Навбар" },
  { id: "nav", label: "Навігація" },
  { id: "footer", label: "Футер" },
  { id: "widgets", label: "Віджети головної" },
  { id: "contacts", label: "Контакти" },
  { id: "guest-contacts", label: "Контакти гостей" },
  { id: "stream", label: "🔴 Трансляція" },
  { id: "shop", label: "🛒 Магазин" },
  { id: "chat-mods", label: "🛡 Модератори чату" },
  { id: "stats", label: "📊 Статистика" },
  { id: "standings-manage", label: "🏆 Таблиця змагань" },
  { id: "reviews", label: "💬 Відгуки" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export interface SaveHandle {
  save: () => void;
}

export type TeamRow = { id: number; name: string; shortName: string; logoUrl: string | null; ageGroup: string; _count: { players: number } };
export type PlayerRow = { id: number; firstName: string; lastName: string; number: number; position: string | null; photoUrl: string | null; teamId: number; team: { name: string; shortName: string } };
export type GameRow = { id: number; homeTeamId: number; awayTeamId: number; scheduledAt: Date; status: string; homeScore: number; awayScore: number; homeTeam: { id: number; name: string; shortName: string; logoUrl: string | null; seasonId: number }; awayTeam: { id: number; name: string; shortName: string; logoUrl: string | null; seasonId: number } };
export type NewsRow = { id: number; title: string; slug: string; content: string; category: string | null; isPublished: boolean; publishedAt: Date; imageUrl: string | null };
export type ShopProductRow = { id: number; name: string; description: string; price: number; oldPrice: number | null; category: string; emoji: string; badge: string | null; imageUrl: string | null; sizes: string | null; inStock: boolean; sortOrder: number; showInChat: boolean; chatPriority: boolean };

export default function SiteEditorClient({
  settings,
  teams,
  players,
  games,
  news,
  shopProducts,
}: {
  settings: Record<string, string>;
  teams: TeamRow[];
  players: PlayerRow[];
  games: GameRow[];
  news: NewsRow[];
  shopProducts: ShopProductRow[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("teams");
  const [saved, setSaved] = useState(false);
  const saveRef = useRef<SaveHandle>(null);

  const isDataTab = activeTab === "teams" || activeTab === "schedule" || activeTab === "news" || activeTab === "gallery" || activeTab === "guest-contacts" || activeTab === "shop" || activeTab === "chat-mods" || activeTab === "stats" || activeTab === "standings-manage" || activeTab === "reviews";

  const handleGlobalSave = () => {
    if (isDataTab) return;
    saveRef.current?.save();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1a2744" }}>
            Редактор сайту
          </h1>
          <p className="text-gray-500 text-sm mt-1">Керування контентом та зовнішнім виглядом</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
          {!isDataTab && (
            <button
              onClick={handleGlobalSave}
              className="px-6 py-2.5 rounded-lg font-bold text-white text-sm shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1a2744" }}
            >
              Зберегти
            </button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "teams" && <TeamsTab teams={teams} players={players} />}
          {activeTab === "schedule" && <ScheduleTab games={games} teams={teams} />}
          {activeTab === "news" && <NewsTab news={news} />}
          {activeTab === "texts" && <TextsTab ref={saveRef} settings={settings} />}
          {activeTab === "colors" && <ColorsTab ref={saveRef} settings={settings} />}
          {activeTab === "fonts" && <FontsTab ref={saveRef} settings={settings} />}
          {activeTab === "images" && <ImagesTab settings={settings} />}
          {activeTab === "gallery" && <GalleryTab games={games} />}
          {activeTab === "header" && <HeaderTab ref={saveRef} settings={settings} />}
          {activeTab === "nav" && <NavButtonsTab ref={saveRef} settings={settings} />}
          {activeTab === "footer" && <FooterTab ref={saveRef} settings={settings} />}
          {activeTab === "widgets" && <WidgetsTab ref={saveRef} settings={settings} />}
          {activeTab === "contacts" && <ContactsTab ref={saveRef} settings={settings} />}
          {activeTab === "guest-contacts" && <GuestContactsTab />}
          {activeTab === "stream" && <StreamTab settings={settings} />}
          {activeTab === "shop" && <ShopTab products={shopProducts} settings={settings} />}
          {activeTab === "chat-mods" && <ChatModeratorsTab settings={settings} shopProducts={shopProducts} />}
          {activeTab === "stats" && <StatsTab />}
          {activeTab === "standings-manage" && <StandingsManageTab />}
          {activeTab === "reviews" && <ReviewsTab />}
        </div>
      </div>
    </div>
  );
}
