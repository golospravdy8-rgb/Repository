"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function PlayersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Гравці не завантажились"
      message="Не вдалося отримати список гравців. Спробуйте пізніше."
      reset={reset}
    />
  );
}
