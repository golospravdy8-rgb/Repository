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
  navyColor: string;
  orangeColor: string;
  textColor: string;
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
  navyColor,
  orangeColor,
  textColor,
  col1Visible,
  col2Visible,
  col3Visible,
  footerBg,
}: FooterProps) {
  return (
    <footer
      style={footerBg
        ? { backgroundImage: `url(${footerBg})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { backgroundColor: navyColor }}
      className="mt-auto"
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
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
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
                {address && <li>{address}</li>}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} style={{ color: textColor }}>
                      {email}
                    </a>
                  </li>
                )}
                {website && (
                  <li style={{ color: textColor }}>{website}</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs" style={{ color: textColor }}>
          © {new Date().getFullYear()} {copyright}
        </div>
      </div>
    </footer>
  );
}
