"use client";

import { useEffect, useRef, useState } from "react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      // focus the cancel button by default for accessibility
      setTimeout(() => cancelRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    try {
      setLoading(true);
      await onConfirm();
      // close after successful confirm
      onClose();
    } catch (err) {
      // keep modal open so caller can show errors if needed
      console.error("ConfirmModal onConfirm error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        // close when clicking on the overlay (but not when clicking inside dialog)
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-gray-600 text-gray-200 rounded-2xl p-4 md:p-6 w-full max-w-[460px] shadow-xl border border-gray-700">
        {/* Message: limit height and allow internal scroll for long content */}
        <div className="text-lg md:text-xl font-semibold mb-4 max-h-40 md:max-h-56 overflow-auto break-words whitespace-pre-wrap">
          {message}
        </div>

        <div className="flex gap-3 mt-4 md:mt-6 justify-end">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-transparent border border-gray-600 text-gray-200 hover:bg-gray-800 transition"
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-md bg-red-500 text-white font-semibold hover:bg-red-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
