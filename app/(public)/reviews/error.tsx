"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function ReviewsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Відгуки не завантажились"
      message="Не вдалося завантажити відгуки."
      reset={reset}
    />
  );
}
