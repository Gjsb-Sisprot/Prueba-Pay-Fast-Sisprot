import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Construction, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Próximamente | Pago Rápido Sisprot",
  description: "Esta funcionalidad estará disponible próximamente.",
};

export default function PagoRapidoPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
      <main className="max-w-md mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/assets/logo/logo_sgf.png"
            alt="Sisprot Global Fiber"
            width={100}
            height={100}
            className="drop-shadow-lg"
            priority
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <Construction className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-4">
          Próximamente
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-lg mb-6">
          Esta ruta está temporalmente deshabilitada mientras trabajamos en mejoras.
        </p>

        {/* Info box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-yellow-800">
            <Clock className="w-5 h-5" />
            <p className="text-sm font-medium">
              Por favor, usa la página principal para realizar tus pagos.
            </p>
          </div>
        </div>

        {/* Back button */}
        <Link href="/">
          <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Ir al Portal de Pagos
          </Button>
        </Link>
      </main>
    </div>
  );
}
