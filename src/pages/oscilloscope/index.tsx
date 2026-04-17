import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Zap, AlertTriangle, CheckCircle2, Activity,
  RotateCcw, Play, Square, Info, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, Bookmark, BookmarkCheck, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Sensor definitions & waveform generators
───────────────────────────────────────────── */
interface Sensor {
  id: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  minY: number;
  maxY: number;
  tScale: number;       // full screen = tScale * 2π radians
  noiseLevel: number;
  color: string;
  healthy: (t: number) => number;
  fault: (t: number) => number;
  faultDescAr: string;
  faultDescEn: string;
  descAr: string;
  descEn: string;
  tipsAr: string[];
  tipsEn: string[];
  timebase: string;
  voltDiv: string;
  category: string;
}

const SENSORS: Sensor[] = [
  {
    id: "o2", nameAr: "مستشعر O2 (ضيق النطاق)", nameEn: "O2 Sensor (Narrowband)",
    unit: "V", minY: 0, maxY: 1, tScale: 4, noiseLevel: 0.012, color: "#22c55e",
    timebase: "200ms/div", voltDiv: "0.1V/div", category: "emissions",
    descAr: "يقيس نسبة الأكسجين في العادم لتنظيم الوقود", descEn: "Measures exhaust O2 ratio for closed-loop fuel control",
    healthy: (t) => Math.min(0.95, Math.max(0.05, 0.45 + 0.43 * Math.sin(t * 2.9 + Math.sin(t * 0.5) * 0.3))),
    fault:   (t) => 0.13 + 0.04 * Math.sin(t * 0.4),
    faultDescAr: "متوقف عند قيمة الفقر (0.13V) — مستشعر معطل أو خلل في الوقود",
    faultDescEn: "Stuck lean (0.13V) — faulty sensor or fuel delivery issue",
    tipsAr: ["يجب أن يتذبذب بين 0.1 و0.9 فولت", "تردد التذبذب > 2 هيرتز عند الخمول", "إذا كان ثابتاً → استبدل المستشعر"],
    tipsEn: ["Should oscillate 0.1–0.9V", "Frequency >2Hz at idle", "Flat signal → replace sensor"],
  },
  {
    id: "injector", nameAr: "نبضة الحاقن", nameEn: "Fuel Injector Pulse",
    unit: "V", minY: -2, maxY: 14, tScale: 6, noiseLevel: 0.08, color: "#f97316",
    timebase: "5ms/div", voltDiv: "5V/div", category: "fuel",
    descAr: "إشارة فتح وإغلاق حاقن الوقود الكهرومغناطيسي", descEn: "Electromagnetic fuel injector open/close signal",
    healthy: (t) => {
      const pos = ((t % (2 * Math.PI)) / (2 * Math.PI));
      if (pos < 0.18) return 0.3;
      if (pos < 0.21) return -1.4;
      return 12.8 + 0.3 * Math.sin(t * 50);
    },
    fault: (t) => {
      const pos = ((t % (2 * Math.PI)) / (2 * Math.PI));
      if (pos < 0.42) return 0.3;
      if (pos < 0.45) return -1.4;
      return 12.8 + 0.3 * Math.sin(t * 50);
    },
    faultDescAr: "نبضة طويلة جداً (إمداد زائد بالوقود) — حاقن عالق أو ECU معطل",
    faultDescEn: "Excessive pulse width (rich flooding) — stuck injector or ECU fault",
    tipsAr: ["عرض النبضة 1.5-4ms عند الخمول", "ارتفاع سريع عند إغلاق الحاقن", "انخفاض بطيء → خلل في اللفافة"],
    tipsEn: ["Pulse width 1.5–4ms at idle", "Sharp spike on injector closure", "Slow decay → winding fault"],
  },
  {
    id: "ckp", nameAr: "مستشعر CKP (العمود المرفقي)", nameEn: "CKP Crankshaft Position",
    unit: "V", minY: -0.5, maxY: 5.5, tScale: 3, noiseLevel: 0.04, color: "#3b82f6",
    timebase: "10ms/div", voltDiv: "2V/div", category: "engine",
    descAr: "نبضات عجلة الإسناد 60-2 للكشف عن موضع العمود المرفقي", descEn: "60-2 reluctor wheel pulses for crankshaft position",
    healthy: (t) => {
      const teeth = 58, total = 60;
      const cycle = ((t % (2 * Math.PI)) / (2 * Math.PI));
      const idx = Math.floor(cycle * total);
      if (idx >= teeth) return 0.1;
      const within = (cycle * total) % 1;
      return within < 0.48 ? 5.0 : 0.1;
    },
    fault: (t) => {
      const teeth = 58, total = 60;
      const cycle = ((t % (2 * Math.PI)) / (2 * Math.PI));
      const idx = Math.floor(cycle * total);
      if (idx >= teeth) return 0.1;
      if (idx % 9 === 7) return 0.1 + Math.random() * 2; // erratic
      const within = (cycle * total) % 1;
      return within < 0.48 ? 5.0 : 0.1;
    },
    faultDescAr: "نبضات غير منتظمة — تلف في عجلة الإسناد أو مستشعر CKP مغناطيسي",
    faultDescEn: "Erratic pulses — damaged reluctor wheel or faulty CKP sensor",
    tipsAr: ["نبضات منتظمة مع فجوة مرجعية واضحة", "الفجوة تقع عند TDC", "نبضات ناقصة → تحقق من عجلة الإسناد"],
    tipsEn: ["Regular pulses with clear reference gap", "Gap appears at TDC", "Missing pulses → check reluctor wheel"],
  },
  {
    id: "tps", nameAr: "مستشعر موضع الخانق TPS", nameEn: "Throttle Position Sensor",
    unit: "V", minY: 0, maxY: 5, tScale: 2, noiseLevel: 0.015, color: "#a855f7",
    timebase: "100ms/div", voltDiv: "1V/div", category: "engine",
    descAr: "جهد خطي يمثل زاوية فتح صمام الخانق", descEn: "Linear voltage representing throttle plate opening angle",
    healthy: (t) => 0.5 + 2.0 * (0.5 + 0.5 * Math.sin(t * 0.28 + Math.sin(t * 0.1) * 0.5)),
    fault: (t) => {
      const base = 0.5 + 2.0 * (0.5 + 0.5 * Math.sin(t * 0.28));
      const pos = ((t % (2 * Math.PI)) / (2 * Math.PI));
      if (pos > 0.42 && pos < 0.46) return 0; // voltage dropout
      return base;
    },
    faultDescAr: "انقطاع مفاجئ في الإشارة — خلل في مقاومة التمرير أو أسلاك",
    faultDescEn: "Signal dropout — worn resistive track or wiring fault",
    tipsAr: ["0.5V في وضع الإغلاق، 4.5V عند الفتح الكامل", "لا توجد قفزات مفاجئة", "الانقطاع → تحقق من الموصل"],
    tipsEn: ["0.5V closed, 4.5V wide open throttle", "No erratic jumps", "Dropout → check connector"],
  },
  {
    id: "maf", nameAr: "مستشعر تدفق الهواء MAF", nameEn: "Mass Air Flow Sensor",
    unit: "V", minY: 0, maxY: 5, tScale: 3, noiseLevel: 0.025, color: "#06b6d4",
    timebase: "50ms/div", voltDiv: "1V/div", category: "engine",
    descAr: "يقيس كمية الهواء الداخلة للمحرك بالجرام في الثانية", descEn: "Measures intake air mass in grams per second",
    healthy: (t) => 1.05 + 0.35 * Math.sin(t * 0.55) + 0.12 * Math.sin(t * 2.8),
    fault:   (t) => 0.38 + 0.12 * Math.sin(t * 0.55) + 0.05 * Math.sin(t * 2.8),
    faultDescAr: "قراءة منخفضة — مستشعر MAF متسخ أو معطل",
    faultDescEn: "Low reading — contaminated or failed MAF sensor",
    tipsAr: ["0.8-1.2V عند الخمول", "يرتفع مع زيادة دورات المحرك", "منخفض → نظّف بمنظف MAF"],
    tipsEn: ["0.8–1.2V at idle", "Rises proportionally with RPM", "Low reading → clean with MAF cleaner"],
  },
  {
    id: "battery", nameAr: "بطارية / مولد", nameEn: "Battery / Alternator",
    unit: "V", minY: 10, maxY: 16, tScale: 8, noiseLevel: 0.02, color: "#eab308",
    timebase: "10ms/div", voltDiv: "1V/div", category: "electrical",
    descAr: "جهد الشبكة الكهربائية للسيارة مع رموز المولد", descEn: "Vehicle electrical system voltage with alternator ripple",
    healthy: (t) => 14.18 + 0.12 * Math.sin(t * 38) + 0.06 * Math.sin(t * 114),
    fault:   (t) => 13.05 + 1.15 * Math.sin(t * 38) + 0.55 * Math.sin(t * 114) + 0.3 * Math.sin(t * 190),
    faultDescAr: "تموّج مرتفع — ثنائيات مولد معطلة",
    faultDescEn: "Excessive ripple — failed alternator diodes",
    tipsAr: ["13.8-14.4V عند الخمول", "تموّج أقل من 0.5V PP", "تموّج عالٍ → ثنائيات معطلة"],
    tipsEn: ["13.8–14.4V at idle", "Ripple <0.5V peak-to-peak", "High ripple → failed diodes"],
  },
  {
    id: "knock", nameAr: "مستشعر الطرق", nameEn: "Knock Sensor",
    unit: "mV", minY: -800, maxY: 800, tScale: 5, noiseLevel: 10, color: "#ef4444",
    timebase: "5ms/div", voltDiv: "200mV/div", category: "engine",
    descAr: "يكتشف الاحتراق غير الطبيعي (الطرق) بالاهتزازات الدقيقة", descEn: "Detects abnormal combustion (knock) via piezoelectric vibration",
    healthy: (t) => 30 * Math.sin(t * 80) * Math.exp(-((t % 0.8) * 6)),
    fault:   (t) => {
      const base = 30 * Math.sin(t * 80) * Math.exp(-((t % 0.8) * 6));
      const knock = (Math.floor(t * 1.5) % 4 === 0)
        ? 650 * Math.sin(t * 200) * Math.exp(-((t % 0.5) * 12)) : 0;
      return base + knock;
    },
    faultDescAr: "نوبات طرق عالية — احتراق مبكر أو وقود منخفض الأوكتين",
    faultDescEn: "High amplitude knock bursts — pre-ignition or low octane fuel",
    tipsAr: ["اتساع منخفض في حالة سليمة", "نوبات بالتزامن مع الاشتعال", "طرق → نوبات عالية المتكررة"],
    tipsEn: ["Low amplitude normally", "Bursts synchronized with ignition", "Knock → high amplitude bursts"],
  },
  {
    id: "abs", nameAr: "مستشعر سرعة عجلة ABS", nameEn: "ABS Wheel Speed Sensor",
    unit: "V", minY: -0.2, maxY: 5.2, tScale: 4, noiseLevel: 0.02, color: "#f43f5e",
    timebase: "20ms/div", voltDiv: "2V/div", category: "safety",
    descAr: "موجات مربعة تتناسب مع سرعة العجلة (Hall Effect)", descEn: "Square waves proportional to wheel speed (Hall Effect type)",
    healthy: (t) => {
      const freq = 4.5;
      const pos = ((t * freq) % (2 * Math.PI)) / (2 * Math.PI);
      return pos < 0.50 ? 5.0 : 0.1;
    },
    fault: (t) => {
      const freq = 4.5;
      const pos = ((t * freq) % (2 * Math.PI)) / (2 * Math.PI);
      const overall = ((t) % (2 * Math.PI)) / (2 * Math.PI);
      if (overall > 0.55 && overall < 0.78) return 0.1 + Math.random() * 0.4; // dead zone noise
      return pos < 0.50 ? 5.0 : 0.1;
    },
    faultDescAr: "منطقة ميتة في الإشارة — مستشعر تالف أو حلقة تروس ABS مكسورة",
    faultDescEn: "Dead zone in signal — damaged sensor or broken ABS tone ring",
    tipsAr: ["نبضات منتظمة مع زيادة السرعة", "لا انقطاعات في الإشارة", "منطقة ميتة → فحص الحلقة"],
    tipsEn: ["Regular pulses, frequency increases with speed", "No signal dropouts", "Dead zone → inspect tone ring"],
  },
  {
    id: "ect", nameAr: "مستشعر حرارة المبرد ECT", nameEn: "Coolant Temp Sensor (ECT)",
    unit: "V", minY: 0, maxY: 5, tScale: 2, noiseLevel: 0.006, color: "#fb923c",
    timebase: "1s/div", voltDiv: "1V/div", category: "temperature",
    descAr: "مقاومة NTC تتناسب عكسياً مع درجة حرارة المبرد", descEn: "NTC thermistor — voltage inversely proportional to coolant temp",
    healthy: (t) => 0.65 + 0.08 * Math.sin(t * 0.06),
    fault:   (t) => 4.72 + 0.04 * (Math.random() - 0.5),
    faultDescAr: "عالق عند 4.72V — دائرة مفتوحة (المستشعر يُبلّغ عن برودة شديدة)",
    faultDescEn: "Stuck at 4.72V — open circuit (sensor reporting extreme cold)",
    tipsAr: ["4.5-4.8V بارداً، 0.5-0.8V ساخناً (88°C)", "تغيير بطيء وسلس", "قيمة ثابتة → تحقق من الموصل"],
    tipsEn: ["4.5–4.8V cold, 0.5–0.8V hot (88°C)", "Slow smooth change during warm-up", "Static value → check connector"],
  },
  {
    id: "egr", nameAr: "موضع صمام EGR", nameEn: "EGR Valve Position",
    unit: "V", minY: 0, maxY: 5, tScale: 2, noiseLevel: 0.02, color: "#84cc16",
    timebase: "200ms/div", voltDiv: "1V/div", category: "emissions",
    descAr: "موضع صمام إعادة تدوير غاز العادم لتقليل NOx", descEn: "Exhaust gas recirculation valve position for NOx reduction",
    healthy: (t) => 1.4 + 1.3 * (0.5 + 0.5 * Math.sin(t * 0.38 + Math.sin(t * 0.1) * 0.2)),
    fault:   (t) => 3.85 + 0.04 * Math.random(),
    faultDescAr: "صمام عالق في الفتح — رواسب الكربون أو ملف معطل",
    faultDescEn: "Valve stuck open — carbon buildup or failed solenoid",
    tipsAr: ["1.0-1.5V عند الإغلاق", "يرتفع مع الحمل حتى 4.0V", "ثابت → صمام عالق"],
    tipsEn: ["1.0–1.5V at closed position", "Rises with engine load to ~4V", "Static → stuck valve"],
  },
];

