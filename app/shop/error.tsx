"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Магазин недоступний"
      message="Не вдалося завантажити магазин. Спробуйте пізніше."
      reset={reset}
    />
  );
}
