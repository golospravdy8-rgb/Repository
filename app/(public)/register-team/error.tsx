"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function RegisterTeamError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Реєстрація недоступна"
      message="Не вдалося завантажити форму реєстрації команди. Спробуйте пізніше або зв&apos;яжіться з організаторами."
      reset={reset}
      backHref="/contacts"
      backLabel="Контакти"
    />
  );
}
