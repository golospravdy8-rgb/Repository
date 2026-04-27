import { getSettings } from "@/lib/site-settings";

export default async function AdBanner({ slot }: { slot: "top" | "bottom" }) {
  const keys = [`banner.${slot}.img`, `banner.${slot}.url`, `banner.${slot}.active`];
  const s = await getSettings(keys);

  const img = s[`banner.${slot}.img`] || "";
  const url = s[`banner.${slot}.url`] || "";
  const active = s[`banner.${slot}.active`] !== "false";

  if (!active || !img) {
    return null;
  }

  const imgEl = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt="Реклама"
      style={{ width: "100%", maxWidth: "728px", borderRadius: "8px", display: "block", margin: "0 auto" }}
    />
  );

  return (
    <div style={{ padding: "10px 16px", backgroundColor: "#f8fafc" }}>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
          {imgEl}
        </a>
      ) : imgEl}
    </div>
  );
}
