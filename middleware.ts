import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Proxy micro-apps requests
  if (pathname.startsWith('/marketplace')) {
    return NextResponse.redirect('http://localhost:3107' + pathname);
  }
  if (pathname.startsWith('/courses')) {
    return NextResponse.redirect('http://localhost:3108' + pathname);
  }
  if (pathname.startsWith('/shop')) {
    return NextResponse.redirect('http://localhost:3109' + pathname);
  }
  if (pathname.startsWith('/news-app')) {
    return NextResponse.redirect('http://localhost:3110' + pathname);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/marketplace/:path*', '/courses/:path*', '/shop/:path*', '/news-app/:path*'],
};
