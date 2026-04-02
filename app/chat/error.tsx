"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function ChatError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Чат недоступний"
      message="Не вдалося завантажити Балачку. Спробуйте оновити сторінку."
      reset={reset}
    />
  );
}
