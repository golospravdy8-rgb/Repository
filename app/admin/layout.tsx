import Link from "next/link";
import AdminLogoutButton from "./AdminLogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f1f5f9", zoom: 0.75, height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Admin header */}
      <header style={{ backgroundColor: "#1a2744" }} className="text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <main className="w-full flex-1" style={{ padding: 0, margin: 0, height: "100%", overflow: "hidden" }}>
        {children}
      </main>
    </div>
  );
}
