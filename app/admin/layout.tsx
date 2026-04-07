import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    console.log("[admin/layout] Checking auth at layout level...");
    await requireAuth();
    console.log("[admin/layout] Auth OK");
  } catch (err) {
    console.error("[admin/layout] Auth failed, error.tsx will handle it");
    throw err;
  }

  return <>{children}</>;
}
