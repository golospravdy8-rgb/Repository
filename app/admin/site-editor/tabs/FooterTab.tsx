"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateFooterSettings } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const FooterTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function FooterTab({ settings }, ref) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [col1Visible, setCol1Visible] = useState(settings["footer.col1.visible"] !== "false");
  const [col2Visible, setCol2Visible] = useState(settings["footer.col2.visible"] !== "false");
  const [col3Visible, setCol3Visible] = useState(settings["footer.col3.visible"] !== "false");
  const [textColor, setTextColor] = useState(settings["footer.textColor"] ?? "#9ca3af");

  const handleSave = () => {
    startTransition(async () => {
      await updateFooterSettings({
        "footer.col1.visible": String(col1Visible),
        "footer.col2.visible": String(col2Visible),
        "footer.col3.visible": String(col3Visible),
        "footer.textColor": textColor,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  useImperativeHandle(ref, () => ({ save: handleSave }));

  const Toggle = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-orange-500" : "bg-gray-300"}`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`}
        />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider border-b pb-2">Колонки</h2>
        <div className="space-y-3">
          <Toggle label="Колонка 1: Про нас / Бренд" value={col1Visible} onChange={setCol1Visible} />
          <Toggle label="Колонка 2: Навігація" value={col2Visible} onChange={setCol2Visible} />
          <Toggle label="Колонка 3: Контакти" value={col3Visible} onChange={setCol3Visible} />
        </div>
      </section>

      <section>
        <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider border-b pb-2">Кольори</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Колір тексту футера</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none font-mono"
          />
        </div>
      </section>

      <section>
        <h2 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider border-b pb-2">
          Тексти футера
        </h2>
        <p className="text-sm text-gray-500">
          Відредагуйте тексти у вкладці <strong>Тексти</strong> → секція &quot;Футер&quot;.
        </p>
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
          style={{ backgroundColor: "#1a2744" }}
        >
          {pending ? "Зберігається..." : "Зберегти налаштування футера"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
      </div>
    </div>
  );
}
);

export default FooterTab;
