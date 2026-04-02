"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function TeamsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Команди не завантажились"
      message="Не вдалося отримати список команд. Спробуйте пізніше."
      reset={reset}
    />
  );
}
