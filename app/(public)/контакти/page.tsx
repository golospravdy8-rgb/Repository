export const metadata = { title: "Контакти — Ліга ESCULAB" };

export default function ContactsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-xl font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Контакти
      </h1>

      <div className="bg-white rounded-xl shadow p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-heading)" }}>
            Баскетбол у Львові — Ліга ESCULAB
          </h2>
          <p className="text-gray-500">Офіційна баскетбольна ліга міста Львова</p>
        </div>

        <div className="space-y-4 text-gray-700">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📍</span>
            <div>
              <div className="font-semibold">Адреса</div>
              <div className="text-gray-500">м. Львів, вул. Спортивна</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📧</span>
            <div>
              <div className="font-semibold">Email</div>
              <a
                href="mailto:info@basket.lviv.ua"
                className="text-orange-500 hover:text-orange-600"
              >
                info@basket.lviv.ua
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">🌐</span>
            <div>
              <div className="font-semibold">Сайт</div>
              <a
                href="https://basket.lviv.ua"
                className="text-orange-500 hover:text-orange-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                basket.lviv.ua
              </a>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="font-semibold mb-3 text-gray-700">Соціальні мережі</div>
          <div className="flex gap-3">
            <a
              href="#"
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1877f2" }}
            >
              Facebook
            </a>
            <a
              href="#"
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
            >
              Instagram
            </a>
            <a
              href="#"
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#ff0000" }}
            >
              YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
