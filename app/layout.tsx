import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Федерація Баскетболу Львова",
  description: "Матчі, турнірні таблиці, статистика та актуальні новини дитячого баскетболу Львова.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Play:wght@400;700&family=Exo+2:wght@400;600;700;800&family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;600;700;800&family=Raleway:wght@400;600;700;800&family=Rubik:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&family=Ubuntu:wght@400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
