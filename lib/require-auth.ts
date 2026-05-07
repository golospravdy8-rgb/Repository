import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAuth() {
  console.log('[requireAuth] Checking auth...');
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  console.log('[requireAuth] Token:', token);
  if (token !== "ldbl_admin_2025") {
    console.log('[requireAuth] Invalid token, redirecting...');
    redirect("/admin/login");
  }
  console.log('[requireAuth] Auth passed');
}

