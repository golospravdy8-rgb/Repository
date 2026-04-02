"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function GalleryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Фотоальбом не завантажився"
      message="Не вдалося завантажити фото цього матчу."
      reset={reset}
      backHref="/gallery"
      backLabel="До галереї"
    />
  );
}
