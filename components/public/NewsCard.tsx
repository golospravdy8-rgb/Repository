import Link from "next/link";
import type { News } from "@prisma/client";

export default function NewsCard({ news }: { news: News }) {
  const excerpt = news.content.replace(/<[^>]*>/g, "").substring(0, 200);

  return (
    <Link href={`/news/${news.slug || news.id}`} className="block group">
      <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden">
        {/* Original image: h-48 (192px) → ×0.75 = 144px */}
        {news.imageUrl ? (
          <div style={{ backgroundColor: "#f3f4f6", borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={news.imageUrl}
              alt={news.title}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center" style={{ backgroundColor: "#1a2744" }}>
            <span className="text-white/30 text-5xl font-black">БЛ</span>
          </div>
        )}
        <div className="p-4">
          <div className="text-xs text-gray-400 mb-2">
            {new Date(news.publishedAt).toLocaleDateString("uk-UA", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <h3 className="font-bold text-gray-800 group-hover:text-orange-500 transition-colors line-clamp-2">
            {news.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 mt-2">
            {excerpt}...
          </p>
        </div>
      </div>
    </Link>
  );
}
