import { getAllSettings } from "@/lib/site-settings";
import { getTeams, getPlayers, getGames, getNews, getShopProducts } from "@/actions/admin-data";
import SiteEditorClient from "./SiteEditorClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Редактор сайту — Admin" };

export default async function SiteEditorPage() {
  const [settings, teams, players, games, news, shopProducts] = await Promise.all([
    getAllSettings(),
    getTeams(),
    getPlayers(),
    getGames(),
    getNews(),
    getShopProducts(),
  ]);

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
