import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAuth() {
  try {
    console.log("[requireAuth] Starting auth check...");

    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    console.log("[requireAuth] Token check:", {
      tokenExists: !!token,
      tokenValue: token ? token.substring(0, 10) + "..." : undefined,
    });

    if (token !== "ldbl_admin_2025") {
      console.warn("[requireAuth] Auth failed - invalid or missing token");
      redirect("/admin/login");
    }

    console.log("[requireAuth] Auth check passed");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[requireAuth] Auth check FAILED:", msg);
    throw err;
  }
}
