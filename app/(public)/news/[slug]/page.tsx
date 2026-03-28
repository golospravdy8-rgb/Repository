import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const news = await prisma.news.findUnique({ where: { slug: params.slug } }).catch(() => null);
  if (!news) return { title: "Новину не знайдено" };
  return { title: `${news.title} — Ліга ESCULAB` };
}

export default async function NewsSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const news = await prisma.news.findUnique({
    where: { slug: params.slug, isPublished: true },
  }).catch(() => null);

  if (!news) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/news"
        className="inline-flex items-center gap-1 text-sm font-medium mb-6 transition-colors"
        style={{ color: "var(--color-accent)" }}
      >
        ← Всі новини
      </Link>

      {/* Hero block — image with overlay title */}
      <div className="relative w-full rounded-xl overflow-hidden mb-0" style={{ minHeight: "280px" }}>
        {news.imageUrl ? (
          <>
            <div className="relative w-full" style={{ height: "340px" }}>
              <Image
                src={news.imageUrl}
                alt={news.title}
                fill
                className="object-cover"
                priority
              />
            </div>
            {/* Dark overlay title at bottom of image */}
            <div className="absolute bottom-0 left-0 right-0 px-5 py-4"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)" }}
            >
              <h1 className="text-white font-black text-2xl sm:text-3xl leading-tight drop-shadow">
                {news.title}
              </h1>
            </div>
          </>
        ) : (
          /* No image — dark hero with title */
          <div
            className="flex items-end px-5 py-6"
            style={{ backgroundColor: "#1a2744", minHeight: "160px" }}
          >
            <h1 className="text-white font-black text-2xl sm:text-3xl leading-tight">
              {news.title}
            </h1>
          </div>
        )}
      </div>

      {/* Date + category */}
      <div className="flex items-center gap-3 mt-3 mb-5">
        <span className="text-sm text-gray-400">
          {new Date(news.publishedAt).toLocaleDateString("uk-UA", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        {news.category && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: "#f97316" }}
          >
            {news.category}
          </span>
        )}
      </div>

      {/* Article content */}
      <div
        className="bg-white rounded-xl shadow px-6 py-6 prose prose-base max-w-none text-gray-700 leading-relaxed
          prose-a:text-orange-500 prose-headings:text-[#1a2744] prose-strong:text-gray-800"
        dangerouslySetInnerHTML={{ __html: news.content }}
      />
    </div>
  );
}
