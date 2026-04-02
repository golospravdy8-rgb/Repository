"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function GameError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Матч не завантажився"
      message="Не вдалося отримати дані матчу. Можливо, він ще не відбувся або сталася помилка."
      reset={reset}
      backHref="/schedule"
      backLabel="До розкладу"
    />
  );
}
