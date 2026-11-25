import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/session-cookie';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');

  if (!url || !anonKey) {
    if (isAdminPath) {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = await verifySessionCookie(token);
      if (!session) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        loginUrl.searchParams.set('reason', 'auth_required');
        return NextResponse.redirect(loginUrl);
      }
      if (session.role !== 'ADMIN') {
        const targetUrl = new URL('/check-in', request.url);
        targetUrl.searchParams.set('error', 'admin_only');
        return NextResponse.redirect(targetUrl);
      }
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminPath) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      loginUrl.searchParams.set('reason', 'auth_required');
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'ADMIN') {
      const targetUrl = new URL(profile?.role === 'STAFF' ? '/check-in' : '/', request.url);
      targetUrl.searchParams.set('error', 'admin_only');
      return NextResponse.redirect(targetUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
};
