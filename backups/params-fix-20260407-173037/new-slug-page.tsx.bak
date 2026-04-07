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
  const news = await prisma.news.findUnique({ where: { slug: params.slug } });
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
  });

  if (!news) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <Link
        href="/новини"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-6"
      >
        ← Всі новини
      </Link>

      {/* Cover image */}
      {news.imageUrl && (
        <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden mb-6">
          <Image
            src={news.imageUrl}
            alt={news.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mb-3">
        {news.category && (
          <span
            className="text-xs font-bold px-3 py-1 rounded-full text-white"
            style={{ backgroundColor: "#f97316" }}
          >
            {news.category}
          </span>
        )}
        <span className="text-sm text-gray-400">
          {new Date(news.publishedAt).toLocaleDateString("uk-UA", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Title */}
      <h1
        className="text-3xl sm:text-4xl font-black mb-6 leading-tight"
        style={{ color: "var(--color-heading)" }}
      >
        {news.title}
      </h1>

      {/* Content */}
      <div
        className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: news.content }}
      />
    </div>
  );
}
