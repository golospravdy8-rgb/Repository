"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function VideoError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Відео не завантажилось"
      message="Не вдалося відтворити це відео."
      reset={reset}
      backHref="/highlights"
      backLabel="Всі відео"
    />
  );
}
