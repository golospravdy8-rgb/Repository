"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function ScheduleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Розклад недоступний"
      message="Не вдалося завантажити розклад ігор. Спробуйте пізніше."
      reset={reset}
    />
  );
}
