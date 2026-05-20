import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Se as variáveis estiverem ausentes, retornamos o response original
  // para evitar que o middleware trave (Erro 500).
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isPortariaPage = request.nextUrl.pathname.startsWith('/portaria')

  if ((isAdminPage || isPortariaPage) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const role = user.app_metadata?.role || user.user_metadata?.role || '';
    const email = user.email || '';
    
    const isAuthAdmin = ['dono', 'gerente', 'admin'].includes(role) || email === 'narnia@admin.com';
    const isReceptionist = ['receptionist', 'portaria'].includes(role);

    if (isAdminPage && !isAuthAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = isReceptionist ? '/portaria' : '/login'
      return NextResponse.redirect(url)
    }

    if (isPortariaPage && !isAuthAdmin && !isReceptionist) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = isAuthAdmin ? '/admin' : (isReceptionist ? '/portaria' : '/')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
