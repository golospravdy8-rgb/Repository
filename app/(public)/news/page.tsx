import { prisma } from "@/lib/prisma";
import NewsCard from "@/components/public/NewsCard";

export const metadata = { title: "Новини — ДБЛ" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await prisma.news.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-6" style={{ color: "var(--color-heading)" }}>Новини</h1>
      {news.length === 0 ? (
        <p className="text-gray-500">Новин поки немає.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((n) => (
            <NewsCard key={n.id} news={n} />
          ))}
        </div>
      )}
    </div>
  );
}
