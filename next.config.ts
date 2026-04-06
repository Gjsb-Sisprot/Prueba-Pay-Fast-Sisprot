import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    taint: true, // Habilitar React tainting para prevenir exposición de datos sensibles
  },

  // Configuración para permitir origins de desarrollo
  allowedDevOrigins: [
    "duck-precious-yesterday-badge.trycloudflare.com",
    "localhost",
    "127.0.0.1",
  ],

  // Headers de seguridad ahora manejados por middleware.ts para nonces dinámicos

  images: {
    // Si estás usando Next.js 13.4 o superior, usa remotePatterns
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.sisprotgf.com',
        port: '',
        pathname: '/media/files/**', // Puedes ser más específico si quieres
      },
    ],
    // Opcional: Si estás usando una versión más antigua o prefieres la sintaxis simple:
    // domains: ['api.sisprotgf.com'], 
  },
};

export default nextConfig;
