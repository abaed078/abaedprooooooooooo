import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link } from "wouter";
import {
  useGetDiagnosticSession, useListDtcCodes, useGetLiveData,
  useClearDtcCode, getListDtcCodesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, AlertTriangle, ShieldAlert, Info, Trash2, Gauge, CheckCircle2,
  Activity, Bot, Send, ChevronDown, ChevronUp, Cpu, RefreshCw, X, Plus,
  Wrench, Clock, DollarSign, FileText, Zap, Radio, Settings2, ChevronRight,
  Target, BarChart3, Play, Square, RotateCcw, CheckSquare, Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const MAX_HISTORY = 60;
const API_BASE = "/api";

/* ══════════════════════════════════════════════════════════════
   DTC KNOWLEDGE BASE — Repair guidance per code family
══════════════════════════════════════════════════════════════ */
interface RepairStep { step: string; stepAr: string; tool?: string }
interface ProbableCause { cause: string; causeAr: string; pct: number }
interface DtcKnowledge {
  system: string; systemAr: string;
  causes: ProbableCause[];
  steps: RepairStep[];
  parts: { part: string; partAr: string; partNo: string }[];
  laborHrs: number;
  tsb?: string;
}

function getDtcKnowledge(code: string, seed: number): DtcKnowledge {
  const prefix = code.slice(0, 3).toUpperCase();
  const isO2    = prefix === "P01" || prefix === "P13";
  const isFuel  = prefix === "P02" || prefix === "P03";
  const isEmiss = prefix === "P04";
  const isSpeed = prefix === "P05";
  const isIgn   = prefix === "P03";
  const isMaf   = code.startsWith("P010");
  const isCAN   = code.startsWith("U0");
  const isABS   = code.startsWith("C0");
  const isSRS   = code.startsWith("B0");

  if (isCAN) return {
    system: "Network / CAN Bus", systemAr: "شبكة CAN Bus",
    causes: [
      { cause: "Damaged CAN bus wiring harness",       causeAr: "تلف في كابلات CAN Bus",          pct: 42 },
      { cause: "Faulty gateway module",                 causeAr: "عطل في وحدة البوابة",             pct: 28 },
      { cause: "ECU internal communication failure",    causeAr: "فشل داخلي في التواصل بين ECUs",   pct: 18 },
      { cause: "Poor ground connection",                causeAr: "تأريض ضعيف",                      pct: 12 },
    ],
    steps: [
      { step: "Scan all modules for communication DTCs", stepAr: "افحص جميع الوحدات لأكواد الاتصال", tool: "MaxiSYS Ultra" },
      { step: "Inspect CAN bus wiring for damage/corrosion", stepAr: "افحص كابلات CAN Bus من التلف", tool: "Visual" },
      { step: "Measure CAN bus resistance (expect 60Ω)", stepAr: "قس مقاومة CAN Bus (يجب 60Ω)", tool: "DVOM" },
      { step: "Check gateway module power & ground", stepAr: "تحقق من طاقة وتأريض وحدة البوابة", tool: "DVOM" },
      { step: "Update all module firmware to latest version", stepAr: "حدّث firmware جميع الوحدات", tool: "J2534" },
    ],
    parts: [
      { part: "CAN Bus Terminator Resistor", partAr: "مقاومة CAN Bus", partNo: "CAN-60R-001" },
      { part: "Gateway Module", partAr: "وحدة البوابة", partNo: "GW-MOD-7XX" },
    ],
    laborHrs: 2.5, tsb: "TSB-2024-CAN-003",
  };

  if (isABS) return {
    system: "ABS / Brake System", systemAr: "نظام ABS",
    causes: [
      { cause: "Faulty wheel speed sensor",         causeAr: "حساس سرعة العجلة معطوب",      pct: 55 },
      { cause: "Damaged sensor tone ring",           causeAr: "تلف في حلقة التدوير",          pct: 22 },
      { cause: "ABS module internal fault",          causeAr: "عطل داخلي في وحدة ABS",        pct: 15 },
      { cause: "Wiring short/open circuit",          causeAr: "قصر أو انقطاع في الأسلاك",     pct: 8 },
    ],
    steps: [
      { step: "Identify which wheel sensor is faulty from scan data", stepAr: "حدد العجلة المتضررة من بيانات الفحص", tool: "MaxiSYS" },
      { step: "Measure sensor resistance (expect 800-1400Ω)", stepAr: "قس مقاومة الحساس (800-1400Ω)", tool: "DVOM" },
      { step: "Inspect tone ring for cracks/damage", stepAr: "افحص حلقة التدوير من الشقوق", tool: "Visual" },
      { step: "Check sensor wiring and connector pins", stepAr: "افحص كابلات الحساس والموصلات", tool: "DVOM" },
      { step: "Replace faulty sensor and clear codes", stepAr: "استبدل الحساس المعطوب وامسح الأكواد" },
      { step: "Perform ABS self-test via bidirectional control", stepAr: "شغّل اختبار ABS ذاتي عبر التحكم الثنائي", tool: "MaxiSYS" },
    ],
    parts: [
      { part: "Wheel Speed Sensor", partAr: "حساس سرعة العجلة", partNo: "WSS-ABS-440" },
      { part: "Sensor Tone Ring", partAr: "حلقة التدوير", partNo: "TR-ABS-220" },
    ],
    laborHrs: 1.5, tsb: "TSB-2023-ABS-011",
  };

  if (isMaf) return {
    system: "Mass Air Flow Sensor", systemAr: "حساس تدفق الهواء MAF",
    causes: [
      { cause: "Contaminated/dirty MAF sensor element", causeAr: "تلوث أو اتساخ حساس MAF",          pct: 48 },
      { cause: "Air intake leak before MAF sensor",      causeAr: "تسرب هواء قبل الحساس",             pct: 27 },
      { cause: "Faulty MAF sensor (internal failure)",   causeAr: "عطل داخلي في حساس MAF",            pct: 18 },
      { cause: "Wiring/connector fault",                 causeAr: "عطل في الأسلاك أو الموصل",         pct: 7 },
    ],
    steps: [
      { step: "Record live MAF data at idle (expect 2-7 g/s)", stepAr: "سجّل قراءة MAF عند الخمول (2-7 g/s)", tool: "MaxiSYS" },
      { step: "Inspect air filter and ductwork for leaks", stepAr: "افحص فلتر الهواء والقنوات من تسربات", tool: "Visual" },
      { step: "Clean MAF sensor with electronics cleaner spray", stepAr: "نظف حساس MAF برذاذ تنظيف إلكتروني" },
      { step: "Check MAF wiring and 5V reference voltage", stepAr: "افحص أسلاك MAF وجهد المرجع 5V", tool: "DVOM" },
      { step: "Compare MAF vs MAP values for correlation", stepAr: "قارن قراءة MAF بقراءة MAP للتوافق", tool: "MaxiSYS" },
      { step: "Replace MAF if cleaning/check fails", stepAr: "استبدل MAF إن لم ينجح التنظيف والفحص" },
    ],
    parts: [
      { part: "MAF Sensor Assembly", partAr: "مجموعة حساس MAF", partNo: "MAF-22680-XXXX" },
      { part: "MAF Sensor Cleaning Kit", partAr: "مجموعة تنظيف MAF", partNo: "CLN-MAF-001" },
    ],
    laborHrs: 0.8,
  };

  // Default engine/fuel codes
  return {
    system: "Engine Management", systemAr: "إدارة المحرك",
    causes: [
      { cause: "Faulty oxygen / lambda sensor",       causeAr: "حساس أكسجين معطوب",               pct: 38 + (seed % 10) },
      { cause: "Fuel injector clogged or leaking",    causeAr: "حاقن وقود مسدود أو مسرّب",        pct: 26 - (seed % 5) },
      { cause: "Vacuum/boost leak in intake system",  causeAr: "تسرب تفريغ في منظومة السحب",       pct: 18 },
      { cause: "Catalytic converter inefficiency",    causeAr: "ضعف كفاءة المحفز الحراري",          pct: 11 },
      { cause: "ECM software / calibration issue",    causeAr: "مشكلة في برمجة ECU",               pct: 7  },
    ].sort((a, b) => b.pct - a.pct),
    steps: [
      { step: "Check for other related codes (MAF, EVAP, fuel trim)", stepAr: "ابحث عن أكواد ذات صلة (MAF، EVAP، ضبط وقود)", tool: "MaxiSYS" },
      { step: "Monitor short/long fuel trim at idle and 2500 RPM", stepAr: "راقب ضبط الوقود عند الخمول و 2500 RPM", tool: "MaxiSYS Live Data" },
      { step: "Inspect O2 sensor waveform — should oscillate 0.1-0.9V", stepAr: "راقب شكل موجة O2 (يجب أن يتذبذب 0.1-0.9V)", tool: "Oscilloscope" },
      { step: "Check for intake manifold vacuum leaks (smoke test)", stepAr: "افحص تسربات المشعب بجهاز دخان", tool: "Smoke Tester" },
      { step: "Inspect spark plugs and ignition coils", stepAr: "افحص شمعات الإشعال وملفات الإشعال", tool: "Visual + DVOM" },
      { step: "Perform fuel injector balance test via bidirectional", stepAr: "اختبر موازنة حاقنات الوقود عبر التحكم الثنائي", tool: "MaxiSYS Active Tests" },
      { step: "Update ECU calibration if TSB available", stepAr: "حدّث معايرة ECU إن توفر إشعار TSB", tool: "J2534 Programmer" },
    ],
    parts: [
      { part: "O2 Sensor (Bank 1 Sensor 1)", partAr: "حساس أكسجين (بنك 1 حساس 1)", partNo: "O2-234-XXXX" },
      { part: "Fuel Injector Cleaner", partAr: "منظف حاقن الوقود", partNo: "CLN-INJ-500" },
      { part: "Vacuum Hose Kit", partAr: "مجموعة خراطيم تفريغ", partNo: "VAC-KIT-XX" },
    ],
    laborHrs: 1.5 + (seed % 3) * 0.5,
    tsb: `TSB-${2023 + (seed % 2)}-ENG-${String(seed % 99).padStart(3, "0")}`,
  };
}

/* ══════════════════════════════════════════════════════════════
   FREEZE FRAME
══════════════════════════════════════════════════════════════ */
function generateFreezeFrame(dtcCode: string, sessionId: number) {
  const seed = dtcCode.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + sessionId;
  const rng = (min: number, max: number, s = 0) => {
    const v = Math.abs(Math.sin(seed + s) * 10000);
    return Math.round((min + (v % (max - min))) * 10) / 10;
  };
  return [
    { name: "RPM",            nameAr: "دورات المحرك",     value: rng(650,  3200,  1), unit: "rpm",  warn: false },
    { name: "Coolant Temp",   nameAr: "حرارة المحرك",     value: rng(80,   115,   2), unit: "°C",   warn: rng(80,115,2) > 105 },
    { name: "MAP Pressure",   nameAr: "ضغط المشعب",       value: rng(90,   280,   3), unit: "kPa",  warn: false },
    { name: "Speed",          nameAr: "السرعة",            value: rng(0,    120,   4), unit: "km/h", warn: false },
    { name: "Throttle",       nameAr: "الخانق",            value: rng(0,    100,   5), unit: "%",    warn: false },
    { name: "O2 Sensor",      nameAr: "حساس O2",           value: rng(0.1,  0.9,   7), unit: "V",    warn: rng(0.1,0.9,7) > 0.7 },
    { name: "Battery",        nameAr: "البطارية",          value: rng(11.8, 14.6,  8), unit: "V",    warn: rng(11.8,14.6,8) < 12.5 },
    { name: "IAT",            nameAr: "هواء السحب",        value: rng(20,   60,    9), unit: "°C",   warn: rng(20,60,9) > 50 },
    { name: "STFT B1",        nameAr: "ضبط وقود قصير",    value: rng(-15,  15,   10), unit: "%",    warn: Math.abs(rng(-15,15,10)) > 10 },
    { name: "Fuel Press",     nameAr: "ضغط الوقود",       value: rng(200,  450,  11), unit: "kPa",  warn: rng(200,450,11) < 250 },
  ];
}

function FreezeFrameSection({ dtcCode, sessionId, lang }: { dtcCode: string; sessionId: number; lang: string }) {
  const [open, setOpen] = useState(false);
  const data = generateFreezeFrame(dtcCode, sessionId);
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/40 transition-colors">
        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-cyan-400">{lang === "ar" ? "Freeze Frame — لقطة ECU لحظة العطل" : "Freeze Frame — ECU Snapshot at Fault"}</span>
        <span className="ml-auto text-muted-foreground">{open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
      </button>
      {open && (
        <div className="p-3 bg-secondary/10 grid grid-cols-5 gap-2">
          {data.map(row => (
            <div key={row.name} className={`bg-background/80 rounded-lg p-2.5 text-center border ${row.warn ? "border-yellow-500/30" : "border-border/30"}`}>
              <div className="text-[9px] text-muted-foreground leading-tight mb-1 font-semibold uppercase tracking-wide">
                {lang === "ar" ? row.nameAr : row.name}
              </div>
              <div className={`font-mono text-sm font-black ${row.warn ? "text-yellow-400" : "text-foreground"}`}>{row.value}</div>
              <div className={`text-[9px] font-mono font-bold ${row.warn ? "text-yellow-400/70" : "text-primary/60"}`}>{row.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REPAIR GUIDANCE CARD — World-class
══════════════════════════════════════════════════════════════ */
function RepairGuidanceCard({ code, sessionId, lang }: { code: string; sessionId: number; lang: string }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + sessionId;
  const kb = getDtcKnowledge(code, seed);
  const totalSteps = kb.steps.length;
  const progress = checked.size / totalSteps;

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors">
        <Wrench className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <div className="flex-1 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-orange-400">
            {lang === "ar" ? "دليل الإصلاح المرحلي" : "Guided Repair Procedure"}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {lang === "ar" ? kb.systemAr : kb.system} · {kb.laborHrs}h
            {kb.tsb && ` · ${kb.tsb}`}
          </div>
        </div>
        {open && checked.size > 0 && (
          <div className="text-[10px] font-bold text-green-400 shrink-0">
            {checked.size}/{totalSteps} {lang === "ar" ? "مكتمل" : "done"}
          </div>
        )}
        <span className="text-muted-foreground shrink-0">{open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
      </button>

      {open && (
        <div className="bg-secondary/10 divide-y divide-border/20">
          {/* Progress bar */}
          {checked.size > 0 && (
            <div className="px-4 py-2">
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}

          {/* Probable Causes */}
          <div className="px-4 py-3 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              {lang === "ar" ? "الأسباب المحتملة" : "Probable Causes"}
            </div>
            {kb.causes.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-[10px] font-black text-primary/80 w-8 shrink-0 font-mono">{c.pct}%</div>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
                <div className="text-[11px] text-muted-foreground flex-1">
                  {lang === "ar" ? c.causeAr : c.cause}
                </div>
              </div>
            ))}
          </div>

          {/* Repair Steps */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              {lang === "ar" ? "خطوات الإصلاح" : "Repair Steps"}
            </div>
            {kb.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setChecked(prev => {
                  const n = new Set(prev);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all ${checked.has(i) ? "bg-green-500/10 border border-green-500/20" : "hover:bg-secondary/50"}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${checked.has(i) ? "bg-green-500 border-green-500" : "border-border"}`}>
                  {checked.has(i)
                    ? <CheckSquare className="w-3.5 h-3.5 text-white" />
                    : <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium leading-tight ${checked.has(i) ? "text-green-400 line-through opacity-70" : "text-foreground"}`}>
                    {lang === "ar" ? s.stepAr : s.step}
                  </div>
                  {s.tool && (
                    <div className="text-[10px] text-primary/60 mt-0.5 font-mono">{s.tool}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Parts + Labor */}
          <div className="px-4 py-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                {lang === "ar" ? "قطع الغيار المحتملة" : "Parts Needed"}
              </div>
              <div className="space-y-1.5">
                {kb.parts.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-[11px] font-medium">{lang === "ar" ? p.partAr : p.part}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{p.partNo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  {lang === "ar" ? "وقت العمل التقديري" : "Est. Labor Time"}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="font-mono font-bold text-blue-400">{kb.laborHrs}h</span>
                  <span className="text-[10px] text-muted-foreground">{lang === "ar" ? "عمل فني" : "shop time"}</span>
                </div>
              </div>
              {kb.tsb && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">TSB</div>
                  <div className="font-mono text-[11px] text-yellow-400">{kb.tsb}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DTC CARD
══════════════════════════════════════════════════════════════ */
function DtcCard({ dtc, sessionId, lang, onClear }: {
  dtc: any; sessionId: number; lang: string; onClear: () => void;
}) {
  const sevCfg = {
    critical: { bg: "bg-red-500/8",    border: "border-l-red-500 border-red-500/25",  badge: "bg-red-500/20 text-red-400",    icon: <ShieldAlert className="w-5 h-5 text-red-400" />,    dot: "bg-red-500" },
    warning:  { bg: "bg-yellow-500/8", border: "border-l-yellow-500 border-yellow-500/20", badge: "bg-yellow-500/20 text-yellow-400", icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />, dot: "bg-yellow-400" },
    info:     { bg: "bg-blue-500/8",   border: "border-l-blue-500 border-blue-500/20", badge: "bg-blue-500/20 text-blue-400",   icon: <Info className="w-5 h-5 text-blue-400" />,          dot: "bg-blue-400" },
  }[dtc.severity as "critical" | "warning" | "info"] || { bg: "bg-secondary/20", border: "border-l-gray-500 border-border", badge: "bg-secondary text-muted-foreground", icon: <Info className="w-5 h-5" />, dot: "bg-gray-400" };

  const cleared = dtc.status === "cleared";

  return (
    <div className={`rounded-xl border-l-4 border ${sevCfg.border} ${sevCfg.bg} overflow-hidden ${cleared ? "opacity-50" : ""}`}
      data-testid={`dtc-card-${dtc.code}`}>
      {/* Header Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {sevCfg.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-lg font-black tracking-wider">{dtc.code}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${sevCfg.badge}`}>
              {dtc.severity}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              dtc.status === "active"  ? "bg-red-500/15 text-red-400" :
              dtc.status === "cleared" ? "bg-green-500/15 text-green-400" :
              "bg-yellow-500/15 text-yellow-400"
            }`}>
              {lang === "ar"
                ? dtc.status === "active" ? "نشط" : dtc.status === "cleared" ? "ممسوح" : "معلّق"
                : dtc.status}
            </span>
          </div>
          <p className="text-sm font-medium mt-0.5 text-foreground/90 leading-snug">{dtc.description}</p>
          {dtc.systemAffected && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "ar" ? "النظام:" : "System:"} {dtc.systemAffected}
            </p>
          )}
        </div>
        {!cleared && (
          <Button size="icon" variant="ghost" onClick={onClear}
            className="w-8 h-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0"
            title={lang === "ar" ? "مسح الكود" : "Clear code"}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Expandable sections */}
      <div className="px-4 pb-4 space-y-2">
        <RepairGuidanceCard code={dtc.code} sessionId={sessionId} lang={lang} />
        <FreezeFrameSection dtcCode={dtc.code} sessionId={sessionId} lang={lang} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   OSCILLOSCOPE — Multi-channel waveform
══════════════════════════════════════════════════════════════ */
function Oscilloscope({ channels }: { channels: { name: string; nameAr: string; color: string; data: number[]; unit: string }[] }) {
  const { lang } = useI18n();
  const W = 600, H = 100;
  if (channels.length === 0) return null;
  return (
    <div className="space-y-2">
      {channels.slice(0, 4).map(ch => {
        const d = ch.data.slice(-80);
        if (d.length < 2) return null;
        const min = Math.min(...d), max = Math.max(...d);
        const range = max - min || 1;
        const pts = d.map((v, i) =>
          `${(i / (d.length - 1)) * W},${H - ((v - min) / range) * (H - 8) - 4}`
        ).join(" ");
        return (
          <div key={ch.name} className="rounded-lg overflow-hidden border border-border/30 bg-black/40">
            <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/20 border-b border-border/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
                <span className="text-xs font-bold font-mono" style={{ color: ch.color }}>
                  {lang === "ar" ? ch.nameAr : ch.name}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {d[d.length - 1]?.toFixed(d[d.length - 1] < 10 ? 2 : 0)} {ch.unit}
              </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
              {/* Grid */}
              {[25, 50, 75].map(y => (
                <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
              {[150, 300, 450].map(x => (
                <line key={x} x1={x} y1="0" x2={x} y2={H} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
              <defs>
                <linearGradient id={`osc-${ch.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ch.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={ch.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#osc-${ch.name})`} />
              <polyline points={pts} fill="none" stroke={ch.color} strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 3px ${ch.color}66)` }} />
              {/* Live dot */}
              {(() => {
                const last = d[d.length - 1];
                const y = H - ((last - min) / range) * (H - 8) - 4;
                return <circle cx={W} cy={y} r="3" fill={ch.color} style={{ filter: `drop-shadow(0 0 4px ${ch.color})` }} />;
              })()}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LIVE DATA TAB
══════════════════════════════════════════════════════════════ */
function LiveDataTab({ liveData, historyRef, lang }: { liveData: any[]; historyRef: React.MutableRefObject<Map<number, number[]>>; lang: string }) {
  const [viewMode, setViewMode] = useState<"grid" | "scope">("grid");

  const groups = [
    { label: lang === "ar" ? "المحرك" : "Engine",    names: ["RPM", "Engine Load", "Coolant Temperature", "Throttle Position", "Intake Air Temperature"] },
    { label: lang === "ar" ? "الوقود والانبعاثات" : "Fuel & Emissions", names: ["Short Fuel Trim", "Long Fuel Trim", "O2 Sensor", "Fuel System Status", "MAF Sensor"] },
    { label: lang === "ar" ? "الأداء" : "Performance", names: ["Vehicle Speed", "MAP Sensor", "Barometric Pressure", "Battery Voltage"] },
  ];

  const oscopeChannels = liveData.slice(0, 4).map((p, i) => {
    // Reading from ref during render to avoid excessive re-renders for multi-channel charts
    // eslint-disable-next-line react-hooks/refs
    const data = historyRef.current.get(p.id) || [];
    return {
      name: p.name,
      nameAr: p.name,
      color: ["#3b82f6", "#22c55e", "#f97316", "#a855f7"][i],
      data,
      unit: p.unit || "",
    };
  });

  const grouped = groups.map(g => ({
    ...g,
    pids: liveData.filter(p => g.names.some(n => p.name.toLowerCase().includes(n.toLowerCase()))),
  }));
  const ungrouped = liveData.filter(p => !groups.some(g => g.names.some(n => p.name.toLowerCase().includes(n.toLowerCase()))));

  const Tile = ({ p }: { p: any }) => {
    // Reading from ref during render to avoid excessive re-renders for every sparkline point
    // eslint-disable-next-line react-hooks/refs
    const hist = historyRef.current.get(p.id) || [];
    const num = p.currentNumericValue;
    const isNum = num !== undefined && num !== null;
    const min = p.minValue ?? 0, max = p.maxValue ?? 100;
    const pct = isNum ? Math.max(0, Math.min(100, ((num - min) / (max - min || 1)) * 100)) : 0;
    const isHigh = pct > 85, isWarn = pct > 70;
    return (
      <div className={`rounded-xl border p-3 space-y-2 ${
        isHigh ? "border-red-500/30 bg-red-500/5" : isWarn ? "border-yellow-500/20 bg-yellow-500/5" : "border-border/40 bg-card/50"
      }`}>
        <div className="flex items-start justify-between gap-1">
          <div className="text-[10px] text-muted-foreground font-medium leading-tight">{p.name}</div>
          <div className={`text-base font-black font-mono leading-none ${isHigh ? "text-red-400" : isWarn ? "text-yellow-400" : "text-foreground"}`}>
            {isNum ? (num < 1 ? num.toFixed(2) : num < 100 ? num.toFixed(1) : Math.round(num)) : p.currentValue || "—"}
            <span className="text-[9px] ml-0.5 font-normal text-muted-foreground">{p.unit}</span>
          </div>
        </div>
        {/* Sparkline */}
        {hist.length > 1 && (() => {
          const mn = Math.min(...hist), mx = Math.max(...hist);
          const rg = mx - mn || 1;
          const pts = hist.map((v, i) => `${(i / (hist.length - 1)) * 100},${30 - ((v - mn) / rg) * 26 - 2}`).join(" ");
          const clr = isHigh ? "#ef4444" : isWarn ? "#eab308" : "#3b82f6";
          return (
            <svg viewBox="0 0 100 30" className="w-full h-7" preserveAspectRatio="none">
              <polygon points={`0,30 ${pts} 100,30`} fill={clr} opacity="0.15" />
              <polyline points={pts} fill="none" stroke={clr} strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
            </svg>
          );
        })()}
        {isNum && (
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${isHigh ? "bg-red-500" : isWarn ? "bg-yellow-400" : "bg-primary"}`}
              style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { v: "grid", icon: Layers, label: lang === "ar" ? "شبكة" : "Grid" },
            { v: "scope", icon: Activity, label: lang === "ar" ? "أسكوب" : "Scope" },
          ].map(m => (
            <button key={m.v} onClick={() => setViewMode(m.v as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === m.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              <m.icon className="w-3.5 h-3.5" />{m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {lang === "ar" ? "بث مباشر" : "Live stream"} · {liveData.length} {lang === "ar" ? "قناة" : "channels"}
        </div>
      </div>

      {viewMode === "scope" ? (
        <Oscilloscope channels={oscopeChannels} />
      ) : (
        <div className="space-y-4">
          {grouped.filter(g => g.pids.length > 0).map(g => (
            <div key={g.label}>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{g.label}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {g.pids.map(p => <Tile key={p.id} p={p} />)}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                {lang === "ar" ? "أخرى" : "Other"}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {ungrouped.map(p => <Tile key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BIDIRECTIONAL CONTROL TAB
══════════════════════════════════════════════════════════════ */
interface ActuatorTest { id: string; name: string; nameAr: string; system: string; type: "toggle" | "pulse" | "ramp"; icon: any }
const ACTUATORS: ActuatorTest[] = [
  { id: "inj1", name: "Fuel Injector #1 Cut",    nameAr: "قطع حاقن الوقود #1",   system: "Engine",       type: "toggle", icon: Zap },
  { id: "inj2", name: "Fuel Injector #2 Cut",    nameAr: "قطع حاقن الوقود #2",   system: "Engine",       type: "toggle", icon: Zap },
  { id: "fan",  name: "Cooling Fan Relay",        nameAr: "مروحة التبريد",         system: "Cooling",      type: "toggle", icon: RefreshCw },
  { id: "evap", name: "EVAP Purge Valve",         nameAr: "صمام تنقية EVAP",       system: "Emissions",    type: "pulse",  icon: Activity },
  { id: "iac",  name: "Idle Air Control",         nameAr: "التحكم بهواء الخمول",   system: "Engine",       type: "ramp",   icon: Gauge },
  { id: "vvt",  name: "VVT Solenoid Bank 1",      nameAr: "ملف VVT بنك 1",         system: "Engine",       type: "toggle", icon: Settings2 },
  { id: "egr",  name: "EGR Valve",                nameAr: "صمام EGR",              system: "Emissions",    type: "ramp",   icon: Activity },
  { id: "abs1", name: "ABS Motor Test",           nameAr: "اختبار محرك ABS",       system: "Brakes",       type: "pulse",  icon: Settings2 },
  { id: "abs2", name: "ABS Inlet Valve FL",       nameAr: "صمام ABS أمامي يسار",  system: "Brakes",       type: "toggle", icon: Settings2 },
  { id: "thr",  name: "Throttle Body Reset",      nameAr: "إعادة ضبط الخانق",     system: "Engine",       type: "pulse",  icon: RotateCcw },
  { id: "fuel", name: "Fuel Pump Relay",          nameAr: "مرحّل مضخة الوقود",     system: "Fuel",         type: "toggle", icon: Zap },
  { id: "horn", name: "Horn Test",                nameAr: "اختبار البوق",           system: "Body",         type: "pulse",  icon: Radio },
];

function BiDirectionalTab({ lang }: { lang: string }) {
  const [states, setStates] = useState<Record<string, "idle" | "active" | "running" | "done">>({});
  const [selected, setSelected] = useState<string | null>(null);
  const cats = [...new Set(ACTUATORS.map(a => a.system))];

  const run = (id: string, type: string) => {
    if (states[id] === "active") { setStates(p => ({ ...p, [id]: "idle" })); return; }
    setStates(p => ({ ...p, [id]: "running" }));
    setSelected(id);
    setTimeout(() => {
      if (type === "toggle") setStates(p => ({ ...p, [id]: "active" }));
      else setStates(p => ({ ...p, [id]: "done" }));
    }, 1200);
    if (type !== "toggle") setTimeout(() => setStates(p => ({ ...p, [id]: "idle" })), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Warning */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-300">
          <span className="font-bold">{lang === "ar" ? "تحذير: " : "Warning: "}</span>
          {lang === "ar"
            ? "التحكم الثنائي الاتجاه يُفعّل مكونات المركبة مباشرة. تأكد من السلامة قبل تشغيل أي اختبار."
            : "Bidirectional control activates vehicle components directly. Ensure safety before running any test."}
        </div>
      </div>

      {cats.map(cat => (
        <div key={cat}>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{cat}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {ACTUATORS.filter(a => a.system === cat).map(act => {
              const st = states[act.id] || "idle";
              const Icon = act.icon;
              return (
                <div key={act.id} className={`rounded-xl border p-3 transition-all ${
                  st === "active"  ? "border-green-500/40 bg-green-500/8"  :
                  st === "running" ? "border-blue-500/40 bg-blue-500/8 animate-pulse" :
                  st === "done"    ? "border-primary/30 bg-primary/5"  :
                  "border-border/40 hover:border-border"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 shrink-0 ${st === "active" ? "text-green-400" : st === "running" ? "text-blue-400 animate-spin" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold leading-tight truncate">{lang === "ar" ? act.nameAr : act.name}</div>
                      <div className="text-[9px] text-muted-foreground">{act.type === "toggle" ? "Toggle" : act.type === "pulse" ? "Pulse Test" : "Ramp Test"}</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => run(act.id, act.type)}
                    size="sm"
                    className={`w-full h-7 text-xs gap-1.5 ${
                      st === "active"  ? "bg-green-600 hover:bg-green-700" :
                      st === "running" ? "bg-blue-600"   :
                      st === "done"    ? "bg-primary/80"  :
                      "bg-secondary hover:bg-muted text-foreground"
                    }`}
                    disabled={st === "running"}
                  >
                    {st === "running" ? <><RefreshCw className="w-3 h-3 animate-spin" />{lang === "ar" ? "جارٍ..." : "Running…"}</> :
                     st === "active"  ? <><Square className="w-3 h-3" />{lang === "ar" ? "إيقاف" : "Stop"}</> :
                     st === "done"    ? <><CheckCircle2 className="w-3 h-3" />{lang === "ar" ? "اكتمل" : "Done"}</> :
                     <><Play className="w-3 h-3" />{lang === "ar" ? "تشغيل" : "Run"}</>}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AI ASSISTANT
══════════════════════════════════════════════════════════════ */
type ChatMsg = { role: "user" | "assistant"; content: string };

function AiPanel({ session, dtcCodes, liveData, lang }: {
  session: any; dtcCodes?: any[]; liveData?: any[]; lang: string;
}) {
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const startConversation = useCallback(async () => {
    setCreating(true);
    try {
      const ctx = {
        vehicle: { make: session.vehicleName },
        dtcs: dtcCodes?.map(d => ({ code: d.code, description: d.description, severity: d.severity })),
        liveData: liveData ? Object.fromEntries(liveData.map(p => [p.name, `${p.currentValue}${p.unit || ""}`])) : undefined,
      };
      const res = await fetch(`${API_BASE}/anthropic/conversations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: JSON.stringify(ctx) }),
      });
      const conv = await res.json() as { id: number };
      setConvId(conv.id);
      setMessages([{
        role: "assistant",
        content: lang === "ar"
          ? `مرحباً! أنا مساعد Autel AI لمركبة **${session.vehicleName}**.\n\n${
              dtcCodes?.length
                ? `رصدت **${dtcCodes.length}** كود عطل: **${dtcCodes.map(d => d.code).join(", ")}**.\n\nيمكنني تحليلها وتقديم توصيات الإصلاح. بماذا يمكنني مساعدتك؟`
                : "لا توجد أكواد أعطال نشطة. هل تريد تحليل البيانات الحية؟"
            }`
          : `Hello! I'm Autel AI for **${session.vehicleName}**.\n\n${
              dtcCodes?.length
                ? `Detected **${dtcCodes.length}** DTC(s): **${dtcCodes.map(d => d.code).join(", ")}**.\n\nI can analyze these and guide you through repairs. How can I help?`
                : "No active fault codes. Would you like live data analysis?"
            }`,
      }]);
    } catch {
      toast({ title: lang === "ar" ? "فشل الاتصال بالذكاء الاصطناعي" : "AI connection failed", variant: "destructive" });
    } finally { setCreating(false); }
  }, [session, dtcCodes, liveData, lang]);

  const sendMessage = useCallback(async () => {
    if (!convId || !input.trim() || streaming) return;
    const userMsg = input.trim(); setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);
    let txt = "";
    setMessages(prev => [...prev, { role: "assistant", content: "▌" }]);
    try {
      const res = await fetch(`${API_BASE}/anthropic/conversations/${convId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader(), dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const j = JSON.parse(line.slice(6));
            if (j.chunk) { txt += j.chunk; setMessages(p => { const u = [...p]; u[u.length - 1] = { role: "assistant", content: txt + "▌" }; return u; }); }
            if (j.done)   { setMessages(p => { const u = [...p]; u[u.length - 1] = { role: "assistant", content: txt }; return u; }); }
          } catch { /**/ }
        }
      }
    } catch {
      setMessages(p => { const u = [...p]; u[u.length - 1] = { role: "assistant", content: lang === "ar" ? "خطأ في الاتصال." : "Connection error." }; return u; });
    } finally { setStreaming(false); }
  }, [convId, input, lang, streaming]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const render = (content: string) => content.split("\n").map((l, i) => (
    <p key={i} className={l === "" ? "mt-2" : ""} dangerouslySetInnerHTML={{ __html: l.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
  ));

  if (!convId) return (
    <div className="flex flex-col items-center justify-center gap-5 py-16">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Bot className="w-10 h-10 text-primary" />
      </div>
      <div className="text-center max-w-sm">
        <h3 className="font-bold text-lg">{lang === "ar" ? "مساعد الذكاء الاصطناعي للتشخيص" : "AI Diagnostic Assistant"}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "ar" ? "يحلل أعطالك ويرشدك خطوة بخطوة للإصلاح" : "Analyzes your faults and guides you step-by-step through repair"}
        </p>
      </div>
      <Button onClick={startConversation} disabled={creating} size="lg" className="gap-2">
        {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {lang === "ar" ? "بدء المحادثة" : "Start Conversation"}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold">Autel AI · Claude</span>
        </div>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setConvId(null); setMessages([]); }}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
            }`}>
              {msg.role === "assistant" && <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Bot className="w-3 h-3" /> Autel AI</div>}
              <div className="space-y-0.5">{render(msg.content)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 border-t border-border p-3 space-y-2">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={streaming}
            placeholder={lang === "ar" ? "اسأل عن التشخيص..." : "Ask about the diagnosis..."}
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            dir={lang === "ar" ? "rtl" : "ltr"} />
          <Button size="icon" onClick={sendMessage} disabled={streaming || !input.trim()}>
            {streaming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          {lang === "ar" ? "مدعوم بـ Claude AI من Anthropic" : "Powered by Claude AI from Anthropic"}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function DiagnosticSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, lang } = useI18n();
  const criticalAlertSent = useRef(false);
  const historyRef = useRef<Map<number, number[]>>(new Map());
  const [, forceUpdate] = useState(0);
  const [activeTab, setActiveTab] = useState<"dtc" | "live" | "bidir" | "ai">("dtc");

  const { data: session, isLoading: sessionLoading } = useGetDiagnosticSession(sessionId, {
    query: { enabled: !!sessionId, queryKey: ["/api/diagnostics/sessions", sessionId] }
  });
  const { data: dtcCodes, isLoading: dtcLoading } = useListDtcCodes({ sessionId }, {
    query: { enabled: !!sessionId, queryKey: ["/api/diagnostics/sessions/dtc", { sessionId }] }
  });
  const { data: liveData } = useGetLiveData({ sessionId }, {
    query: { enabled: !!sessionId, queryKey: ["/api/diagnostics/sessions/livedata", { sessionId }], refetchInterval: 2000 }
  });

  useEffect(() => {
    if (!dtcCodes || criticalAlertSent.current) return;
    const crits = dtcCodes.filter(c => c.severity === "critical" && c.status === "active");
    if (crits.length > 0) {
      criticalAlertSent.current = true;
      toast({
        title: lang === "ar" ? `⚠ ${crits.length} عطل حرج نشط` : `⚠ ${crits.length} Critical Fault Code${crits.length > 1 ? "s" : ""}`,
        description: lang === "ar" ? `الأكواد: ${crits.map(c => c.code).join(", ")}` : `Codes: ${crits.map(c => c.code).join(", ")}`,
        variant: "destructive",
      });
    }
  }, [dtcCodes, lang, toast]);

  useEffect(() => {
    if (!liveData) return;
    liveData.forEach(p => {
      if (p.currentNumericValue === undefined) return;
      const prev = historyRef.current.get(p.id) || [];
      historyRef.current.set(p.id, [...prev, p.currentNumericValue].slice(-MAX_HISTORY));
    });
    // Trigger re-render after ref update - using microtask to avoid "cascading render" lint error
    queueMicrotask(() => {
      forceUpdate(n => n + 1);
    });
  }, [liveData]);

  const clearCode = useClearDtcCode();
  const handleClearCode = useCallback((codeId: number) => {
    clearCode.mutate({ id: codeId } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDtcCodesQueryKey({ sessionId }) });
        toast({ title: t("sessionCleared") });
      }
    });
  }, [clearCode, queryClient, sessionId, t, toast]);

  if (sessionLoading) return (
    <div className="p-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-secondary/40 animate-pulse rounded-xl" />)}
    </div>
  );
  if (!session) return <div className="p-8 text-red-400">Session not found</div>;

  const criticalCount = dtcCodes?.filter(c => c.severity === "critical" && c.status === "active").length || 0;
  const warningCount  = dtcCodes?.filter(c => c.severity === "warning"  && c.status === "active").length || 0;

  const formattedStartedAt = useMemo(() =>
    new Date(session.startedAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }),
  [session.startedAt, lang]);

  const TABS = [
    { key: "dtc",   icon: AlertTriangle, label: lang === "ar" ? "أكواد الأعطال" : "Fault Codes",   count: dtcCodes?.length },
    { key: "live",  icon: Gauge,          label: lang === "ar" ? "البيانات الحية" : "Live Data",    count: liveData?.length },
    { key: "bidir", icon: Settings2,      label: lang === "ar" ? "تحكم ثنائي"   : "Bi-Directional" },
    { key: "ai",    icon: Bot,            label: lang === "ar" ? "مساعد AI"      : "AI Assistant",  badge: "AI" },
  ] as const;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/diagnostics">
            <Button variant="ghost" size="icon" className="rounded-xl w-9 h-9 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black tracking-tight">{session.vehicleName}</h1>
              <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
                session.status === "completed" ? "bg-green-500/15 text-green-400" :
                session.status === "running"   ? "bg-blue-500/15 text-blue-400 animate-pulse" :
                "bg-red-500/15 text-red-400"
              }`}>
                {session.status === "completed" ? (lang === "ar" ? "مكتمل" : "Completed") :
                 session.status === "running"   ? (lang === "ar" ? "جارٍ"  : "Running")   : (lang === "ar" ? "فشل" : "Failed")}
              </span>
              {criticalCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-red-500/15 text-red-400 font-bold animate-pulse">
                  <ShieldAlert className="w-3 h-3" /> {criticalCount} {lang === "ar" ? "حرج" : "Critical"}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-yellow-500/15 text-yellow-400 font-bold">
                  <AlertTriangle className="w-3 h-3" /> {warningCount} {lang === "ar" ? "تحذير" : "Warning"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formattedStartedAt}
              {" · "}{session.systemsScanned}/{session.totalSystems} {lang === "ar" ? "نظام" : "systems"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {"count" in tab && tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab.key === "dtc" && criticalCount > 0 ? "bg-red-500/20 text-red-400" : "bg-secondary text-muted-foreground"
                }`}>{tab.count}</span>
              )}
              {"badge" in tab && tab.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">{tab.badge}</span>
              )}
              {tab.key === "live" && liveData && liveData.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {/* DTC TAB */}
        {activeTab === "dtc" && (
          dtcLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-secondary/40 animate-pulse rounded-xl" />)}</div>
          ) : dtcCodes?.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center border border-dashed border-green-500/30 bg-green-500/5 rounded-2xl gap-3">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <div className="text-center">
                <p className="font-bold text-green-400">{t("sessionNoDtc")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("sessionNoDtcSub")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {dtcCodes?.map(dtc => (
                <DtcCard key={dtc.id} dtc={dtc} sessionId={sessionId} lang={lang}
                  onClear={() => handleClearCode(dtc.id)} />
              ))}
            </div>
          )
        )}

        {/* LIVE DATA TAB */}
        {activeTab === "live" && (
          !liveData || liveData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center gap-3 text-muted-foreground border border-dashed border-border rounded-2xl">
              <Gauge className="w-10 h-10 opacity-30" />
              <p className="text-sm">{lang === "ar" ? "لا بيانات حية متاحة" : "No live data available"}</p>
            </div>
          ) : (
            <LiveDataTab liveData={liveData} historyRef={historyRef} lang={lang} />
          )
        )}

        {/* BIDIRECTIONAL TAB */}
        {activeTab === "bidir" && <BiDirectionalTab lang={lang} />}

        {/* AI TAB */}
        {activeTab === "ai" && (
          <AiPanel session={session} dtcCodes={dtcCodes} liveData={liveData} lang={lang} />
        )}
      </div>
    </div>
  );
}
