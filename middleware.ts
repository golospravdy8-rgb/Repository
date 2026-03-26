import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Case-insensitive path corrections
const LOWERCASE_PATHS: Record<string, string> = {
  "/Media": "/media",
  "/Reviews": "/reviews",
  "/News": "/news",
  "/Schedule": "/schedule",
  "/Standings": "/standings",
  "/Leaders": "/leaders",
  "/Teams": "/teams",
  "/Players": "/players",
  "/Contacts": "/contacts",
};

export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  // Redirect wrong-case paths
  const lower = LOWERCASE_PATHS[pathname];
  if (lower) {
    const url = req.nextUrl.clone();
    url.pathname = lower;
    return NextResponse.redirect(url);
  }

  // /admin/login → redirect to actual login page
  if (pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const isLoggedIn = !!req.auth;
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", "/admin/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/Media", "/Reviews", "/News", "/Schedule", "/Standings", "/Leaders", "/Teams", "/Players", "/Contacts"],
};
