import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remover el prefijo "data:image/jpeg;base64," etc.
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Error al convertir archivo a base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getFileExtension = (file: File): string => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  // Mapear extensiones a los formatos esperados por la API
  switch (extension) {
    case "jpeg":
      return "jpg";
    case "jpg":
      return "jpg";
    case "png":
      return "png";
    case "gif":
      return "gif";
    case "webp":
      return "webp";
    default:
      return "jpg"; // Fallback
  }
};