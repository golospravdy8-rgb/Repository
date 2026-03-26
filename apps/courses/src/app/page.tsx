const COURSES = [
  { id: 1, title: "Баскетбол для початківців", age: "7-10 років", schedule: "Пн, Ср, Пт 10:00-11:30", coach: "Тренер Коваленко О.В.", price: "800 грн/міс", spots: 5, emoji: "🏀" },
  { id: 2, title: "Інтенсивне тренування", age: "11-14 років", schedule: "Вт, Чт 16:00-18:00", coach: "Тренер Петренко І.М.", price: "1000 грн/міс", spots: 3, emoji: "⚡" },
  { id: 3, title: "Підготовка до змагань", age: "12-16 років", schedule: "Пн-Пт 17:00-19:00", coach: "Тренер Бойко С.А.", price: "1500 грн/міс", spots: 2, emoji: "🏆" },
  { id: 4, title: "Вибіркові тренування", age: "Будь-який вік", schedule: "Субота 10:00-12:00", coach: "Тренер ЛДБЛ", price: "300 грн/зан.", spots: 8, emoji: "🎯" },
];

export default function CoursesPage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1e2a4a", marginBottom: "8px" }}>Баскетбольні курси ЛДБЛ</h1>
      <p style={{ color: "#6b7280", marginBottom: "32px" }}>Професійні тренування для дітей Львова від тренерів ліги</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
        {COURSES.map((course) => (
          <div key={course.id} style={{ backgroundColor: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
            <div style={{ height: "100px", backgroundColor: "#1e2a4a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>
              {course.emoji}
            </div>
            <div style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#1e2a4a", margin: "0 0 8px 0" }}>{course.title}</h3>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div>👶 Вік: {course.age}</div>
                <div>📅 {course.schedule}</div>
                <div>👨‍🏫 {course.coach}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "#f46f10" }}>{course.price}</span>
                <span style={{ fontSize: "12px", color: course.spots <= 3 ? "#ef4444" : "#059669", fontWeight: 600 }}>
                  {course.spots <= 3 ? `Залишилось ${course.spots} місця!` : `${course.spots} місць`}
                </span>
              </div>
              <a
                href="http://localhost:3006"
                style={{ display: "block", textAlign: "center", padding: "12px", backgroundColor: "#f46f10", color: "white", borderRadius: "10px", fontWeight: 700, textDecoration: "none", fontSize: "14px" }}
              >
                Записатись на курс
              </a>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "48px", backgroundColor: "#1e2a4a", borderRadius: "20px", padding: "32px", color: "white", textAlign: "center" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "12px" }}>Хочете більше інформації?</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "20px" }}>Зв&apos;яжіться з нами для консультації щодо вибору курсу</p>
        <a href="mailto:info@basket.lviv.ua" style={{ padding: "12px 32px", backgroundColor: "#f46f10", color: "white", borderRadius: "10px", fontWeight: 700, textDecoration: "none" }}>
          info@basket.lviv.ua
        </a>
      </div>
    </div>
  );
}
