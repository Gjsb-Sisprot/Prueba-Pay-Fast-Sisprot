# Portal de Pagos - Sisprot Global Fiber C.A.

## 🚀 Portal de Pagos Avanzado v2.0
ß
Portal de pagos moderno y seguro para los clientes de **Sisprot Global Fiber C.A.**, desarrollado con Next.js 14, TypeScript y diseño mobile-first.

---

## 📋 **Características Principales**

### 💳 **Métodos de Pago Múltiples**

- **Pago Móvil**: Transferencias desde apps bancarias
- **Transferencia Bancaria**: Sistema tradicional optimizado
- **Zelle**: Pagos en dólares con conversión automática

### 🔐 **Seguridad Avanzada**

- Validación PIN6 por SMS/Email
- Protección anti-herramientas de desarrollador
- Content Security Policy (CSP) estricto
- Validación automatizada de pagos

### 🎨 **Experiencia de Usuario**

- Diseño responsive mobile-first
- Stepper visual para seguimiento de progreso
- Loading states y skeletons animados
- Encuestas de satisfacción automáticas

### 🔄 **Integración API**

- Validación de pagos en tiempo real
- Tasa de cambio automática
- Webhook para notificaciones
- Sistema de comprobantes digitales

---

## 🛠️ **Stack Tecnológico**

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Estado**: Zustand
- **Formularios**: React Hook Form + TanStack Form
- **UI Components**: Radix UI + shadcn/ui
- **Validación**: Zod schemas
- **Animations**: Tailwind + CSS animations

---

## 🚀 **Instalación y Desarrollo**

### Requisitos Previos

- Node.js 18+
- npm/yarn/pnpm/bun

### Instalación

```bash
# Clonar el repositorio
git clone [repository-url]
cd pay-fast-taurus

# Instalar dependencias
npm install
# o
yarn install
# o
pnpm install
# o
bun install
```

### Desarrollo

```bash
# Ejecutar servidor de desarrollo
npm run dev
# o
yarn dev
# o
pnpm dev
# o
bun dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### Build y Producción

```bash
# Build para producción
npm run build

# Ejecutar en producción
npm start
```

---

## 🔧 **Variables de Entorno**

Crear un archivo `.env.local` con las siguientes variables:

```env
# APIs
NEXT_PUBLIC_API_BASE_URL=https://api.sisprotgf.com
NEXT_PUBLIC_CURRENCY_API_URL=https://api.sisprotgf.com/api/base/currency_rate
NEXT_PUBLIC_FEEDBACK_WEBHOOK=https://n8n.sisprotgf.com/webhook/feedback-portal

# Seguridad
NEXT_PUBLIC_CSP_NONCE=auto-generated
NEXT_PUBLIC_ENVIRONMENT=production

# Features
NEXT_PUBLIC_ENABLE_DEVTOOLS_PROTECTION=true
NEXT_PUBLIC_ENABLE_PIN6_VALIDATION=true
```

---

## 📁 **Estructura del Proyecto**

```
src/
├── app/                      # App Router (Next.js 14)
│   ├── api/                  # API Routes
│   │   ├── clients/          # Búsqueda de clientes
│   │   ├── contracts/        # Gestión de contratos
│   │   ├── invoices/         # Manejo de facturas
│   │   ├── payments/         # Validación de pagos
│   │   └── pin6/            # Validación PIN6
│   ├── globals.css          # Estilos globales
│   ├── layout.tsx           # Layout principal
│   └── page.tsx             # Página principal
│
├── components/              # Componentes React
│   ├── ui/                  # Componentes base (shadcn/ui)
│   ├── payment-validation/  # Validación de pagos por pasos
│   ├── payment-flow.tsx     # Flujo principal de pagos
│   ├── client-search-form.tsx # Búsqueda de clientes
│   ├── contract-list.tsx    # Lista de contratos
│   ├── invoice-list.tsx     # Lista de facturas
│   └── enhanced-security.tsx # Protecciones de seguridad
│
├── hooks/                   # Custom React Hooks
│   ├── use-client-search.ts # Hook para búsqueda
│   ├── use-character-limit.ts # Límite de caracteres
│   └── use-file-upload.ts   # Subida de archivos
│
├── lib/                     # Utilidades y configuración
│   ├── api/                 # Clientes API
│   ├── store/               # Estado global (Zustand)
│   ├── validation/          # Esquemas de validación
│   ├── api-client.ts        # Cliente HTTP
│   └── utils.ts             # Utilidades generales
│
└── types/                   # Definiciones TypeScript
```

---

## 🔒 **Configuración de Seguridad**

### Content Security Policy

El proyecto incluye CSP estricto configurado en `next.config.ts`:

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

### Protección Anti-DevTools

- Detección automática de herramientas de desarrollador
- Bloqueo de atajos de teclado peligrosos
- Protección diferenciada móvil vs desktop
- Recargas automáticas en caso de detección

---

## 📊 **APIs y Endpoints**

### Endpoints Principales

- `GET /api/clients` - Búsqueda de clientes
- `GET /api/contracts` - Contratos por cliente
- `GET /api/invoices` - Facturas por contrato
- `POST /api/payments/validate` - Validación de pagos
- `POST /api/pin6/request` - Solicitud PIN6

### Webhooks Externos

- **Feedback**: `https://n8n.sisprotgf.com/webhook/feedback-portal`
- **Notificaciones**: Configurables por cliente
- **Tasa de cambio**: `https://api.sisprotgf.com/api/base/currency_rate`

