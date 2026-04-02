"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function HighlightsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Відео не завантажились"
      message="Не вдалося завантажити відео-хайлайти. Спробуйте пізніше."
      reset={reset}
    />
  );
}
