"use client";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function CoursesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorFallback
      title="Курси недоступні"
      message="Не вдалося завантажити розділ курсів. Спробуйте пізніше."
      reset={reset}
    />
  );
}
