"use client";

import { updateGameInfo } from "@/src/actions/updateGameInfo";
import { useState } from "react";

interface GameInfoFormProps {
  gameId: number;
  initialData: {
    commissioner?: string | null;
    referee1?: string | null;
    referee2?: string | null;
    referee3?: string | null;
    venue?: string | null;
    round?: string | null;
  };
  hideCloseButton?: boolean;
}

export default function GameInfoForm({ gameId, initialData, hideCloseButton }: GameInfoFormProps) {
  const [showPanel, setShowPanel] = useState(true);
  const [formData, setFormData] = useState({
    commissioner: initialData.commissioner || "",
    referee1: initialData.referee1 || "",
    referee2: initialData.referee2 || "",
    referee3: initialData.referee3 || "",
    venue: initialData.venue || "",
    round: initialData.round || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateGameInfo(gameId, formData);
    setLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Дані гри оновлено успішно" });
    } else {
      setMessage({ type: "error", text: result.error || "Помилка при оновленні" });
    }
  };

  if (!showPanel && !hideCloseButton) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition mb-4"
      >
        ⚙️ FIBA
      </button>
    );
  }

  if (hideCloseButton && !showPanel) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6" style={{ position: "relative" }}>
      {!hideCloseButton && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPanel(false);
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "none",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            color: "#666",
            lineHeight: 1,
            padding: "2px 6px"
          }}
        >
          ×
        </button>
      )}
      <h2 className="text-lg font-bold mb-4">Налаштування гри (FIBA протокол)</h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Місце проведення</label>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            placeholder="Назва арени / спортзалу"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тур/Раунд</label>
          <input
            type="text"
            name="round"
            value={formData.round}
            onChange={handleChange}
            placeholder="Напр.: Фінал, Півфінал, 1 тур"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Комісар</label>
        <input
          type="text"
          name="commissioner"
          value={formData.commissioner}
          onChange={handleChange}
          placeholder="ІПО комісара"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Суддя 1</label>
          <input
            type="text"
            name="referee1"
            value={formData.referee1}
            onChange={handleChange}
            placeholder="ІПО судді"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Суддя 2</label>
          <input
            type="text"
            name="referee2"
            value={formData.referee2}
            onChange={handleChange}
            placeholder="ІПО судді"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Суддя 3</label>
          <input
            type="text"
            name="referee3"
            value={formData.referee3}
            onChange={handleChange}
            placeholder="ІПО судді"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition"
      >
        {loading ? "Збереження..." : "Зберегти"}
      </button>
    </form>
  );
}
