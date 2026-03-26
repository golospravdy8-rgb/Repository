import sponsorsData from "@/lib/sponsors.data.json";

interface SponsorBannerProps {
  position: "hero" | "page-top" | "sidebar" | "footer";
  pageType?: string;
}

export default function SponsorBanner({ position, pageType = "main" }: SponsorBannerProps) {
  const sponsors = sponsorsData.sponsors.filter(
    (s) =>
      s.active &&
      s.positions.includes(position) &&
      (s.pages.includes("all") || s.pages.includes(pageType))
  );

  const sizeMap = {
    hero: { width: "100%", maxWidth: "728px", height: "90px" },
    "page-top": { width: "100%", maxWidth: "728px", height: "90px" },
    sidebar: { width: "300px", height: "250px" },
    footer: { width: "100%", maxWidth: "468px", height: "60px" },
  };

  const size = sizeMap[position];

  if (!sponsors.length) {
    return (
      <div
        style={{
          ...size,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #f46f10",
          borderRadius: "8px",
          backgroundColor: "rgba(244,111,16,0.04)",
          padding: "8px 16px",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", color: "#f46f10", fontWeight: 600 }}>
          📢 Місце для реклами · Стати партнером ЛДБЛ →
        </span>
        <a
          href="mailto:info@basket.lviv.ua"
          style={{ fontSize: "13px", color: "#f46f10", textDecoration: "underline", fontWeight: 700 }}
        >
          info@basket.lviv.ua
        </a>
      </div>
    );
  }

  const sponsor = sponsors[0];

  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...size,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        backgroundColor: "white",
        padding: "8px 16px",
        gap: "12px",
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {sponsor.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sponsor.logo} alt={sponsor.name} style={{ height: "40px", objectFit: "contain" }} />
      ) : (
        <div
          style={{
            width: "40px", height: "40px", borderRadius: "50%",
            backgroundColor: "#1e2a4a", display: "flex", alignItems: "center",
            justifyContent: "center", color: "white", fontWeight: 900, fontSize: "16px",
          }}
        >
          {sponsor.name[0]}
        </div>
      )}
      <div>
        <div style={{ fontWeight: 700, color: "#1e2a4a", fontSize: "14px" }}>{sponsor.name}</div>
        {sponsor.slogan && <div style={{ fontSize: "12px", color: "#6b7280" }}>{sponsor.slogan}</div>}
      </div>
    </a>
  );
}
