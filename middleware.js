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

  const { data: { user } } = await supabase.auth.getUser()

  // --- NEW LOGIC START ---
  const isLoginPage = request.nextUrl.pathname === '/'
  
  // 1. Logged in and on login page → redirect to admin dashboard
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/admin/accueil', request.url))
  }
  // --- NEW LOGIC END ---

  // Protect Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 2. Not logged in → redirect to login with a "from" parameter
    if (!user) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('from', request.nextUrl.pathname) // This lets you return here after login
      return NextResponse.redirect(loginUrl)
    }

    // Role check (Your existing logic)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Note: If you want 'gerant' and 'lecteur' to also access /admin, 
    // change this condition to: !['admin', 'gerant', 'lecteur'].includes(profile?.role)
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  // Update your matcher to include the root '/' so the login redirect works
  matcher: ['/', '/admin/:path*', '/dashboard/:path*'],
}