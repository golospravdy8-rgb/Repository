"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function MarketplaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Барахолка недоступна"
      message="Не вдалося завантажити барахолку. Спробуйте пізніше."
      reset={reset}
    />
  );
}
