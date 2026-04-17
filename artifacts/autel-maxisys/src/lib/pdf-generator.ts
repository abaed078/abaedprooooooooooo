import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getWorkshopBrand } from "./workshop-brand";

export interface ReportData {
  title: string;
  type: string;
  vehicleName: string;
  vehicleVin?: string;
  vehicleOdometer?: number;
  shopName?: string;
  technicianName?: string;
  createdAt: string | Date;
  dtcCount: number;
  dtcCodes?: Array<{ code: string; description: string; severity: string; status: string }>;
  liveData?: Array<{ name: string; value: string; unit?: string; status?: string }>;
  healthScore?: number;
  notes?: string;
  recommendations?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  diagnostic: "Diagnostic Scan Report",
  pre_inspection: "Pre-Repair Inspection",
  post_repair: "Post-Repair Verification",
  full_inspection: "Comprehensive Inspection",
};

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  critical: [220, 38, 38],
  warning: [234, 179, 8],
  info: [59, 130, 246],
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [10, 15, 30];
  return [r, g, b];
}

function drawRoundedRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  r: number,
  style: "F" | "S" | "FD" = "F"
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

export function generateReportPDF(data: ReportData): void {
  const brand = getWorkshopBrand();
  const shopName = data.shopName || brand.shopName;
  const techName = data.technicianName || brand.technicianName;
  const primaryRgb = hexToRgb(brand.primaryColor);
  const accentRgb = hexToRgb(brand.accentColor);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - 2 * margin;

  // ── Header gradient band ──────────────────────────────────────────────────
  const headerH = 52;
  doc.setFillColor(...primaryRgb);
  doc.rect(0, 0, pageW, headerH, "F");

  // Accent stripe
  doc.setFillColor(...accentRgb);
  doc.rect(0, headerH - 3, pageW, 3, "F");

  // Logo area (left side)
  if (brand.logoDataUrl && brand.logoDataUrl.startsWith("data:image")) {
    try {
      const ext = brand.logoDataUrl.includes("png") ? "PNG" : "JPEG";
      doc.addImage(brand.logoDataUrl, ext, margin, 8, 24, 24);
    } catch {}
    // Shop name beside logo
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(shopName, margin + 28, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...accentRgb);
    doc.text(brand.tagline || "Professional Automotive Diagnostics", margin + 28, 25);
  } else {
    // Text-only logo
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(shopName, margin, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...accentRgb);
    doc.text(brand.tagline || "Professional Automotive Diagnostics", margin, 26);
  }

  // Powered by Autel (right, small)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 150, 200);
  doc.text("Powered by Autel MaxiSYS MS Ultra S2", pageW - margin, 10, { align: "right" });

  // Contact info right side
  doc.setFontSize(8);
  doc.setTextColor(200, 220, 255);
  const contactLines: string[] = [];
  if (brand.phone) contactLines.push(`📞 ${brand.phone}`);
  if (brand.email) contactLines.push(`✉  ${brand.email}`);
  if (brand.address) contactLines.push(`📍 ${brand.address}`);
  contactLines.forEach((line, idx) => {
    doc.text(line, pageW - margin, 20 + idx * 6, { align: "right" });
  });

  // License / Technician row (lower left)
  const techY = headerH - 12;
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 240);
  if (techName) doc.text(`Technician: ${techName}`, margin, techY);
  if (brand.licenseNumber) {
    doc.text(`License: ${brand.licenseNumber}`, margin, techY + 5);
  }
  const dateStr = new Date(data.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(`Report Date: ${dateStr}`, pageW - margin, techY, { align: "right" });

  // ── Report type banner ────────────────────────────────────────────────────
  let y = headerH + 10;
  doc.setFillColor(...accentRgb, 0.12 as any);
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  drawRoundedRect(doc, margin, y, contentW, 12, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    (TYPE_LABELS[data.type] || data.type).toUpperCase(),
    pageW / 2, y + 8, { align: "center" }
  );
  y += 18;

  // Report title
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.title, margin, y);
  y += 10;

  // ── Vehicle + Health Score columns ────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Vehicle info block (left 65%)
  const vehicleW = contentW * 0.65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text("Vehicle Information", margin, y);

  const vehicleRows: string[][] = [
    ["Vehicle", data.vehicleName],
    ["VIN", data.vehicleVin || "Not recorded"],
    ["Odometer", data.vehicleOdometer ? `${data.vehicleOdometer.toLocaleString()} km` : "Not recorded"],
  ];

  autoTable(doc, {
    startY: y + 2,
    head: [],
    body: vehicleRows,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [80, 80, 80], cellWidth: 30 },
      1: { textColor: [20, 20, 20] },
    },
    margin: { left: margin, right: margin + contentW - vehicleW },
  });

  // Health score circle (right side)
  if (data.healthScore !== undefined) {
    const circX = pageW - margin - 22;
    const circY = y + 14;
    const score = data.healthScore;
    const scoreColor: [number, number, number] =
      score >= 80 ? [34, 197, 94] : score >= 60 ? [234, 179, 8] : [220, 38, 38];

    doc.setFillColor(...scoreColor);
    doc.circle(circX, circY, 14, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(circX, circY, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...scoreColor);
    doc.text(String(score), circX, circY + 1, { align: "center", baseline: "middle" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Health", circX, circY + 16, { align: "center" });
    doc.text("Score", circX, circY + 20, { align: "center" });
  }

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Status summary banner ─────────────────────────────────────────────────
  const statusColor: [number, number, number] = data.dtcCount > 0 ? [220, 38, 38] : [34, 197, 94];
  doc.setFillColor(...statusColor);
  drawRoundedRect(doc, margin, y, contentW, 14, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const statusText = data.dtcCount > 0
    ? `  ${data.dtcCount} Diagnostic Trouble Code${data.dtcCount !== 1 ? "s" : ""} Found`
    : "  No Fault Codes Detected — Vehicle Systems OK";
  doc.text(statusText, pageW / 2, y + 9, { align: "center" });
  y += 20;

  // ── DTC table ─────────────────────────────────────────────────────────────
  if (data.dtcCodes && data.dtcCodes.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Fault Code Details", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Code", "Description", "Severity", "Status"]],
      body: data.dtcCodes.map(c => [
        c.code,
        c.description,
        c.severity.toUpperCase(),
        c.status,
      ]),
      theme: "striped",
      headStyles: {
        fillColor: primaryRgb,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 22 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 24 },
        3: { cellWidth: 24 },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 2 && hookData.section === "body") {
          const sev = hookData.cell.text[0]?.toLowerCase();
          hookData.cell.styles.textColor = SEVERITY_COLORS[sev] || [100, 100, 100];
          hookData.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  if (data.recommendations && data.recommendations.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Recommendations", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    data.recommendations.forEach((rec, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, contentW - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 5 + 2;
    });
    y += 4;
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(245, 248, 255);
    drawRoundedRect(doc, margin, y, contentW, 8, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Notes", margin + 3, y + 5.5);
    y += 12;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, contentW - 4);
    doc.text(noteLines, margin + 2, y);
    y += noteLines.length * 5 + 6;
  }

  // ── Live data table ───────────────────────────────────────────────────────
  if (data.liveData && data.liveData.length > 0) {
    if (y > 210) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Live Sensor Data (at time of scan)", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Parameter", "Reading", "Unit", "Status"]],
      body: data.liveData.map(d => [
        d.name, d.value, d.unit || "—", d.status || "normal"
      ]),
      theme: "striped",
      headStyles: {
        fillColor: primaryRgb,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Signature block ───────────────────────────────────────────────────────
  const sigY = Math.max(y + 10, pageH - 50);
  if (sigY < pageH - 20) {
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, sigY, margin + 60, sigY);
    doc.line(pageW - margin - 60, sigY, pageW - margin, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Technician Signature", margin, sigY + 5);
    doc.text("Customer Signature", pageW - margin, sigY + 5, { align: "right" });
    if (techName) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(techName, margin, sigY - 4);
    }
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footY = pageH - 8;
    doc.setFillColor(...primaryRgb);
    doc.rect(0, footY - 6, pageW, 14, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 180, 220);
    const footLeft = brand.website
      ? `${shopName}  •  ${brand.website}`
      : `${shopName}  •  Powered by Autel MaxiSYS MS Ultra S2`;
    doc.text(footLeft, margin, footY);
    doc.text(`Page ${i} / ${pageCount}`, pageW - margin, footY, { align: "right" });
  }

  const safeName = data.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
