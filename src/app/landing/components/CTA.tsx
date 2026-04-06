"use client";

import Link from "next/link";
import { ArrowRight, Instagram, Facebook, Youtube } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAnime } from "../hooks/useAnime";
import { stagger } from "animejs";
import { QRCodeSVG } from "qrcode.react";

// WhatsApp Icon component as simple SVG
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function CTA() {
  const contentRef = useAnime<HTMLDivElement>({
    translateY: [30, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: "easeOutExpo",
  });



  const qrRef = useAnime<HTMLDivElement>({
    selector: ".qr-item-anim",
    translateY: [20, 0],
    opacity: [0, 1],
    delay: stagger(100, { start: 400 }),
    duration: 800,
    easing: "easeOutExpo",
  });

  const socialLinks = [
    {
      name: "Instagram",
      icon: <Instagram className="w-6 h-6" />,
      href: "https://www.instagram.com/sisprotgf",
      color: "hover:text-pink-600",
      iconColor: "text-pink-600",
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-6 h-6" />,
      href: "https://www.facebook.com/sisprotgf",
      color: "hover:text-blue-600",
      iconColor: "text-blue-600",
    },
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon className="w-6 h-6" />,
      href: "https://whatsapp.com/channel/0029Vab9DIpEFeXk23mELA2g",
      color: "hover:text-green-600",
      iconColor: "text-green-600",
    },
    {
      name: "Youtube",
      icon: <Youtube className="w-6 h-6" />,
      href: "https://youtube.com/@sisprotglobalfiber",
      color: "hover:text-red-600",
      iconColor: "text-red-600",
    },
  ];

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white border-t border-gray-100 overflow-hidden">
      <div ref={contentRef} className="mx-auto max-w-3xl text-center opacity-0">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          ¿Listo para pagar tu factura?
        </h2>
        <p className="text-gray-600 text-lg mb-8">
          Solo necesitas tu número de cédula para comenzar. El proceso es rápido
          y seguro.
        </p>

        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
            Síguenos o escribe a nuestras redes sociales
          </p>
        </div>

   

          {/* QR Codes Section */}
        <div 
          ref={qrRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto  pt-4 pb-8 "
        >
          {socialLinks.map((social) => (
            <Link
              key={`${social.name}-qr`}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="qr-item-anim opacity-0 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group"
            >
              <div className="relative p-2 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors duration-300">
                <QRCodeSVG
                  value={social.href}
                  size={110}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`bg-white p-1.5 rounded-full shadow-md ${social.iconColor} border border-gray-50`}>
                    {social.icon}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{social.name}</p>
                <p className="text-[10px] text-gray-400 font-medium tracking-tight uppercase leading-tight">
                  Escanea o haz click<br />para seguirnos
                </p>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/">
          <Button
            size="lg"
            className="text-lg px-10 py-7 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 mb-16"
          >
            Ir al Portal de Pagos
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Link>

      
      </div>
    </section>
  );
}
