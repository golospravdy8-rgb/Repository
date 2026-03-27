import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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

export default async function middleware(req: NextRequest) {
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

  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", "/admin/dashboard");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/Media", "/Reviews", "/News", "/Schedule", "/Standings", "/Leaders", "/Teams", "/Players", "/Contacts"],
};
