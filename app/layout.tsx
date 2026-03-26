import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ліга ESCULAB — Баскетбол Львів",
  description: "Офіційний сайт баскетбольної ліги ESCULAB у Львові. Розклад матчів, таблиця, лідери сезону.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
