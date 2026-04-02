"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function NewsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Новину не знайдено"
      message="Не вдалося завантажити цю новину. Можливо, вона була видалена або сталася помилка."
      reset={reset}
      backHref="/news"
      backLabel="Всі новини"
    />
  );
}
