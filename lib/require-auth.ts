import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (token !== "ldbl_admin_2025") {
    redirect("/admin/login");
  }
}
