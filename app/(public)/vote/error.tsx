"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function VoteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Голосування недоступне"
      message="Не вдалося завантажити сторінку голосування. Спробуйте пізніше."
      reset={reset}
    />
  );
}
