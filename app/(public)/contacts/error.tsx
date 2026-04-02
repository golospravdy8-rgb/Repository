"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function ContactsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Контакти не завантажились"
      message="Не вдалося завантажити сторінку контактів."
      reset={reset}
    />
  );
}
