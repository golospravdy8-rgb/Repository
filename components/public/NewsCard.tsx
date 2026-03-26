import Link from "next/link";
import type { News } from "@prisma/client";
import Image from "next/image";

export default function NewsCard({ news }: { news: News }) {
  const excerpt = news.content.replace(/<[^>]*>/g, "").substring(0, 200);

  return (
    <Link href={`/news/${news.slug}`} className="block group">
      <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden">
        {news.imageUrl ? (
          <div className="relative h-48 bg-gray-100">
            <Image
              src={news.imageUrl}
              alt={news.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center" style={{ backgroundColor: "#1a2744" }}>
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
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            {excerpt}...
          </p>
        </div>
      </div>
    </Link>
  );
}
