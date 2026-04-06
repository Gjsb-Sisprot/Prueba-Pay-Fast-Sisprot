"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface ImagePreviewModalProps {
  /** If provided, the modal is controlled. If omitted, `defaultOpen` toggles internal open state. */
  open?: boolean;
  onClose?: () => void;
  src: string;
  alt?: string;
  title?: string;
  /** When uncontrolled (no `open` prop), open the modal on mount */
  defaultOpen?: boolean;
}

export function ImagePreviewModal({
  open,
  onClose,
  src,
  alt = "image",
  title,
  defaultOpen = false,
}: ImagePreviewModalProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  useEffect(() => {
    // If uncontrolled and defaultOpen true, ensure internal state is set on mount
    if (!isControlled && defaultOpen) setInternalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isOpen) return;
      // prefer parent handler when provided
      if (e.key === "Escape") {
        if (isControlled) onClose?.();
        else setInternalOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isControlled, onClose]);

  if (!isOpen) return null;

  function handleClose() {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
      onClose?.();
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        // close when clicking the overlay (but not when clicking inside the dialog)
        if (e.target === overlayRef.current) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Image preview"}
    >
      {/* Smaller modal and image fills whole container */}
      <div className="relative w-[580px] h-[280px]  sm:w-[600px] sm:h-[480px] rounded-xl overflow-hidden shadow-xl border border-gray-700 bg-black
      ">
        <button
          aria-label="Cerrar"
          onClick={handleClose}
          className="absolute top-2 right-2 z-20 text-gray-200 hover:text-white bg-black/30 rounded-full p-1"
        >
          ✕
        </button>

        <div className="w-full h-full">
          <Image
            src={src}
            alt={alt}
            width={400}
            height={400}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    </div>
  );
}
