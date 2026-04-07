import FooterNav from "./FooterNav";

interface FooterProps {
  siteName: string;
  logoText: string;
  logoUrl: string;
  about: string;
  copyright: string;
  address: string;
  email: string;
  website: string;
  // Соцмережі
  facebook?: string;
  instagram?: string;
  telegram?: string;
  youtube?: string;
  navyColor: string;
  orangeColor: string;
  textColor: string;
  linkColor?: string;
  copyrightColor?: string;
  col1Visible: boolean;
  col2Visible: boolean;
  col3Visible: boolean;
  footerBg: string;
}

export default function Footer({
  siteName,
  logoText,
  logoUrl,
  about,
  copyright,
  address,
  email,
  website,
  facebook,
  instagram,
  telegram,
  youtube,
  navyColor,
  orangeColor,
  textColor,
  linkColor,
  copyrightColor,
  col1Visible,
  col2Visible,
  col3Visible,
  footerBg,
}: FooterProps) {
  const resolvedLinkColor = linkColor || orangeColor;
  const hasSocial = facebook || instagram || telegram || youtube;

  return (
    <footer
      style={{
        backgroundColor: navyColor,
        ...(footerBg ? { backgroundImage: `url(${footerBg})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}
      className="relative mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {col1Visible && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={siteName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: orangeColor }}
                  >
                    {logoText}
                  </div>
                )}
                <span className="font-bold text-white">{siteName}</span>
              </div>
              <p className="text-sm" style={{ color: textColor }}>
                {about}
              </p>

              {/* Соцмережі - Цветные круглые кнопки */}
              {hasSocial && (
                <div className="flex gap-3 mt-4 flex-wrap">
                  {facebook && (
                    <a
                      href={facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Facebook"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: "#1877f2" }}
                    >
                      f
                    </a>
                  )}
                  {instagram && (
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                    >
                      in
                    </a>
                  )}
                  {telegram && (
                    <a
                      href={telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Telegram"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: "#0088cc" }}
                    >
                      tg
                    </a>
                  )}
                  {youtube && (
                    <a
                      href={youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="YouTube"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: "#ff0000" }}
                    >
                      yt
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {col2Visible && (
            <div>
              <h3 className="font-semibold text-white mb-3">Навігація</h3>
              <FooterNav textColor={textColor} />
            </div>
          )}

          {col3Visible && (
            <div>
              <h3 className="font-semibold text-white mb-3">Контакти</h3>
              <ul className="space-y-1.5 text-sm" style={{ color: textColor }}>
                {address && <li>📍 {address}</li>}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} style={{ color: resolvedLinkColor }} className="hover:opacity-80">
                      📧 {email}
                    </a>
                  </li>
                )}
                {website && (
                  <li>
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: resolvedLinkColor }}
                      className="hover:opacity-80"
                    >
                      🌐 {website}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs" style={{ color: copyrightColor || textColor }}>
          © {new Date().getFullYear()} {copyright}
        </div>
      </div>

    </footer>
  );
}
