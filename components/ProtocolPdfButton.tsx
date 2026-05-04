"use client";

import { useState } from "react";

interface ProtocolData {
  game: {
    id: number;
    scheduledAt: string;
    status: string;
    homeScore: number;
    awayScore: number;
    [key: string]: any;
  };
  homeTeam: {
    name: string;
    [key: string]: any;
  };
  awayTeam: {
    name: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ProtocolPdfButtonProps {
  data: ProtocolData;
}

export default function ProtocolPdfButton({ data }: ProtocolPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownloadPdf = async () => {
    setLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const element = document.getElementById("secretarial-protocol-print");
      if (!element) {
        alert("Протокол не знайдено на сторінці");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        onclone: (doc) => {
          const imgs = doc.querySelectorAll("img");
          imgs.forEach((img) => {
            img.style.display = "block";
          });
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      const filename = `fiba-protocol-${data.game.id}-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Помилка при генеруванні PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition"
    >
      {loading ? "Генерування..." : "📄 Завантажити протокол ФБУ (PDF)"}
    </button>
  );
}
