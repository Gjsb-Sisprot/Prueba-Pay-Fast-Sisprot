"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X,  CheckCircle, RefreshCw, SquareCheckBig } from "lucide-react";
import React from "react";
import { ResponseAnnouncementItem } from "@/shared/types/announcements";
import { useAnnouncement } from "@/shared/hooks/use-announcements";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cards: ResponseAnnouncementItem[];
}

export function StackedCardsModal({ isOpen, onClose, cards }: Props) {
  const { markAnnouncementsAsViewed } = useAnnouncement();

  const markAnnouncements = async () => {
    try {
      await markAnnouncementsAsViewed(cards);
      onClose();
    } catch (error) {
      console.error("Error al marcar anuncios:", error);
    }
  };

  if (!isOpen || cards.length === 0) return null;


  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Cerrar */}
        <button
          className="absolute top-6 right-6 text-white z-50 p-2 rounded-full hover:bg-white/20 transition-colors"
          onClick={markAnnouncements}
        >
          <X size={32} />
        </button>

        {/* Contenido del modal */}
        <motion.div
          className="bg-[#1A1A2E] rounded-3xl p-10 text-center text-white w-[90%] max-w-lg shadow-xl relative"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
        >
          {/* Icono circular */}
          <div className="w-20 h-20 mx-auto rounded-full bg-[#3B3B5C] flex items-center justify-center -mt-20 shadow-lg">
            <RefreshCw size={50} className="text-yellow-400" />
          </div>

          {/* Título */}
          <h2 className="text-2xl font-extrabold mt-6">
            De tu sugerencia a la solución
          </h2>

          {/* Texto corto */}
          <p className="text-white/80 mt-3 text-sm">
            Mejora tu experiencia con nuevas funciones.
          </p>

          {/* Beneficios dinámicos en una sola línea justificada */}
          <div className="mt-6 space-y-3 text-base font-medium w-full">
            {cards.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 justify-start text-left"
              >
                <CheckCircle className="text-green-400 shrink-0" />
                <span className="flex-1 text-white">
                  <span className="font-semibold">
                    {item.title || "Título no disponible"}
                  </span>
                  {": "}
                  <span className="text-white/80">
                    {item.short_detail || "Sin descripción"}
                  </span>
                </span>
              </div>
            ))}
{/* 
              <div
                key={"extra-benefit"}
                className="flex items-center gap-3 justify-start text-left"
              >
                <CheckCircle className="text-green-400 shrink-0" />
                <span className="flex-1 text-white">
                  <span className="font-semibold">
                    Validación Automática (Proximamente)
                  </span>
                  {": "}
                  <span className="text-white/80">
                    Valida automaticamente tus pagos solo cargando el comprobante de pago.
                  </span>
                </span>
              </div> */}
          </div>




          {/* Botones */}
          <div className="mt-8 flex gap-4 justify-center">

            <button
              className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-blue-700 transition font-bold flex items-center gap-2"
              onClick={markAnnouncements}
            >
              Entendido
              <SquareCheckBig size={20} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
