"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError("Невірний email або пароль");
      } else {
        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch {
      setError("Помилка з'єднання. Спробуйте ще раз.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f1f5f9" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-xl mx-auto mb-4"
            style={{ backgroundColor: "#1a2744" }}
          >
            БЛ
          </div>
          <h1 className="text-2xl font-black" style={{ color: "#1a2744" }}>
            ЛДБЛ Admin
          </h1>
          <p className="text-gray-500 text-sm mt-1">Увійдіть для управління лігою</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="admin@basket.lviv.ua"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": "#1a2744" } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Пароль</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-lg font-bold text-white text-sm transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#1a2744" }}
          >
            {pending ? "Вхід..." : "Увійти"}
          </button>
        </form>
      </div>
    </div>
  );
}
