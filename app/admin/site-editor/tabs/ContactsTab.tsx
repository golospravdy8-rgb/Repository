"use client";

import { useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { updateSiteTexts } from "@/actions/site-settings";
import type { SaveHandle } from "../SiteEditorClient";

const ContactsTab = forwardRef<SaveHandle, { settings: Record<string, string> }>(
  function ContactsTab({ settings }, ref) {
    const [pending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);

    const [title, setTitle] = useState(settings["contacts.title"] ?? "Баскетбол у Львові — Ліга ESCULAB");
    const [subtitle, setSubtitle] = useState(settings["contacts.subtitle"] ?? "Офіційна баскетбольна ліга міста Львова");
    const [address, setAddress] = useState(settings["contacts.address"] ?? "м. Львів, вул. Спортивна");
    const [email, setEmail] = useState(settings["contacts.email"] ?? "info@basket.lviv.ua");
    const [website, setWebsite] = useState(settings["contacts.website"] ?? "basket.lviv.ua");
    const [facebook, setFacebook] = useState(settings["contacts.facebook"] ?? "");
    const [instagram, setInstagram] = useState(settings["contacts.instagram"] ?? "");
    const [youtube, setYoutube] = useState(settings["contacts.youtube"] ?? "");
    const [cardNumber, setCardNumber] = useState(settings["donate.cardNumber"] ?? "");
    const [cardName, setCardName] = useState(settings["donate.cardName"] ?? "");
    const [cardBank, setCardBank] = useState(settings["donate.cardBank"] ?? "");
    const [donateLabel, setDonateLabel] = useState(settings["donate.label"] ?? "Допомогти клубу Donate");

    const handleSave = () => {
      startTransition(async () => {
        await updateSiteTexts({
          "contacts.title": title,
          "contacts.subtitle": subtitle,
          "contacts.address": address,
          "contacts.email": email,
          "contacts.website": website,
          "contacts.facebook": facebook,
          "contacts.instagram": instagram,
          "contacts.youtube": youtube,
          "donate.cardNumber": cardNumber,
          "donate.cardName": cardName,
          "donate.cardBank": cardBank,
          "donate.label": donateLabel,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    };

    useImperativeHandle(ref, () => ({ save: handleSave }));

    return (
      <div className="space-y-6">
        {/* Basic info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Назва організації</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Підзаголовок</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Адреса</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Сайт</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>

        {/* Social links */}
        <div className="border-t pt-5">
          <div className="text-sm font-semibold text-gray-700 mb-3">Соціальні мережі</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: "#1877f2" }}>
                <span className="w-4 h-4 rounded inline-block" style={{ backgroundColor: "#1877f2" }} />
                Facebook URL
              </label>
              <input
                type="url"
                placeholder="https://facebook.com/..."
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: "#e1306c" }}>
                <span className="w-4 h-4 rounded inline-block" style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }} />
                Instagram URL
              </label>
              <input
                type="url"
                placeholder="https://instagram.com/..."
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: "#ff0000" }}>
                <span className="w-4 h-4 rounded inline-block" style={{ backgroundColor: "#ff0000" }} />
                YouTube URL
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/..."
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
        </div>

        {/* Donate / Bank card */}
        <div className="border-t pt-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">❤️</span>
            <div className="text-sm font-semibold text-gray-700">Кнопка Donate — банківська картка</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Текст кнопки</label>
              <input
                type="text"
                value={donateLabel}
                onChange={(e) => setDonateLabel(e.target.value)}
                placeholder="Допомогти клубу Donate"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Номер картки</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4149 6090 1234 5678"
                maxLength={23}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <p className="text-xs text-gray-400 mt-1">16–19 цифр, пробіли допустимі</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Назва банку</label>
              <input
                type="text"
                value={cardBank}
                onChange={(e) => setCardBank(e.target.value)}
                placeholder="Monobank / ПриватБанк / ..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ім&apos;я власника картки</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Ivan Kovalenko"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* Card preview */}
          {cardNumber && (
            <div className="mt-4 p-4 rounded-xl text-white text-sm font-mono" style={{ background: "linear-gradient(135deg,#1a2744,#2d4a8a)", maxWidth: 280 }}>
              <div className="text-xs opacity-50 mb-2 font-sans tracking-widest">НОМЕР КАРТКИ</div>
              <div className="text-xl font-bold tracking-widest">{cardNumber}</div>
              {cardName && <div className="text-xs opacity-60 mt-2 font-sans tracking-wider">{cardName.toUpperCase()}</div>}
              {cardBank && <div className="text-xs opacity-50 mt-1 font-sans">{cardBank}</div>}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b font-medium uppercase tracking-wider">
            Попередній перегляд
          </div>
          <div className="p-5 space-y-3 bg-white">
            <div>
              <div className="font-bold text-gray-800">{title || "—"}</div>
              <div className="text-sm text-gray-500">{subtitle || "—"}</div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              {address && <span>📍 {address}</span>}
              {email && <span>📧 {email}</span>}
              {website && <span>🌐 {website}</span>}
            </div>
            <div className="flex gap-2 flex-wrap pt-1">
              <a
                href={facebook || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold"
                style={{ backgroundColor: "#1877f2", opacity: facebook ? 1 : 0.4 }}
              >
                Facebook
              </a>
              <a
                href={instagram || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold"
                style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", opacity: instagram ? 1 : 0.4 }}
              >
                Instagram
              </a>
              <a
                href={youtube || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold"
                style={{ backgroundColor: "#ff0000", opacity: youtube ? 1 : 0.4 }}
              >
                YouTube
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={pending}
            className="px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1a2744" }}
          >
            {pending ? "Зберігається..." : "Зберегти контакти"}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">✓ Збережено!</span>}
        </div>
      </div>
    );
  }
);

export default ContactsTab;
