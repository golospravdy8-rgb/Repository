import type { Metadata } from "next"
import { AppHeader, AppFooter, getRemoteSiteSettings } from "@basket-lviv/ui"
import "@basket-lviv/ui/styles/globals.css"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Магазин — ЛДБЛ",
  description: "Офіційний магазин ЛДБЛ",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getRemoteSiteSettings()

  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppHeader currentApp="shop" settings={settings} />
        <main style={{ flex: 1 }}>{children}</main>
        <AppFooter settings={settings} />
      </body>
    </html>
  )
}
