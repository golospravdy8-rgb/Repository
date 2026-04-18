import Link from "next/link";
import AdminLogoutButton from "./AdminLogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: "100%", width: "100%", overflowX: "hidden" }}>
      {/* Admin header */}
      <header style={{ backgroundColor: "#1a2744" }} className="text-white shadow-lg">
        <div style={{ maxWidth: "100%", width: "100%", paddingLeft: 16, paddingRight: 16, boxSizing: "border-box", margin: "0 auto" }}>
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/admin/dashboard" className="font-bold text-sm tracking-wide">
                ДБЛ ADMIN
              </Link>
              <nav className="flex items-center gap-1">
                <Link
                  href="/admin/dashboard"
                  className="px-3 py-1.5 rounded text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Дашборд
                </Link>
                <Link
                  href="/admin/site-editor"
                  className="px-3 py-1.5 rounded text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Редактор сайту
                </Link>
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Сайт
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <AdminLogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: 0, margin: 0, flex: 1, maxWidth: "100%", width: "100%", overflowX: "hidden", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
