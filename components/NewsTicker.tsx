"use client";

import { useState, useEffect } from "react";

interface NewsItem {
  id: string;
  title: string;
  imageUrl: string | null;
  link: string;
  date: string;
}

interface NewsTickerProps {
  className?: string;
  id?: string;
}

const TOTAL_PAGINATION_DOTS = 12; // Завжди 12 точок, навіть якщо новин менше

export default function NewsTicker({ className = "", id }: NewsTickerProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);

  // Загрузка новостей (максимум 12)
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/scrape-basket-news");
        const data = await res.json();

        if (data.news && Array.isArray(data.news) && data.news.length > 0) {
          // Ограничиваем до 12 новин максимум
          const limitedNews = data.news.slice(0, TOTAL_PAGINATION_DOTS);
          setNews(limitedNews);
          setError(null);
        } else {
          setError("Новості не знайдені");
          setNews([]);
        }
      } catch (err) {
        console.error("❌ Ошибка загрузки новостей:", err);
        setError("Ошибка загрузки новостей");
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Авторотация каждые 20 сек (циклирует по доступным новинам)
  useEffect(() => {
    if (!news.length) return;

    const fadeOutTimer = setTimeout(() => setFadeIn(false), 19000);
    const rotateTimer = setTimeout(() => {
      // Циклить по актуальному количеству новин, а не по 12
      setCurrentIndex((prev) => (prev + 1) % news.length);
      setFadeIn(true);
    }, 19500);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(rotateTimer);
    };
  }, [currentIndex, news.length]);

  // Placeholder состояние
  if (loading) {
    return (
      <div id={id} className={className}>
        <div style={styles.container}>
          <div style={styles.skeletonImage} />
          <div style={styles.skeletonText} />
        </div>
      </div>
    );
  }

  if (error || !news.length) {
    return (
      <div id={id} className={className}>
        <div style={styles.container}>
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📰</span>
            <p style={styles.emptyText}>Новости баскетбола обновляются...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentNews = news[currentIndex];
  const hasImage = currentNews.imageUrl && currentNews.imageUrl !== "null";

  // Debug: перевіряємо скільки новин і точок рендеримо
  if (typeof window !== "undefined") {
    console.log(
      `[NewsTicker] news.length=${news.length}, currentIndex=${currentIndex}, will render ${TOTAL_PAGINATION_DOTS} dots`
    );
  }

  return (
    <div id={id} className={className}>
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeSlideOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-4px);
          }
        }

        .news-ticker-card {
          animation: ${fadeIn ? "fadeSlideIn" : "fadeSlideOut"} 0.5s ease-in-out forwards;
        }
      `}</style>

      <div style={styles.container} className="news-ticker-card">
        {/* Изображение */}
        {hasImage && currentNews.imageUrl && (
          <div style={styles.imageWrapper}>
            <img
              src={currentNews.imageUrl || ""}
              alt={currentNews.title}
              style={styles.image}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Контент */}
        <div style={styles.content}>
          {/* Дата */}
          <div style={styles.date}>
            📅 {currentNews.date}
          </div>

          {/* Заголовок */}
          <h3 style={styles.title}>
            {currentNews.title}
          </h3>

          {/* Кнопка */}
          <a
            href={currentNews.link}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.button}
            onMouseOver={(e) => {
              const target = e.currentTarget as HTMLAnchorElement;
              target.style.background = "#f46f10";
            }}
            onMouseOut={(e) => {
              const target = e.currentTarget as HTMLAnchorElement;
              target.style.background = "#f97316";
            }}
          >
            Читати повністю →
          </a>
        </div>

        {/* Индикатор страниц (точно 12 точек, кликабельные) */}
        <div style={styles.pagination}>
          {Array.from({ length: TOTAL_PAGINATION_DOTS }).map((_, i) => {
            const isAvailable = i < news.length; // Есть ли новина для этой точки
            const isActive = i === currentIndex;

            return (
              <div
                key={i}
                onClick={() => {
                  if (isAvailable) {
                    setCurrentIndex(i);
                    setFadeIn(true);
                  } else if (news.length > 0) {
                    // Если новина не доступна, прыгаем на последнюю доступную
                    setCurrentIndex(news.length - 1);
                    setFadeIn(true);
                  }
                }}
                style={{
                  ...styles.paginationDot,
                  background: isActive ? "#f97316" : "rgba(255,255,255,0.2)",
                  transform: isActive ? "scale(1.3)" : "scale(1)",
                  opacity: isAvailable ? 1 : 0.4, // Приглушаем недоступные точки
                  cursor: isAvailable ? "pointer" : "default",
                  pointerEvents: isAvailable ? "auto" : "none",
                }}
                title={isAvailable ? `Новина ${i + 1}` : `Новина ${i + 1} (не доступна)`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Стили
const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#131f3a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    transition: "all 0.3s ease",
  },

  imageWrapper: {
    width: "100%",
    height: "160px",
    overflow: "hidden",
    background: "rgba(0,0,0,0.3)",
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
  },

  content: {
    padding: "14px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  date: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: 600,
  },

  title: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "white",
    lineHeight: "1.35",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  button: {
    marginTop: "6px",
    padding: "8px 12px",
    background: "#f97316",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 700,
    fontFamily: "Exo 2, sans-serif",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
    transition: "background 0.2s ease",
  },

  pagination: {
    display: "flex",
    flexWrap: "nowrap",
    gap: "4px",
    padding: "8px 14px",
    justifyContent: "center",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    width: "100%",
    overflow: "visible",
    minHeight: "14px", // Гарантуємо мінімальну висоту для 12 точок
  },

  paginationDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    cursor: "pointer",
    transition: "all 0.2s ease",
    flexShrink: 0, // Забезпечуємо, що точки НЕ стискаються
    minWidth: "6px",
    minHeight: "6px",
  },

  // Skeleton
  skeletonImage: {
    width: "100%",
    height: "160px",
    background: "linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 75%)",
    backgroundSize: "200% 100%",
    animation: "loading 1.5s infinite",
  },

  skeletonText: {
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    height: "100%",
    minHeight: "240px",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "8px",
  },

  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    textAlign: "center",
  },
};
