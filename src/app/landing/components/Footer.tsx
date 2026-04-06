import Image from "next/image";

export function Footer() {
  return (
    <footer className="px-4 py-8 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-200">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/logo/logo_sgf.png"
              alt="Sisprot"
              width={40}
              height={40}
            />
            <span className="font-semibold text-gray-900">
              Sisprot Global Fiber C.A.
            </span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