/* ─────────────────────────────────────────────
   Canvas drawing
───────────────────────────────────────────── */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  sensor: Sensor,
  faultMode: boolean,
  timeOffset: number,
  running: boolean,
  mousePos: { x: number; y: number } | null = null,
  sensor2: Sensor | null = null,
  sensor2FaultMode: boolean = false,
  savedRef: number[] | null = null,
  showRef: boolean = false
) {
  // Background
  ctx.fillStyle = "#030b03";
  ctx.fillRect(0, 0, W, H);

  // Grid
  const COLS = 10, ROWS = 8;
  for (let i = 0; i <= COLS; i++) {
    const x = (i / COLS) * W;
    ctx.strokeStyle = i === COLS / 2 ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.09)";
    ctx.lineWidth = i === COLS / 2 ? 1.5 : 0.8;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    const y = (i / ROWS) * H;
    ctx.strokeStyle = i === ROWS / 2 ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.09)";
    ctx.lineWidth = i === ROWS / 2 ? 1.5 : 0.8;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Tick marks
  ctx.strokeStyle = "rgba(34,197,94,0.12)"; ctx.lineWidth = 0.5;
  for (let i = 0; i <= COLS * 5; i++) {
    const x = (i / (COLS * 5)) * W;
    ctx.beginPath(); ctx.moveTo(x, H / 2 - 3); ctx.lineTo(x, H / 2 + 3); ctx.stroke();
  }
  for (let i = 0; i <= ROWS * 5; i++) {
    const y = (i / (ROWS * 5)) * H;
    ctx.beginPath(); ctx.moveTo(W / 2 - 3, y); ctx.lineTo(W / 2 + 3, y); ctx.stroke();
  }

  const margin = 0.08;
  const N = 600;
  const toY = (v: number) => {
    const norm = (v - sensor.minY) / (sensor.maxY - sensor.minY);
    return H * (1 - margin) - norm * H * (1 - 2 * margin);
  };

  // Reference waveform (healthy) - faded dashed
  ctx.strokeStyle = "rgba(34,197,94,0.18)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / N) * W;
    const t = (i / N) * sensor.tScale * Math.PI * 2;
    const v = sensor.healthy(t);
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // User-saved reference waveform overlay (violet dashed)
  if (savedRef && showRef && savedRef.length > 0) {
    const refN = savedRef.length;
    ctx.strokeStyle = "rgba(139, 92, 246, 0.55)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i < refN; i++) {
      const x = (i / refN) * W;
      const y = toY(savedRef[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Label
    ctx.fillStyle = "rgba(139, 92, 246, 0.7)";
    ctx.font = "bold 9px monospace";
    ctx.fillText("REF", 6, 14);
  }

  if (!running) return;

  // Live waveform with glow
  const fn = faultMode ? sensor.fault : sensor.healthy;
  const liveColor = faultMode ? "#ef4444" : sensor.color;

  ctx.strokeStyle = liveColor;
  ctx.lineWidth = 2.2;
  ctx.shadowColor = liveColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / N) * W;
    const t = (i / N) * sensor.tScale * Math.PI * 2 + timeOffset;
    const noise = (Math.random() - 0.5) * sensor.noiseLevel;
    const v = Math.min(sensor.maxY, Math.max(sensor.minY, fn(t) + noise));
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Afterglow trail (faded version slightly behind)
  ctx.strokeStyle = liveColor.replace(")", ", 0.2)").replace("rgb", "rgba");
  ctx.lineWidth = 4;
  ctx.shadowColor = liveColor;
  ctx.shadowBlur = 20;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const x = (i / N) * W;
    const t = (i / N) * sensor.tScale * Math.PI * 2 + timeOffset - 0.15;
    const v = Math.min(sensor.maxY, Math.max(sensor.minY, fn(t)));
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Trigger line
  ctx.strokeStyle = "rgba(255, 220, 0, 0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  const trigY = toY((sensor.minY + sensor.maxY) / 2);
  ctx.beginPath(); ctx.moveTo(0, trigY); ctx.lineTo(W, trigY); ctx.stroke();
  ctx.setLineDash([]);

  // Voltage scale labels on Y axis
  ctx.font = "9px 'Courier New', monospace";
  ctx.fillStyle = "rgba(34,197,94,0.45)";
  ctx.textAlign = "left";
  const ROWS_V = 8;
  for (let i = 0; i <= ROWS_V; i++) {
    const v = sensor.minY + (1 - i / ROWS_V) * (sensor.maxY - sensor.minY);
    const y = (i / ROWS_V) * H;
    ctx.fillText(`${v.toFixed(sensor.maxY - sensor.minY < 2 ? 2 : 1)}`, 4, y + 10);
  }

  // ─── CH2: second channel overlay ───────────────
  if (sensor2) {
    const fn2 = sensor2FaultMode ? sensor2.fault : sensor2.healthy;
    const ch2Color = "#22d3ee"; // cyan

    // Normalize sensor2 values to sensor1 Y-axis space for visual comparison
    const toY2 = (v: number) => {
      const margin = 0.08;
      const s2Range = sensor2.maxY - sensor2.minY;
      const s1Range = sensor.maxY - sensor.minY;
      const norm = (v - sensor2.minY) / (s2Range || 1); // 0..1
      const v1 = sensor.minY + norm * s1Range; // map to s1 domain
      return H * (margin + (1 - 2 * margin) * (1 - (v1 - sensor.minY) / (s1Range || 1)));
    };

    // CH2 label in corner
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillStyle = ch2Color;
    ctx.textAlign = "right";
    ctx.fillText(`CH2: ${sensor2.nameEn}`, W - 8, 20);

    // Main CH2 waveform
    ctx.strokeStyle = ch2Color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = ch2Color;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    const N2 = Math.min(W, 1000);
    for (let i = 0; i < N2; i++) {
      const x = (i / N2) * W;
      const t2 = (i / N2) * sensor2.tScale * Math.PI * 2 + timeOffset;
      const noise2 = (Math.random() - 0.5) * sensor2.noiseLevel;
      const v2 = Math.min(sensor2.maxY, Math.max(sensor2.minY, fn2(t2) + noise2));
      const yy = toY2(v2);
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }

  // CH1 label
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.fillStyle = sensor2 ? "rgba(34,197,94,0.9)" : "transparent";
  ctx.textAlign = "right";
  ctx.fillText(`CH1: ${sensor.nameEn}`, sensor2 ? W - 8 : 0, 36);
  ctx.textAlign = "left";

  // Mouse crosshair
  if (mousePos) {
    const { x, y } = mousePos;
    const margin2 = 0.08;
    const voltage = sensor.maxY - ((y / H) - margin2) / (1 - 2 * margin2) * (sensor.maxY - sensor.minY);
    const clampedV = Math.max(sensor.minY, Math.min(sensor.maxY, voltage));

    // Crosshair lines
    ctx.strokeStyle = "rgba(255, 230, 50, 0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.setLineDash([]);

    // Dot
    ctx.fillStyle = "#ffe84d";
    ctx.shadowColor = "#ffe84d";
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.shadowBlur = 0;

    // Voltage readout
    const vLabel = `${clampedV.toFixed(sensor.maxY - sensor.minY < 5 ? 3 : 2)} ${sensor.unit}`;
    ctx.font = "bold 11px 'Courier New', monospace";
    const tw = ctx.measureText(vLabel).width;
    const bx = x + 10 < W - tw - 16 ? x + 10 : x - tw - 16;
    const by = y > 30 ? y - 10 : y + 22;
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(bx - 5, by - 14, tw + 10, 20);
    ctx.strokeStyle = "rgba(255,232,77,0.4)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(bx - 5, by - 14, tw + 10, 20);
    ctx.fillStyle = "#ffe84d";
    ctx.textAlign = "left";
    ctx.fillText(vLabel, bx, by);
  }
}

/* ─────────────────────────────────────────────
   Measurement computation
───────────────────────────────────────────── */
function computeMeasurements(sensor: Sensor, faultMode: boolean, t: number) {
  const fn = faultMode ? sensor.fault : sensor.healthy;
  const samples = Array.from({ length: 500 }, (_, i) => fn((i / 500) * sensor.tScale * Math.PI * 2 + t));
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  // Rough frequency: count zero-crossings
  const mid = (sensor.minY + sensor.maxY) / 2;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] - mid) * (samples[i] - mid) < 0) crossings++;
  }
  const freq = (crossings / 2).toFixed(1);
  return { min: min.toFixed(2), max: max.toFixed(2), avg: avg.toFixed(2), freq };
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function Oscilloscope() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [activeSensor, setActiveSensor] = useState<Sensor>(SENSORS[0]);
  const [faultMode, setFaultMode] = useState(false);
  const [running, setRunning] = useState(true);
  const [measurements, setMeasurements] = useState({ min: "0.00", max: "0.00", avg: "0.00", freq: "0.0" });
  const [sensorPage, setSensorPage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [savedRef, setSavedRef] = useState<number[] | null>(null);
  const [showRefOverlay, setShowRefOverlay] = useState(false);

  // CH2 state
  const [sensor2, setSensor2] = useState<Sensor | null>(null);
  const [faultMode2, setFaultMode2] = useState(false);
  const [showCh2Picker, setShowCh2Picker] = useState(false);
  const [measurements2, setMeasurements2] = useState({ min: "0.00", max: "0.00", avg: "0.00", freq: "0.0" });

  // CH3 state
  const [sensor3, setSensor3] = useState<Sensor | null>(null);
  const [faultMode3, setFaultMode3] = useState(false);
  const [showCh3Picker, setShowCh3Picker] = useState(false);

  // CH4 state
  const [sensor4, setSensor4] = useState<Sensor | null>(null);
  const [faultMode4, setFaultMode4] = useState(false);
  const [showCh4Picker, setShowCh4Picker] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const measureRef = useRef<number>(0);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const [crosshairVoltage, setCrosshairVoltage] = useState<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePosRef.current = { x, y };
    const margin2 = 0.08;
    const voltage = activeSensor.maxY - ((y / rect.height) - margin2) / (1 - 2 * margin2) * (activeSensor.maxY - activeSensor.minY);
    setCrosshairVoltage(Math.max(activeSensor.minY, Math.min(activeSensor.maxY, voltage)));
  }, [activeSensor]);

  const handleMouseLeave = useCallback(() => {
    mousePosRef.current = null;
    setCrosshairVoltage(null);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    if (running) timeRef.current += 0.022;
    drawFrame(ctx, W, H, activeSensor, faultMode, timeRef.current, running, mousePosRef.current, sensor2, faultMode2, savedRef, showRefOverlay);

    // ─── CH3 overlay ───────────────────────────────────────────
    if (running && sensor3) {
      const fn3 = faultMode3 ? sensor3.fault : sensor3.healthy;
      const ch3Color = "#eab308";
      const toY3 = (v: number) => {
        const margin = 0.08;
        const norm = (v - sensor3.minY) / ((sensor3.maxY - sensor3.minY) || 1);
        const v1 = activeSensor.minY + norm * (activeSensor.maxY - activeSensor.minY);
        return H * (margin + (1 - 2 * margin) * (1 - (v1 - activeSensor.minY) / ((activeSensor.maxY - activeSensor.minY) || 1)));
      };
      ctx.strokeStyle = ch3Color; ctx.lineWidth = 1.8;
      ctx.shadowColor = ch3Color; ctx.shadowBlur = 8; ctx.globalAlpha = 0.9;
      ctx.beginPath();
      for (let i = 0; i < W; i++) {
        const t3 = (i / W) * sensor3.tScale * Math.PI * 2 + timeRef.current;
        const noise = (Math.sin(i + timeRef.current) * 0.5) * sensor3.noiseLevel; // Use sin as pseudo-noise for purity
        const v3 = Math.min(sensor3.maxY, Math.max(sensor3.minY, fn3(t3) + noise));
        const y3 = toY3(v3);
        if (i === 0) ctx.moveTo(i, y3);
        else ctx.lineTo(i, y3);
      }
      ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.font = "bold 10px 'Courier New', monospace"; ctx.fillStyle = ch3Color;
      ctx.textAlign = "right"; ctx.fillText(`CH3: ${sensor3.nameEn}`, W - 8, 52); ctx.textAlign = "left";
    }

    // ─── CH4 overlay ───────────────────────────────────────────
    if (running && sensor4) {
      const fn4 = faultMode4 ? sensor4.fault : sensor4.healthy;
      const ch4Color = "#d946ef";
      const toY4 = (v: number) => {
        const margin = 0.08;
        const norm = (v - sensor4.minY) / ((sensor4.maxY - sensor4.minY) || 1);
        const v1 = activeSensor.minY + norm * (activeSensor.maxY - activeSensor.minY);
        return H * (margin + (1 - 2 * margin) * (1 - (v1 - activeSensor.minY) / ((activeSensor.maxY - activeSensor.minY) || 1)));
      };
      ctx.strokeStyle = ch4Color; ctx.lineWidth = 1.8;
      ctx.shadowColor = ch4Color; ctx.shadowBlur = 8; ctx.globalAlpha = 0.9;
      ctx.beginPath();
      for (let i = 0; i < W; i++) {
        const t4 = (i / W) * sensor4.tScale * Math.PI * 2 + timeRef.current;
        const noise4 = (Math.cos(i + timeRef.current) * 0.5) * sensor4.noiseLevel; // Use cos as pseudo-noise for purity
        const v4 = Math.min(sensor4.maxY, Math.max(sensor4.minY, fn4(t4) + noise4));
        const y4 = toY4(v4);
        if (i === 0) ctx.moveTo(i, y4);
        else ctx.lineTo(i, y4);
      }
      ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.font = "bold 10px 'Courier New', monospace"; ctx.fillStyle = ch4Color;
      ctx.textAlign = "right"; ctx.fillText(`CH4: ${sensor4.nameEn}`, W - 8, 68); ctx.textAlign = "left";
    }

    measureRef.current++;
    if (measureRef.current % 18 === 0) {
      setMeasurements(computeMeasurements(activeSensor, faultMode, timeRef.current));
      if (sensor2) setMeasurements2(computeMeasurements(sensor2, faultMode2, timeRef.current));
    }
  }, [activeSensor, faultMode, running, sensor2, faultMode2, sensor3, faultMode3, sensor4, faultMode4, savedRef, showRefOverlay]);

  useEffect(() => {
    const runner = () => {
      draw();
      animIdRef.current = requestAnimationFrame(runner);
    };
    animIdRef.current = requestAnimationFrame(runner);
    return () => cancelAnimationFrame(animIdRef.current);
  }, [draw]);

  // ResizeObserver for proper canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const handleSensorChange = (s: Sensor) => {
    setActiveSensor(s);
    setFaultMode(false);
    timeRef.current = 0;
  };

  const SENSORS_PER_PAGE = 5;
  const totalPages = Math.ceil(SENSORS.length / SENSORS_PER_PAGE);
  const visibleSensors = SENSORS.slice(sensorPage * SENSORS_PER_PAGE, (sensorPage + 1) * SENSORS_PER_PAGE);

  const CATEGORY_COLORS: Record<string, string> = {
    engine: "text-blue-400 border-blue-500/30",
    fuel: "text-orange-400 border-orange-500/30",
    temperature: "text-red-400 border-red-500/30",
    emissions: "text-green-400 border-green-500/30",
    electrical: "text-yellow-400 border-yellow-500/30",
    safety: "text-pink-400 border-pink-500/30",
  };

  const containerCls = fullscreen
    ? "fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#080b12]"
    : "h-full flex flex-col overflow-hidden bg-[#080b12]";

  return (
    <div className={containerCls}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-green-400" />
          <h1 className="text-lg font-black text-white">{isAr ? "عارض موجات الأوسيلوسكوب" : "Oscilloscope Waveform Viewer"}</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold">10 {isAr ? "مستشعرات" : "Sensors"}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { timeRef.current = 0; }}
            className="gap-1.5 border-white/[0.08] text-slate-400 hover:bg-white/[0.05] h-7 text-xs">
            <RotateCcw className="w-3 h-3" />{isAr ? "إعادة" : "Reset"}
          </Button>
          <Button size="sm" onClick={() => setRunning(v => !v)}
            className={cn("gap-1.5 h-7 text-xs", running ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-green-600 hover:bg-green-700")}>
            {running ? <><Square className="w-3 h-3" />{isAr ? "إيقاف" : "Pause"}</> : <><Play className="w-3 h-3" />{isAr ? "تشغيل" : "Run"}</>}
          </Button>
          <Button size="sm" onClick={() => setFaultMode(v => !v)}
            className={cn("gap-1.5 h-7 text-xs", faultMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:bg-white/10")}>
            <Zap className="w-3 h-3" />{faultMode ? (isAr ? "⚡ وضع العطل" : "⚡ FAULT MODE") : (isAr ? "حقن عطل" : "Inject Fault")}
          </Button>
          {/* Reference waveform save */}
          <Button size="sm" variant="outline"
            onClick={() => {
              if (savedRef) { setSavedRef(null); setShowRefOverlay(false); }
              else {
                const pts: number[] = [];
                const t0 = timeRef.current;
                for (let i = 0; i < 200; i++) {
                  const t = t0 + (i / 200) * 2 * Math.PI * activeSensor.tScale;
                  const v = (faultMode ? activeSensor.fault(t) : activeSensor.healthy(t));
                  pts.push(v);
                }
                setSavedRef(pts);
                setShowRefOverlay(true);
              }
            }}
            title={isAr ? "حفظ موجة مرجعية للمقارنة" : "Save reference waveform for comparison"}
            className={cn("gap-1.5 border-white/[0.08] h-7 text-xs", savedRef ? "text-violet-400 border-violet-500/30" : "text-slate-400 hover:bg-white/[0.05]")}
          >
            {savedRef ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
            {savedRef ? (isAr ? "مسح المرجع" : "Clear Ref") : (isAr ? "حفظ مرجع" : "Save Ref")}
          </Button>
          {savedRef && (
            <Button size="sm" variant="ghost" onClick={() => setShowRefOverlay(v => !v)}
              className={cn("h-7 text-xs gap-1.5", showRefOverlay ? "text-violet-400" : "text-slate-500")}>
              {showRefOverlay ? (isAr ? "إخفاء" : "Hide Ref") : (isAr ? "إظهار" : "Show Ref")}
            </Button>
          )}
          {/* Fullscreen */}
          <Button size="sm" variant="outline"
            onClick={() => setFullscreen(v => !v)}
            title={isAr ? "ملء الشاشة" : "Fullscreen"}
            className="gap-1.5 border-white/[0.08] text-slate-400 hover:bg-white/[0.05] h-7 text-xs">
            {fullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Sensor tabs */}
      <div className="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-white/[0.05] bg-[#070a10]">
        <button
          onClick={() => setSensorPage(p => Math.max(0, p - 1))}
          disabled={sensorPage === 0}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-white disabled:opacity-20"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {visibleSensors.map(s => (
          <button
            key={s.id}
            onClick={() => handleSensorChange(s)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap",
              activeSensor.id === s.id
                ? "border-white/20 bg-white/[0.08] text-white"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
            )}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {isAr ? s.nameAr.split(" ")[1] || s.nameAr.split(" ")[0] : s.id.toUpperCase()}
          </button>
        ))}

        <button
          onClick={() => setSensorPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={sensorPage >= totalPages - 1}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-white disabled:opacity-20"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", sensorPage === i ? "bg-green-400" : "bg-slate-700")} />
          ))}

          {/* CH2 button */}
          <div className="relative ml-3">
            {sensor2 ? (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-[11px] font-bold text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  CH2: {isAr ? sensor2.nameAr.split(" ")[0] : sensor2.id.toUpperCase()}
                </div>
                <button onClick={() => { setSensor2(null); setShowCh2Picker(false); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowCh2Picker(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-cyan-500/30 text-[11px] font-bold text-cyan-600 hover:text-cyan-400 hover:border-cyan-500/50 transition-all">
                <span className="text-xs">⊕</span> {isAr ? "إضافة CH2" : "Add CH2"}
              </button>
            )}
            {showCh2Picker && !sensor2 && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-56 rounded-xl border border-white/[0.08] bg-[#0d1117] shadow-2xl py-1.5">
                <div className="px-3 py-1 text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-1">
                  {isAr ? "اختر المستشعر الثاني" : "Select CH2 Sensor"}
                </div>
                {SENSORS.filter(s => s.id !== activeSensor.id).map(s => (
                  <button key={s.id} onClick={() => { setSensor2(s); setShowCh2Picker(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] text-left transition-colors">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#22d3ee" }} />
                    <div>
                      <div className="text-xs font-medium text-white">{isAr ? s.nameAr : s.nameEn}</div>
                      <div className="text-[9px] text-slate-600">{s.unit} · {s.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CH3 button */}
          <div className="relative ml-1">
            {sensor3 ? (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-[11px] font-bold text-yellow-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  CH3: {sensor3.id.toUpperCase()}
                </div>
                <button onClick={() => { setSensor3(null); setShowCh3Picker(false); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowCh3Picker(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-yellow-500/30 text-[11px] font-bold text-yellow-700 hover:text-yellow-400 hover:border-yellow-500/50 transition-all">
                <span className="text-xs">⊕</span> CH3
              </button>
            )}
            {showCh3Picker && !sensor3 && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-56 rounded-xl border border-white/[0.08] bg-[#0d1117] shadow-2xl py-1.5">
                <div className="px-3 py-1 text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-1">Select CH3 Sensor</div>
                {SENSORS.filter(s => s.id !== activeSensor.id && s.id !== sensor2?.id).map(s => (
                  <button key={s.id} onClick={() => { setSensor3(s); setShowCh3Picker(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] text-left transition-colors">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-yellow-400" />
                    <div>
                      <div className="text-xs font-medium text-white">{isAr ? s.nameAr : s.nameEn}</div>
                      <div className="text-[9px] text-slate-600">{s.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CH4 button */}
          <div className="relative ml-1">
            {sensor4 ? (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 text-[11px] font-bold text-fuchsia-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                  CH4: {sensor4.id.toUpperCase()}
                </div>
                <button onClick={() => { setSensor4(null); setShowCh4Picker(false); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowCh4Picker(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-fuchsia-500/30 text-[11px] font-bold text-fuchsia-700 hover:text-fuchsia-400 hover:border-fuchsia-500/50 transition-all">
                <span className="text-xs">⊕</span> CH4
              </button>
            )}
            {showCh4Picker && !sensor4 && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-56 rounded-xl border border-white/[0.08] bg-[#0d1117] shadow-2xl py-1.5">
                <div className="px-3 py-1 text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-1">Select CH4 Sensor</div>
                {SENSORS.filter(s => s.id !== activeSensor.id && s.id !== sensor2?.id && s.id !== sensor3?.id).map(s => (
                  <button key={s.id} onClick={() => { setSensor4(s); setShowCh4Picker(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] text-left transition-colors">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-fuchsia-400" />
                    <div>
                      <div className="text-xs font-medium text-white">{isAr ? s.nameAr : s.nameEn}</div>
                      <div className="text-[9px] text-slate-600">{s.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Oscilloscope display */}
        <div className="flex-1 flex flex-col p-4 gap-3">
          {/* Screen */}
          <div className="flex-1 relative rounded-xl overflow-hidden border border-green-900/40"
            style={{ boxShadow: "0 0 40px rgba(34,197,94,0.05), inset 0 0 80px rgba(0,0,0,0.8)" }}>
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />

            {/* Overlay: channel labels */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: faultMode ? "#ef4444" : activeSensor.color }} />
                <span className="text-[11px] font-mono font-bold" style={{ color: faultMode ? "#ef4444" : activeSensor.color }}>
                  CH1 — {isAr ? activeSensor.nameAr : activeSensor.nameEn}
                </span>
              </div>
              {sensor2 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-[11px] font-mono font-bold text-cyan-400">
                    CH2 — {isAr ? sensor2.nameAr : sensor2.nameEn}
                  </span>
                </div>
              )}
              {sensor3 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-[11px] font-mono font-bold text-yellow-400">
                    CH3 — {isAr ? sensor3.nameAr : sensor3.nameEn}
                  </span>
                </div>
              )}
              {sensor4 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
                  <span className="text-[11px] font-mono font-bold text-fuchsia-400">
                    CH4 — {isAr ? sensor4.nameAr : sensor4.nameEn}
                  </span>
                </div>
              )}
            </div>

            {/* Overlay: status badge */}
            <div className="absolute top-3 right-3">
              {faultMode ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400 font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3" />{isAr ? "وضع العطل" : "FAULT MODE"}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 font-bold">
                  <CheckCircle2 className="w-3 h-3" />{isAr ? "الحالة الطبيعية" : "HEALTHY REF"}
                </span>
              )}
            </div>

            {/* Paused overlay */}
            {!running && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-6 py-2 rounded-full bg-black/60 border border-white/10 text-white/60 text-sm font-mono">
                  ⏸ {isAr ? "متوقف" : "PAUSED"}
                </div>
              </div>
            )}

            {/* Timebase label */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <span className="text-[9px] font-mono text-green-900 opacity-80">{activeSensor.timebase}</span>
            </div>

            {/* Crosshair hint */}
            {crosshairVoltage === null && (
              <div className="absolute bottom-3 right-3">
                <span className="text-[9px] font-mono text-green-900/40">
                  {isAr ? "↕ حرّك المؤشر لقراءة الجهد" : "↕ hover to measure voltage"}
                </span>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="shrink-0 flex items-center gap-6 px-2">
            {[
              { k: isAr ? "القسمة الزمنية" : "Time/div", v: activeSensor.timebase },
              { k: isAr ? "قسمة الجهد" : "Volt/div",   v: activeSensor.voltDiv  },
              { k: isAr ? "بروتوكول" : "Protocol",      v: activeSensor.category.toUpperCase() },
            ].map(item => (
              <div key={item.k} className="flex flex-col gap-0">
                <span className="text-[9px] text-slate-600 uppercase tracking-wider">{item.k}</span>
                <span className="font-mono text-xs font-bold text-slate-400">{item.v}</span>
              </div>
            ))}

            {/* Legend */}
            <div className="ml-auto flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-px border-t border-dashed" style={{ borderColor: activeSensor.color + "55" }} />
                <span className="text-slate-600">{isAr ? "مرجع الصحة" : "Healthy ref"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: faultMode ? "#ef4444" : activeSensor.color }} />
                <span className="text-slate-600">{isAr ? "الإشارة الحية" : "Live signal"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-px border-t border-yellow-500/50" />
                <span className="text-slate-600">{isAr ? "خط الزناد" : "Trigger"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right info panel */}
        <div className="w-[280px] shrink-0 border-l border-white/[0.05] flex flex-col overflow-y-auto">
          {/* Sensor name */}
          <div className="p-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4" style={{ color: activeSensor.color }} />
              <h2 className="text-sm font-black text-white leading-tight">
                {isAr ? activeSensor.nameAr : activeSensor.nameEn}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isAr ? activeSensor.descAr : activeSensor.descEn}
            </p>
          </div>

          {/* Signal Quality Grade */}
          {(() => {
            const swing = parseFloat(measurements.max) - parseFloat(measurements.min);
            const swingNorm = swing / Math.max(0.01, activeSensor.maxY - activeSensor.minY);
            let grade: string, color: string, label: string, barW: number;
            if (faultMode) {
              grade = "FAULT"; color = "#ef4444"; label = isAr ? "عطل محتمل" : "Fault Detected"; barW = 95;
            } else if (swingNorm > 0.50) {
              grade = "A"; color = "#22c55e"; label = isAr ? "ممتازة" : "Excellent"; barW = 95;
            } else if (swingNorm > 0.25) {
              grade = "B"; color = "#84cc16"; label = isAr ? "جيدة" : "Good"; barW = 70;
            } else if (swingNorm > 0.08) {
              grade = "C"; color = "#eab308"; label = isAr ? "مراقبة" : "Monitor"; barW = 45;
            } else {
              grade = "D"; color = "#f97316"; label = isAr ? "مشكوك فيه" : "Suspect"; barW = 20;
            }
            return (
              <div className="p-4 border-b border-white/[0.05]">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2.5">
                  {isAr ? "جودة الإشارة" : "Signal Quality"}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                    style={{ backgroundColor: color + "22", border: `2px solid ${color}55`, color }}>
                    {faultMode ? "!" : grade}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color }}>{label}</div>
                    <div className="text-[10px] text-slate-600">
                      {isAr ? `تأرجح: ${swing.toFixed(2)} ${activeSensor.unit}` : `Swing: ${swing.toFixed(2)} ${activeSensor.unit}`}
                    </div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barW}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                </div>
              </div>
            );
          })()}

          {/* Measurements */}
          <div className="p-4 border-b border-white/[0.05]">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
              {isAr ? "القياسات الحية" : "Live Measurements"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "MIN", v: measurements.min, unit: activeSensor.unit },
                { k: "MAX", v: measurements.max, unit: activeSensor.unit },
                { k: "AVG", v: measurements.avg, unit: activeSensor.unit },
                { k: "FREQ", v: measurements.freq, unit: "Hz" },
              ].map(m => (
                <div key={m.k} className="bg-black/30 rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="text-[9px] text-slate-600 font-mono">{m.k}</div>
                  <div className="font-mono text-sm font-black" style={{ color: activeSensor.color }}>
                    {m.v} <span className="text-[10px] font-normal text-slate-600">{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Crosshair voltage readout */}
            {crosshairVoltage !== null && (
              <div className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#ffe84d15", border: "1px solid #ffe84d30" }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ffe84d", boxShadow: "0 0 6px #ffe84d" }} />
                <span className="text-[10px] text-slate-500">{isAr ? "مؤشر الفأرة:" : "Cursor:"}</span>
                <span className="font-mono text-sm font-black text-yellow-300">{crosshairVoltage.toFixed(3)} {activeSensor.unit}</span>
              </div>
            )}
          </div>

          {/* CH2 measurements */}
          {sensor2 && (
            <div className="p-4 border-b border-white/[0.05]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-600">
                  CH2 — {isAr ? sensor2.nameAr : sensor2.nameEn}
                </div>
                <button onClick={() => setFaultMode2(v => !v)} className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-bold transition-all",
                  faultMode2 ? "bg-red-500/20 text-red-400" : "bg-white/[0.04] text-slate-600 hover:text-slate-400"
                )}>
                  {faultMode2 ? (isAr ? "عطل" : "FAULT") : (isAr ? "سليم" : "OK")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { k: "MIN", v: measurements2.min, unit: sensor2.unit },
                  { k: "MAX", v: measurements2.max, unit: sensor2.unit },
                  { k: "AVG", v: measurements2.avg, unit: sensor2.unit },
                  { k: "FREQ", v: measurements2.freq, unit: "Hz" },
                ].map(m => (
                  <div key={m.k} className="bg-cyan-950/30 rounded-lg p-2 border border-cyan-900/30">
                    <div className="text-[9px] text-cyan-900/70 font-mono">{m.k}</div>
                    <div className="font-mono text-xs font-black text-cyan-400">
                      {m.v} <span className="text-[9px] font-normal text-cyan-900/50">{m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fault description when in fault mode */}
          {faultMode && (
            <div className="p-4 border-b border-white/[0.05]">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/25">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-400/90 leading-relaxed">
                  {isAr ? activeSensor.faultDescAr : activeSensor.faultDescEn}
                </p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="p-4 flex-1">
            <div className="flex items-center gap-1.5 mb-3">
              <Info className="w-3 h-3 text-slate-500" />
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                {isAr ? "ما الذي تبحث عنه؟" : "What to Look For"}
              </div>
            </div>
            <ul className="space-y-2">
              {(isAr ? activeSensor.tipsAr : activeSensor.tipsEn).map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold shrink-0 mt-0.5" style={{ color: activeSensor.color }}>▸</span>
                  <span className="text-[11px] text-slate-400 leading-snug">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sensor selector grid (all sensors) */}
          <div className="p-4 border-t border-white/[0.05]">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">
              {isAr ? "جميع المستشعرات" : "All Sensors"}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SENSORS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSensorChange(s)}
                  className={cn(
                    "text-left px-2 py-1.5 rounded-lg border text-[10px] transition-all",
                    activeSensor.id === s.id
                      ? "border-white/20 bg-white/[0.07] text-white"
                      : "border-white/[0.04] text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="font-mono">{s.id.toUpperCase()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
