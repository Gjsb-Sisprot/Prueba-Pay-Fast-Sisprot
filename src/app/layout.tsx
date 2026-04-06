import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SkeletonProvider } from "@/shared/components/skeleton-provider";
import { SecurityProvider } from "@/shared/components/security-provider";
import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Obtener nonce del middleware
  const headersList = await headers();
  const nonce = headersList.get("x-nonce");

  return (
    <html lang="es">
      <head>
        {/* CSP y headers de seguridad configurados en middleware.ts */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">
       <SecurityProvider nonce={nonce}>
          <SkeletonProvider>
            <div className="relative min-h-screen w-full bg-white">
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
              <div className="relative z-10">{children}</div>
            </div>
          </SkeletonProvider>
        </SecurityProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
