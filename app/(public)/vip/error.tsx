"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function VipError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="VIP-кабінет недоступний"
      message="Не вдалося завантажити VIP-кабінет. Спробуйте пізніше."
      reset={reset}
    />
  );
}
