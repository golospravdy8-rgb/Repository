"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function PlayerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Профіль гравця недоступний"
      message="Не вдалося завантажити дані гравця."
      reset={reset}
      backHref="/players"
      backLabel="Всі гравці"
    />
  );
}
