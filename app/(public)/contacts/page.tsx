import { getSettings } from "@/lib/site-settings";

export const metadata = { title: "Контакти — Ліга ESCULAB" };
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const settings = await getSettings([
    "contacts.title",
    "contacts.subtitle",
    "contacts.address",
    "contacts.email",
    "contacts.website",
    "contacts.facebook",
    "contacts.instagram",
    "contacts.youtube",
  ]);

  const title = settings["contacts.title"] || "Баскетбол у Львові — Ліга ESCULAB";
  const subtitle = settings["contacts.subtitle"] || "Офіційна баскетбольна ліга міста Львова";
  const address = settings["contacts.address"] || "м. Львів, вул. Спортивна";
  const email = settings["contacts.email"] || "info@basket.lviv.ua";
  const website = settings["contacts.website"] || "basket.lviv.ua";
  const facebook = settings["contacts.facebook"] || "";
  const instagram = settings["contacts.instagram"] || "";
  const youtube = settings["contacts.youtube"] || "";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <h1 className="text-base font-black mb-1" style={{ color: "var(--color-heading)" }}>
        Контакти
      </h1>

      <div className="bg-white rounded-xl shadow px-6 py-4 space-y-3">
        <div>
          <h2 className="text-base font-bold mb-0.5" style={{ color: "var(--color-heading)" }}>{title}</h2>
          <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>

        <div className="space-y-2 text-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">📍</span>
            <div>
              <div className="font-semibold text-sm">Адреса</div>
              <div className="text-gray-500 text-sm">{address}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">📧</span>
            <div>
              <div className="font-semibold text-sm">Email</div>
              <a href={`mailto:${email}`} className="text-orange-500 hover:text-orange-600 text-sm">
                {email}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">🌐</span>
            <div>
              <div className="font-semibold text-sm">Сайт</div>
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                className="text-orange-500 hover:text-orange-600 text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                {website}
              </a>
            </div>
          </div>
        </div>

        {(facebook || instagram || youtube) && (
          <div className="border-t pt-3">
            <div className="font-semibold text-sm mb-2 text-gray-700">Соціальні мережі</div>
            <div className="flex gap-2 flex-wrap">
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1877f2" }}
                >
                  Facebook
                </a>
              )}
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                >
                  Instagram
                </a>
              )}
              {youtube && (
                <a
                  href={youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#ff0000" }}
                >
                  YouTube
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
