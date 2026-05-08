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
    referee?: string | null;
    umpire1?: string | null;
    umpire2?: string | null;
    scorer?: string | null;
    assistantScorer?: string | null;
    timer?: string | null;
    shotClockOperator?: string | null;
    gameNumber?: string | null;
    protest?: boolean | null;
    protestNote?: string | null;
  };
  hideCloseButton?: boolean;
}

export default function GameInfoForm({ gameId, initialData, hideCloseButton }: GameInfoFormProps) {
  const [showPanel, setShowPanel] = useState(true);
  const [formData, setFormData] = useState({
    commissioner: initialData.commissioner || "",
    referee: initialData.referee || "",
    umpire1: initialData.umpire1 || "",
    umpire2: initialData.umpire2 || "",
    scorer: initialData.scorer || "",
    assistantScorer: initialData.assistantScorer || "",
    timer: initialData.timer || "",
    shotClockOperator: initialData.shotClockOperator || "",
    gameNumber: initialData.gameNumber || "",
    venue: initialData.venue || "",
    round: initialData.round || "",
    protest: initialData.protest || false,
    protestNote: initialData.protestNote || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate FIBA fields - only block spam (repeated characters)
    const isSpamInput = (val: string) => {
      if (!val || val.trim().length === 0) return false;
      if (/(.)\1{3,}/.test(val)) return true;
      return false;
    };

    const fieldsToValidate = ['scorer', 'assistantScorer', 'timer', 'referee', 'umpire1', 'umpire2'];

    for (const field of fieldsToValidate) {
      const val = formData[field as keyof typeof formData];
      if (val && isSpamInput(String(val))) {
        setMessage({ type: "error", text: `Поле "${field}" містить некоректні дані` });
        setLoading(false);
        return;
      }
    }

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

      {/* Основні дані */}
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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Номер гри</label>
          <input
            type="text"
            name="gameNumber"
            value={formData.gameNumber}
            onChange={handleChange}
            placeholder="Напр.: 15"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
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
      </div>

      {/* Суддівська бригада */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Суддівська бригада</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Головний суддя</label>
            <input
              type="text"
              name="referee"
              value={formData.referee}
              onChange={handleChange}
              placeholder="ІПО"
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Арбітр 1</label>
            <input
              type="text"
              name="umpire1"
              value={formData.umpire1}
              onChange={handleChange}
              placeholder="ІПО"
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Арбітр 2</label>
            <input
              type="text"
              name="umpire2"
              value={formData.umpire2}
              onChange={handleChange}
              placeholder="ІПО"
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Секретарська бригада */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Секретарська бригада</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Секретар</label>
            <input
              type="text"
              name="scorer"
              value={formData.scorer}
              onChange={handleChange}
              placeholder="ІПО"
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Помічник секретаря</label>
            <input
              type="text"
              name="assistantScorer"
              value={formData.assistantScorer}
              onChange={handleChange}
              placeholder="ІПО"
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Хронометрист</label>
            <input
              type="text"
              name="timer"
              value={formData.timer}
              onChange={handleChange}
              placeholder="ІПО"
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Оператор 24 сек</label>
            <input
              type="text"
              name="shotClockOperator"
              value={formData.shotClockOperator}
              onChange={handleChange}
              placeholder="ІПО"
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Протест */}
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="protest"
            checked={formData.protest}
            onChange={handleChange}
            className="w-4 h-4 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Протест поданий</span>
        </label>
      </div>

      {formData.protest && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Причина протесту</label>
          <textarea
            name="protestNote"
            value={formData.protestNote}
            onChange={handleChange}
            placeholder="Опис причини протесту"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

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