---

## 📈 **Métricas y Análisis**

El portal incluye un sistema completo de métricas:

- **Tiempo de proceso**: Duración completa del pago
- **Abandono por paso**: Análisis de conversion funnel
- **Satisfacción**: Encuestas post-pago (escala 1-10)
- **Métodos preferidos**: Estadísticas de uso por método
- **Errores**: Tracking automático de fallos

---

## 📚 **Documentación Adicional**

### ⚡ **[Resumen Ejecutivo →](./RESUMEN_EJECUTIVO.md)**

**Para reuniones de directorio y presentaciones rápidas:**

- 🎯 Resultados clave en números
- 📊 Tabla comparativa antes/después
- 🚀 Beneficios estratégicos
- 🏆 ROI y conclusiones ejecutivas

### 🎯 **[Presentación Ejecutiva →](./PRESENTACION_PORTAL_PAGOS.md)**

**Documento dirigido a personal no técnico, directivos y presentaciones:**

- 💡 Beneficios para clientes y empresa
- 📊 Casos de uso y resultados medibles
- 🎯 Flujo del proceso simplificado
- 💬 Testimonios y casos de éxito
- 🚀 Visión de futuro del portal

### 📋 **[Ver Mejoras Técnicas Completas →](./MEJORAS_PORTAL_PAGOS.md)**

**Documentación técnica detallada de la v2.0:**

- ✅ Validación automatizada de pagos
- ✅ Múltiples métodos de pago
- ✅ Seguridad avanzada anti-devtools
- ✅ Experiencia de usuario optimizada
- ✅ Gestión inteligente de contratos y facturas
- ✅ Sistema de métricas y feedback
- ✅ Integración API completa
- ✅ Arquitectura moderna y escalable

### Otros Documentos

- [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md) - Implementación de seguridad
- [SECURITY_SETUP.md](./SECURITY_SETUP.md) - Configuración de seguridad
- [CSP_SOLUTION.md](./CSP_SOLUTION.md) - Solución CSP
- [ANTI_DEVTOOLS_ENHANCED.md](./ANTI_DEVTOOLS_ENHANCED.md) - Protección anti-devtools

---

## 🤝 **Contribución**

### Git Workflow

1. `feature/` - Nuevas funcionalidades
2. `fix/` - Corrección de bugs
3. `security/` - Mejoras de seguridad
4. `ui/` - Mejoras de interfaz

### Estándares de Código

- **ESLint**: Configuración estricta
- **Prettier**: Formateo automático
- **TypeScript**: Type safety obligatorio
- **Conventional Commits**: Formato de commits estándar

---

## 📞 **Soporte**

**Sisprot Global Fiber C.A.**

- **Portal**: https://portal.sisprotgf.com
- **API**: https://api.sisprotgf.com
- **Call Center**: +584120261134
- **WhatsApp Business**: Integrado en el portal

---

## 📄 **Licencia**

© 2024 Sisprot Global Fiber C.A. - Todos los derechos reservados.

---

_Este README debe mantenerse actualizado con cada versión del portal._
