import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Generar nonce único para cada request
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // CSP diferente para desarrollo y producción
  const isDevelopment = process.env.NODE_ENV === "development";

  const cspHeader = isDevelopment
    ? `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com;
      style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self' data:;
      connect-src 'self' ws: wss: https://vitals.vercel-insights.com https://vercel.live;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
    `
    : `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live https://va.vercel-scripts.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self' data:;
      connect-src 'self' https://vitals.vercel-insights.com https://vercel.live;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      block-all-mixed-content;
      upgrade-insecure-requests;
    `;

  // Limpiar espacios en blanco y saltos de línea
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, " ")
    .trim();

  // Configurar headers del request
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue
  );

  // Crear response con headers de seguridad
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Establecer headers de seguridad en la response
  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue
  );
  response.headers.set("x-nonce", nonce);

  // Headers adicionales de seguridad
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  if (!isDevelopment) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - api (rutas API)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
