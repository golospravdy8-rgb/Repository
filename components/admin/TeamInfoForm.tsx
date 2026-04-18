"use client";

import { updateTeamInfo } from "@/src/actions/updateTeamInfo";
import { useState } from "react";

interface TeamInfoFormProps {
  teamId: number;
  teamName: string;
  initialData: {
    coachName?: string | null;
    assistantCoach?: string | null;
  };
}

export default function TeamInfoForm({ teamId, teamName, initialData }: TeamInfoFormProps) {
  const [showPanel, setShowPanel] = useState(true);
  const [formData, setFormData] = useState({
    coachName: initialData.coachName || "",
    assistantCoach: initialData.assistantCoach || "",
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

    const result = await updateTeamInfo(teamId, formData);
    setLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Дані команди оновлено успішно" });
    } else {
      setMessage({ type: "error", text: result.error || "Помилка при оновленні" });
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition mb-4 w-full"
      >
        👥 {teamName}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6" style={{ position: "relative" }}>
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
      <h3 className="text-base font-bold mb-4">{teamName}</h3>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Тренер</label>
          <input
            type="text"
            name="coachName"
            value={formData.coachName}
            onChange={handleChange}
            placeholder="ІПО тренера"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Помічник тренера</label>
          <input
            type="text"
            name="assistantCoach"
            value={formData.assistantCoach}
            onChange={handleChange}
            placeholder="ІПО помічника"
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
