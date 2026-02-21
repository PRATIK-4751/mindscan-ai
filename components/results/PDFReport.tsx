"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PDFReportProps {
  targetId: string;
}

export default function PDFReport({ targetId }: PDFReportProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    setLoading(true);
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#0a0a0a" });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imageData, "PNG", 0, 0, width, height);
    pdf.save("mindscan-report.pdf");
    setLoading(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="font-display border border-[var(--cream)] px-6 py-3 text-sm uppercase tracking-[0.35em] text-[var(--cream)] disabled:opacity-40"
    >
      [ PRINT REPORT ]
    </button>
  );
}
