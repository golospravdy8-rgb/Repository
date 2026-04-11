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

export default function NewsTicker({ className = "", id }: NewsTickerProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);

  // Загрузка новостей
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/scrape-basket-news");
        const data = await res.json();

        if (data.news && Array.isArray(data.news) && data.news.length > 0) {
          setNews(data.news);
          setError(null);
        } else {
          setError("Новости не найдены");
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

  // Авторотация каждые 20 сек
  useEffect(() => {
    if (!news.length) return;

    const fadeOutTimer = setTimeout(() => setFadeIn(false), 19000);
    const rotateTimer = setTimeout(() => {
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

        {/* Индикатор страниц */}
        <div style={styles.pagination}>
          {news.map((_, i) => (
            <div
              key={i}
              onClick={() => {
                setCurrentIndex(i);
                setFadeIn(true);
              }}
              style={{
                ...styles.paginationDot,
                background: i === currentIndex ? "#f97316" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
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
    gap: "4px",
    padding: "8px 14px",
    justifyContent: "center",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },

  paginationDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    cursor: "pointer",
    transition: "all 0.2s ease",
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
