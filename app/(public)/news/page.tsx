import { prisma } from "@/lib/prisma";
import NewsCard from "@/components/public/NewsCard";

export const metadata = { title: "Новини — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await prisma.news.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Новини
      </h1>
      <p className="text-gray-500 mb-8 text-sm">Останні новини ліги ESCULAB</p>

      {news.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          Новини скоро з&apos;являться
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      )}
    </div>
  );
}
