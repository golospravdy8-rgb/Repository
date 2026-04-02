"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function MediaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Медіа не завантажилось"
      message="Не вдалося завантажити фото та відео."
      reset={reset}
    />
  );
}
