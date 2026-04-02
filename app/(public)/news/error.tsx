"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function NewsListError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Новини не завантажились"
      message="Не вдалося завантажити новини. Спробуйте пізніше."
      reset={reset}
    />
  );
}
