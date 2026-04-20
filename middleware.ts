import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Middleware: refresh do JWT do Supabase em toda requisição autenticada.
 * Roda em todas as rotas exceto assets estáticos e webhooks (que validam por HMAC).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match em tudo, exceto:
     * - _next/static, _next/image, favicon, manifest, sw.js, /icons
     * - /api/webhooks/* (validados por HMAC, não dependem de cookie)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|api/webhooks).*)',
  ],
};
