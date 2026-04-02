"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function LeadersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Лідери не завантажились"
      message="Не вдалося завантажити статистику лідерів."
      reset={reset}
    />
  );
}
