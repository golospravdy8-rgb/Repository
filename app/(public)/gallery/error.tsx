"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function GalleryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Галерея не завантажилась"
      message="Не вдалося завантажити фотогалерею."
      reset={reset}
    />
  );
}
