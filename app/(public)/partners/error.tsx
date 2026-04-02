"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function PartnersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Сторінка партнерів недоступна"
      message="Не вдалося завантажити розділ партнерів."
      reset={reset}
    />
  );
}
