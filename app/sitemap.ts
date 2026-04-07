import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://basketball.lviv.ua';
  const lastModified = new Date();

  // Основні сторінки (high priority)
  const mainPages = [
    { url: baseUrl, priority: 1.0, changefreq: 'daily' as const },
    { url: `${baseUrl}/standings`, priority: 0.9, changefreq: 'daily' as const },
    { url: `${baseUrl}/schedule`, priority: 0.9, changefreq: 'daily' as const },
    { url: `${baseUrl}/leaders`, priority: 0.8, changefreq: 'daily' as const },
    { url: `${baseUrl}/teams`, priority: 0.8, changefreq: 'weekly' as const },
    { url: `${baseUrl}/players`, priority: 0.8, changefreq: 'weekly' as const },
  ];

  // Публічні сторінки
  const publicPages = [
    { url: `${baseUrl}/news`, priority: 0.8, changefreq: 'daily' as const },
    { url: `${baseUrl}/achievements`, priority: 0.7, changefreq: 'weekly' as const },
    { url: `${baseUrl}/gallery`, priority: 0.7, changefreq: 'weekly' as const },
    { url: `${baseUrl}/highlights`, priority: 0.7, changefreq: 'weekly' as const },
    { url: `${baseUrl}/media`, priority: 0.7, changefreq: 'weekly' as const },
    { url: `${baseUrl}/chat`, priority: 0.6, changefreq: 'weekly' as const },
    { url: `${baseUrl}/courses`, priority: 0.6, changefreq: 'monthly' as const },
    { url: `${baseUrl}/shop`, priority: 0.6, changefreq: 'monthly' as const },
    { url: `${baseUrl}/marketplace`, priority: 0.6, changefreq: 'monthly' as const },
    { url: `${baseUrl}/vip`, priority: 0.7, changefreq: 'monthly' as const },
    { url: `${baseUrl}/vote`, priority: 0.5, changefreq: 'weekly' as const },
    { url: `${baseUrl}/quiz`, priority: 0.5, changefreq: 'monthly' as const },
    { url: `${baseUrl}/reviews`, priority: 0.5, changefreq: 'monthly' as const },
    { url: `${baseUrl}/partners`, priority: 0.5, changefreq: 'monthly' as const },
    { url: `${baseUrl}/register-team`, priority: 0.7, changefreq: 'monthly' as const },
    { url: `${baseUrl}/contacts`, priority: 0.6, changefreq: 'monthly' as const },
  ];

  // Альтернативні URL (Cyrillic версіï)
  const cyrillicPages = [
    { url: `${baseUrl}/новини`, priority: 0.7, changefreq: 'daily' as const },
    { url: `${baseUrl}/розклад`, priority: 0.8, changefreq: 'daily' as const },
    { url: `${baseUrl}/команди`, priority: 0.7, changefreq: 'weekly' as const },
    { url: `${baseUrl}/гравці`, priority: 0.7, changefreq: 'weekly' as const },
    { url: `${baseUrl}/змагання`, priority: 0.6, changefreq: 'weekly' as const },
    { url: `${baseUrl}/відгуки`, priority: 0.5, changefreq: 'monthly' as const },
    { url: `${baseUrl}/контакти`, priority: 0.6, changefreq: 'monthly' as const },
  ];

  // Комбінуємо всі сторінки з lastModified
  const allPages = [...mainPages, ...publicPages, ...cyrillicPages].map(page => ({
    url: page.url,
    lastModified,
    changeFrequency: page.changefreq,
    priority: page.priority,
  }));

  return allPages;
}