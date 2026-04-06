/**
 * Landing Page - Portal de Pagos Rápidos Sisprot
 *
 * Página promocional que muestra las características del sistema
 * e las capacidades de IA disponibles.
 *
 * @module app/landing/page
 */

import { Metadata } from "next";
import { Hero } from "./components/Hero";
import { RewardsProgram } from "./components/RewardsProgram";
import { CommercialAllies } from "./components/CommercialAllies";
import { PaymentMethods } from "./components/PaymentMethods";
import { Features } from "./components/Features";
import { AIAssistant } from "./components/AIAssistant";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";

export const metadata: Metadata = {
  title: "Bienvenido | Pago Rápido Sisprot",
  description:
    "Portal de pagos rápidos y seguros de Sisprot Global Fiber. Paga tus facturas con Pago Móvil, Transferencia o Zelle. Asistente IA disponible 24/7.",
  openGraph: {
    title: "Bienvenido | Pago Rápido Sisprot",
    description: "Paga tus facturas de internet de forma rápida y segura",
    images: ["/assets/logo/logo_sgf.png"],
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50">
      <Hero />
      <AIAssistant />
      <RewardsProgram />
      <CommercialAllies />
      <PaymentMethods />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}
