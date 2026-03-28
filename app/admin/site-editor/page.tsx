import { getAllSettings } from "@/lib/site-settings";
import { getTeams, getPlayers, getGames, getNews, getShopProducts } from "@/actions/admin-data";
import SiteEditorClient from "./SiteEditorClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Редактор сайту — Admin" };

export default async function SiteEditorPage() {
  const [allSettings, teams, players, games, news, shopProducts] = await Promise.all([
    getAllSettings(),
    getTeams(),
    getPlayers(),
    getGames(),
    getNews(),
    getShopProducts(),
  ]);

  // Strip large base64 image values from settings passed to client
  // to avoid exceeding Next.js serialization limit (~128KB)
  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(allSettings)) {
    if (value.startsWith("data:") && value.length > 10000) {
      settings[key] = "[base64]"; // placeholder — ImagesTab loads separately
    } else {
      settings[key] = value;
    }
  }

  return (
    <SiteEditorClient
      settings={settings}
      teams={teams}
      players={players}
      games={games}
      news={news}
      shopProducts={shopProducts}
    />
  );
}
