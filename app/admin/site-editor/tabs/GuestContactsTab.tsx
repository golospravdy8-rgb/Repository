"use client";

import { useState, useEffect } from "react";

type Contact = {
  id: number;
  phone: string;
  firstName: string;
  lastName: string;
  refCode: string | null;
  hp: number;
  role: string;
  createdAt: string;
};

export default function GuestContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/guest-contacts")
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Видалити контакт ${c.firstName} ${c.lastName} (${c.phone})?`)) return;
    setDeletingId(c.id);
    try {
      const response = await fetch("/api/guest-contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      if (!response.ok) {
        let errorMsg = "Не вдалося видалити контакт";
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          try {
            const error = await response.json();
            errorMsg = error.error || errorMsg;
          } catch {
            errorMsg = `Помилка сервера (${response.status})`;
          }
        }
        alert(`Помилка: ${errorMsg}`);
        setDeletingId(null);
        return;
      }
      setContacts((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(`Помилка мережі: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Контакти гостей</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Учасники, які зареєструвались через Чат ЛДБЛ
          </p>
        </div>
        <div className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
          {contacts.length} учасників
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Завантаження...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Поки що немає зареєстрованих учасників
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Ім&apos;я</th>
                <th className="px-4 py-3 font-semibold">Прізвище</th>
                <th className="px-4 py-3 font-semibold">Телефон</th>
                <th className="px-4 py-3 font-semibold">Роль</th>
                <th className="px-4 py-3 font-semibold">HP</th>
                <th className="px-4 py-3 font-semibold">Реферал</th>
                <th className="px-4 py-3 font-semibold">Дата</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.firstName}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.lastName}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      c.role === "parent" ? "bg-blue-100 text-blue-700" :
                      c.role === "player" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {c.role === "parent" ? "👨‍👩‍👦 батько/мати" : c.role === "player" ? "🏀 гравець" : "гість"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-orange-600">{c.hp} HP</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.refCode || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-40"
                    >
                      {deletingId === c.id ? "..." : "Видалити"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
