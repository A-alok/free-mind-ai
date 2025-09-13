import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',           // Home page
  '/login',      // Login page
  '/register',   // Signup page
  '/contact',    // Contact page
  '/about',      // About page
  '/faq',        // FAQ page
]

// Define API routes that should be accessible
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
]

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }
  
  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Allow static files (images, css, js, etc.)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }
  
  // Check for authentication cookie
  const userId = request.cookies.get('userId')
  
  // If no userId cookie, redirect to login
  if (!userId) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // If userId exists, allow access
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes that handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
}