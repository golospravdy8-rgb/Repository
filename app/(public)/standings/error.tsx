"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function StandingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Таблиця недоступна"
      message="Не вдалося завантажити турнірну таблицю. Спробуйте пізніше."
      reset={reset}
    />
  );
}
