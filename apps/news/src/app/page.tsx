const ARTICLES = [
  { id: 1, title: "Відкриття сезону 2025-2026 ЛДБЛ", slug: "vidkryttia-sezonu", excerpt: "Ліга офіційно розпочала новий сезон 2025-2026. Цього року в змаганнях беруть участь 8 команд з Львівщини.", date: "2026-03-21", category: "Новини", image: null },
  { id: 2, title: "Школа №30 відкрила сезон двома перемогами", slug: "shkola30-peremohy", excerpt: "Команда вийшла в лідери таблиці після двох перемог поспіль.", date: "2026-03-21", category: "Результати", image: null },
  { id: 3, title: "Розклад матчів другого туру", slug: "rozklad-druhoho-turu", excerpt: "Оприлюднено розклад матчів другого туру ЛДБЛ. Всі ігри на Спортивному комплексі.", date: "2026-03-21", category: "Розклад", image: null },
  { id: 4, title: "Індійські леопарди показують найкращий баскетбол", slug: "indiyski-leopardy", excerpt: "Команда Школи №81 здобула три перемоги і займає 2-е місце в таблиці.", date: "2026-03-22", category: "Новини", image: null },
  { id: 5, title: "Голосування 'Гравець тижня' розпочато", slug: "vote-started", excerpt: "На сайті ЛДБЛ відкрито тижневе голосування за найкращого гравця. Голосуйте!", date: "2026-03-22", category: "Анонс", image: null },
  { id: 6, title: "Реєстрація команд на сезон 2025-2026", slug: "rejestratsiya-komand", excerpt: "Відкрито реєстрацію команд на наступний сезон. Реєстраційний внесок — 500 грн.", date: "2026-03-22", category: "Анонс", image: null },
  { id: 7, title: "VIP-кабінет для батьків — нова функція", slug: "vip-kabinet", excerpt: "Тепер батьки можуть отримати доступ до розширеної статистики своєї дитини.", date: "2026-03-22", category: "Новини", image: null },
  { id: 8, title: "Фотогалерея першого туру доступна", slug: "foto-pershyy-tur", excerpt: "Фотографії з матчів першого туру опубліковані в галереї сайту.", date: "2026-03-22", category: "Галерея", image: null },
  { id: 9, title: "Барси Школи №30 vs КІВС Львів — хайлайти", slug: "bary-kivs-highligh", excerpt: "Відеохайлайти найцікавішого матчу третього туру вже доступні на сайті.", date: "2026-03-22", category: "Відео", image: null },
  { id: 10, title: "ЛДБЛ шукає партнерів для сезону 2025-2026", slug: "poshuk-partneriv", excerpt: "Ліга пропонує вигідні умови партнерства. Логотип скрізь на сайті!", date: "2026-03-22", category: "Анонс", image: null },
];

const CAT_COLORS: Record<string, string> = {
  "Новини": "#f46f10",
  "Результати": "#059669",
  "Розклад": "#4a90d9",
  "Анонс": "#7c3aed",
  "Галерея": "#d97706",
  "Відео": "#dc2626",
};

export default function NewsPage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1e2a4a", marginBottom: "8px" }}>Новини ЛДБЛ</h1>
      <p style={{ color: "#6b7280", marginBottom: "32px" }}>Останні новини Львівської Дитячої Баскетбольної Ліги</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {ARTICLES.map((article) => (
          <article key={article.id} style={{ backgroundColor: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <div style={{ height: "120px", backgroundColor: "#1e2a4a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "36px" }}>📰</span>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", color: "white",
                  backgroundColor: CAT_COLORS[article.category] || "#6b7280"
                }}>
                  {article.category}
                </span>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>{new Date(article.date).toLocaleDateString("uk-UA")}</span>
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#1e2a4a", margin: "0 0 8px", lineHeight: "1.3" }}>{article.title}</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px", lineHeight: "1.5" }}>{article.excerpt}</p>
              <a
                href={`http://localhost:3006/news/${article.slug}`}
                style={{ fontSize: "13px", fontWeight: 700, color: "#f46f10", textDecoration: "none" }}
              >
                Читати повністю →
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
