"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function AchievementsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Досягнення не завантажились"
      message="Не вдалося завантажити розділ досягнень та бейджів."
      reset={reset}
    />
  );
}
