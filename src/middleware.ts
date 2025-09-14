// middleware.ts - Fixed version
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/invite/(.*)',
]);

// Define admin-only routes
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/admin(.*)',
]);

// Client redirect is a special route that handles routing logic
const isClientRedirect = createRouteMatcher([
  '/client-redirect',
]);

// Define workspace routes (for authenticated clients)
const isWorkspaceRoute = createRouteMatcher([
  '/w/(.*)',
  '/onboarding/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to sign-in
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Allow client-redirect to handle its own logic
  if (isClientRedirect(req)) {
    return NextResponse.next();
  }

  // Allow workspace routes for authenticated users
  if (isWorkspaceRoute(req)) {
    return NextResponse.next();
  }

  // Allow admin routes (the page itself will check permissions)
  if (isAdminRoute(req)) {
    return NextResponse.next();
  }

  // For root path, let the page handle the redirect logic
  if (req.nextUrl.pathname === '/') {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};