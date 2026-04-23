
"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_MEDIA_LIMITS,
  type MediaAttachment,
  type MediaUsage,
} from "../lib/types";

function generateMediaId(): string {
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useMediaAttachments() {
  const [pendingAttachments, setPendingAttachments] = useState<MediaAttachment[]>([]);
  const [mediaUsage, setMediaUsage] = useState<MediaUsage>({
    imagesUsed: 0,
    videosUsed: 0,
  });

  const addAttachment = useCallback(
    async (file: File): Promise<{ success: boolean; error?: string }> => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isVideo && !isPdf) {
        return { success: false, error: "Solo se permiten imágenes, videos y documentos PDF" };
      }

      if (isImage && mediaUsage.imagesUsed >= DEFAULT_MEDIA_LIMITS.maxImages) {
        return {
          success: false,
          error: `Límite de ${DEFAULT_MEDIA_LIMITS.maxImages} imágenes alcanzado`,
        };
      }

      if (isVideo && mediaUsage.videosUsed >= DEFAULT_MEDIA_LIMITS.maxVideos) {
        return {
          success: false,
          error: `Límite de ${DEFAULT_MEDIA_LIMITS.maxVideos} videos alcanzado`,
        };
      }

      if (file.size > DEFAULT_MEDIA_LIMITS.maxFileSize) {
        return {
          success: false,
          error: `El archivo supera el límite de ${DEFAULT_MEDIA_LIMITS.maxFileSize / 1024 / 1024}MB`,
        };
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      let frames: string[] | undefined;
      let duration: number | undefined;

      if (isVideo) {
        const result = await extractVideoFrames(file);

        if (result.error && result.duration && result.duration > DEFAULT_MEDIA_LIMITS.maxVideoDuration) {
          return {
            success: false,
            error: `El video supera los ${DEFAULT_MEDIA_LIMITS.maxVideoDuration} segundos permitidos`,
          };
        }

        if (result.error) {
        }

        frames = result.frames;
        duration = result.duration;
      }

      const attachment: MediaAttachment = {
        id: generateMediaId(),
        type: isImage ? "image" : isVideo ? "video" : "file",
        url: dataUrl,
        mimeType: file.type,
        size: file.size,
        fileName: file.name,
        duration,
        frames,
      };

      setPendingAttachments((prev) => [...prev, attachment]);
      return { success: true };
    },
    [mediaUsage]
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  const clearAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  const consumeAttachments = useCallback(() => {
    const current = [...pendingAttachments];
    const newImagesCount = current.filter((a) => a.type === "image").length;
    const newVideosCount = current.filter((a) => a.type === "video").length;

    setMediaUsage((prev) => ({
      imagesUsed: prev.imagesUsed + newImagesCount,
      videosUsed: prev.videosUsed + newVideosCount,
    }));

    setPendingAttachments([]);
    return current;
  }, [pendingAttachments]);

  const resetMediaUsage = useCallback(() => {
    setMediaUsage({ imagesUsed: 0, videosUsed: 0 });
    setPendingAttachments([]);
  }, []);

  return {
    pendingAttachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    consumeAttachments,
    resetMediaUsage,
    mediaUsage,
    mediaLimits: DEFAULT_MEDIA_LIMITS,
  };
}


interface VideoFrameResult {
  frames?: string[];
  duration?: number;
  error?: string;
}

async function extractVideoFrames(file: File): Promise<VideoFrameResult> {
  const TIMEOUT_MS = 15000;

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (value: VideoFrameResult) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const timeoutId = setTimeout(() => {
      safeResolve({ error: "Tiempo de espera agotado al procesar el video" });
    }, TIMEOUT_MS);

    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;

        if (duration > DEFAULT_MEDIA_LIMITS.maxVideoDuration) {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(video.src);
          safeResolve({
            duration,
            error: `El video dura ${duration.toFixed(1)}s, máximo permitido: ${DEFAULT_MEDIA_LIMITS.maxVideoDuration}s`,
          });
          return;
        }

        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;

        const frames: string[] = [];
        const times = [0, duration / 2, Math.max(0, duration - 0.1)];

        for (const time of times) {
          video.currentTime = time;
          await new Promise<void>((r) => {
            const seekTimeout = setTimeout(() => r(), 3000);
            video.onseeked = () => {
              clearTimeout(seekTimeout);
              r();
            };
          });

          ctx?.drawImage(video, 0, 0);
          const frame = canvas.toDataURL("image/jpeg", 0.8);
          frames.push(frame);
        }

        clearTimeout(timeoutId);
        URL.revokeObjectURL(video.src);
        safeResolve({ frames, duration });
      } catch {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(video.src);
        safeResolve({ error: "Error al extraer frames del video" });
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      safeResolve({ error: "No se pudo procesar el video" });
    };

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.load();
  });
}
