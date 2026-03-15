import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // 1. Skip Next.js internals and API routes to prevent infinite loops on Vercel
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(.*)$/)
  ) {
    return response
  }

  // Fetch the user securely
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = pathname === '/'

  // 2. Logged in and on login page → redirect to dashboard
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/admin/accueil', request.url))
  }

  // Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    
    // 3. Not logged in → redirect to login with the "?from" parameter
    if (!user) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('from', pathname) 
      return NextResponse.redirect(loginUrl)
    }

    // 4. Role check - ALLOW admin, gerant, and lecteur
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If the user's role is missing or invalid, kick them out
    if (!['admin', 'gerant', 'lecteur'].includes(profile?.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  // Use the broader matcher from the instructions to ensure Vercel catches all routes properly
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}