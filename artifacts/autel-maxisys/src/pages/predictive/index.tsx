import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import {
  BrainCircuit, AlertTriangle, CheckCircle2, Clock, Wrench,
  TrendingUp, ChevronRight, Gauge, ShieldAlert, Flame, Zap,
  Thermometer, Battery, Activity, RotateCcw, Package, CalendarDays,
  ArrowUp, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Prediction data
───────────────────────────────────────────── */
interface ComponentRisk {
  id: string;
  componentAr: string;
  componentEn: string;
  systemAr: string;
  systemEn: string;
  risk: number;
  daysLeft: number;
  milesLeft: number;
  costMin: number;
  costMax: number;
  symptomsAr: string[];
  symptomsEn: string[];
  actionAr: string;
  actionEn: string;
  icon: any;
  color: string;
  level: "critical" | "high" | "medium" | "low";
}

const RISKS: ComponentRisk[] = [
  {
    id: "turbo",
    componentAr: "التوربو (Turbocharger)",
    componentEn: "Turbocharger",
    systemAr: "المحرك",
    systemEn: "Engine",
    risk: 84,
    daysLeft: 38,
    milesLeft: 4100,
    costMin: 380,
    costMax: 520,
    symptomsAr: ["انخفاض ضغط التوربو — P0234", "تأخر في التسارع فوق 3000 RPM", "صوت هواء خافت من كوع الضغط"],
    symptomsEn: ["Boost pressure drop — P0234", "Turbo lag above 3000 RPM", "Faint air sound from intercooler hose"],
    actionAr: "فحص صمام الضغط وأنابيم التوربو",
    actionEn: "Inspect wastegate actuator & boost hoses",
    icon: Flame,
    color: "#ef4444",
    level: "critical",
  },
  {
    id: "brakes",
    componentAr: "تيل الفرامل الأمامي",
    componentEn: "Front Brake Pads",
    systemAr: "الفرامل",
    systemEn: "Brakes",
    risk: 73,
    daysLeft: 28,
    milesLeft: 2800,
    costMin: 180,
    costMax: 260,
    symptomsAr: ["مؤشر الاهتراء عند 2mm", "ضوضاء خفيفة عند الكبح"],
    symptomsEn: ["Wear indicator at 2mm", "Slight squeal during braking"],
    actionAr: "تغيير تيل الفرامل الأمامي — المحور بالكامل",
    actionEn: "Replace front brake pads — full axle",
    icon: ShieldAlert,
    color: "#f97316",
    level: "high",
  },
  {
    id: "battery",
    componentAr: "بطارية السيارة",
    componentEn: "Lead-Acid Battery",
    systemAr: "الكهرباء",
    systemEn: "Electrical",
    risk: 62,
    daysLeft: 65,
    milesLeft: 7200,
    costMin: 140,
    costMax: 220,
    symptomsAr: ["سعة الشحن انخفضت لـ 68%", "جهد البطارية البارد 11.9V"],
    symptomsEn: ["Charge capacity dropped to 68%", "Cold cranking voltage 11.9V"],
    actionAr: "اختبار البطارية بمحلل SOH ثم تغيير إذا لزم",
    actionEn: "Test with SOH analyzer then replace if needed",
    icon: Battery,
    color: "#eab308",
    level: "high",
  },
  {
    id: "spark",
    componentAr: "شمعات الإشعال",
    componentEn: "Spark Plugs",
    systemAr: "إشعال المحرك",
    systemEn: "Ignition",
    risk: 45,
    daysLeft: 90,
    milesLeft: 9800,
    costMin: 80,
    costMax: 160,
    symptomsAr: ["MISFIRE خفيف عند التدفئة — P0301", "استهلاك وقود زائد 8%"],
    symptomsEn: ["Slight misfire on cold start — P0301", "Fuel consumption +8%"],
    actionAr: "تغيير شمعات الإشعال بشكل دوري",
    actionEn: "Replace spark plugs at scheduled interval",
    icon: Zap,
    color: "#a3e635",
    level: "medium",
  },
  {
    id: "coolant",
    componentAr: "ترموستات المبرد",
    componentEn: "Coolant Thermostat",
    systemAr: "تبريد المحرك",
    systemEn: "Engine Cooling",
    risk: 31,
    daysLeft: 145,
    milesLeft: 14000,
    costMin: 90,
    costMax: 150,
    symptomsAr: ["درجة الحرارة تتأخر في الوصول", "P0128 دوري"],
    symptomsEn: ["Temperature slow to reach normal", "P0128 intermittent"],
    actionAr: "مراقبة ECT ثم تغيير الترموستات",
    actionEn: "Monitor ECT reading then replace thermostat",
    icon: Thermometer,
    color: "#22d3ee",
    level: "low",
  },
];

const CALENDAR_MONTHS = [
  { month: 5, year: 2026, events: [{ label: "Brake Pads", labelAr: "تيل فرامل", color: "#f97316" }] },
  { month: 6, year: 2026, events: [{ label: "Turbo Service", labelAr: "صيانة توربو", color: "#ef4444" }] },
  { month: 7, year: 2026, events: [{ label: "Battery Test", labelAr: "فحص بطارية", color: "#eab308" }] },
  { month: 8, year: 2026, events: [] },
  { month: 9, year: 2026, events: [{ label: "Spark Plugs", labelAr: "شمعات", color: "#a3e635" }] },
  { month: 10, year: 2026, events: [{ label: "Oil Service", labelAr: "زيت المحرك", color: "#3b82f6" }] },
  { month: 11, year: 2026, events: [{ label: "Thermostat", labelAr: "ترموستات", color: "#22d3ee" }] },
  { month: 12, year: 2026, events: [] },
];

const MONTH_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTH_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─────────────────────────────────────────────
   Animated bar component
───────────────────────────────────────────── */
function RiskBar({ risk, color, delay = 0 }: { risk: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(risk), 300 + delay);
    return () => clearTimeout(t);
  }, [risk, delay]);
  return (
    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Circular AI score gauge
───────────────────────────────────────────── */
function AiScoreGauge({ score, label }: { score: number; label: string }) {
  const [displayed, setDisplayed] = useState(0);
  const R = 52;
  const circ = 2 * Math.PI * R;
  const dash = ((100 - displayed) / 100) * circ;
  useEffect(() => {
    let n = 0;
    const interval = setInterval(() => {
      n += 2;
      setDisplayed(Math.min(n, score));
      if (n >= score) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [score]);
  const color = displayed >= 70 ? "#ef4444" : displayed >= 45 ? "#f97316" : "#22c55e";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={R} fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            style={{ transition: "stroke-dashoffset 0.05s linear, stroke 0.5s", filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color }}>{displayed}</span>
          <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
        </div>
      </div>
      <div className="text-[11px] text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function PredictiveMaintenance() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [selectedRisk, setSelectedRisk] = useState<ComponentRisk | null>(RISKS[0]);
  const [confidenceAnim, setConfidenceAnim] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setConfidenceAnim(91), 600);
    return () => clearTimeout(t);
  }, []);

  const totalCostMin = RISKS.reduce((s, r) => s + r.costMin, 0);
  const totalCostMax = RISKS.reduce((s, r) => s + r.costMax, 0);
  const criticalCount = RISKS.filter(r => r.level === "critical" || r.level === "high").length;

  const levelLabel = (level: string) => {
    if (isAr) {
      if (level === "critical") return "حرج";
      if (level === "high") return "مرتفع";
      if (level === "medium") return "متوسط";
      return "منخفض";
    } else {
      if (level === "critical") return "Critical";
      if (level === "high") return "High";
      if (level === "medium") return "Medium";
      return "Low";
    }
  };
  const levelColor = (level: string) => {
    if (level === "critical") return "#ef4444";
    if (level === "high") return "#f97316";
    if (level === "medium") return "#eab308";
    return "#22c55e";
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#080b12]">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-violet-400" />
          <BrainCircuit className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-lg font-black text-white leading-none">
              {isAr ? "الصيانة التنبؤية — ذكاء اصطناعي" : "Predictive Maintenance AI"}
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? "تحليل الأعطال المتوقعة بناءً على أنماط القيادة وبيانات المستشعرات" : "Failure prediction based on driving patterns and live sensor data"}
            </p>
          </div>
        </div>

        {/* AI Confidence badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/30 bg-violet-500/8">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[10px] text-violet-400 font-mono font-bold">
            {isAr ? `دقة النموذج: ${confidenceAnim}%` : `AI Confidence: ${confidenceAnim}%`}
          </span>
          <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-violet-400 transition-all duration-1000 ease-out" style={{ width: `${confidenceAnim}%` }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left panel — Risk list */}
        <div className="w-[300px] shrink-0 border-r border-white/[0.05] flex flex-col overflow-y-auto bg-[#070a10]">
          {/* Summary */}
          <div className="p-4 border-b border-white/[0.05]">
            <AiScoreGauge
              score={68}
              label={isAr ? "مؤشر مخاطر الأسطول" : "Fleet Risk Index"}
            />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: isAr ? "عناصر" : "Items", value: RISKS.length, color: "#94a3b8" },
                { label: isAr ? "حرج/مرتفع" : "Critical", value: criticalCount, color: "#ef4444" },
                { label: isAr ? "تكلفة" : "Est. Cost", value: `$${totalCostMin}+`, color: "#eab308" },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <div className="text-xs font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Component list */}
          <div className="p-3 space-y-1.5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-1 mb-2">
              {isAr ? "المكونات المعرضة للخطر" : "At-Risk Components"}
            </div>
            {RISKS.map((r, i) => {
              const RIcon = r.icon;
              const isSelected = selectedRisk?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRisk(r)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all duration-200",
                    isSelected
                      ? "bg-white/[0.06] border-white/[0.12]"
                      : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: r.color + "20" }}>
                      <RIcon className="w-3.5 h-3.5" style={{ color: r.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {isAr ? r.componentAr : r.componentEn}
                      </div>
                      <div className="text-[9px] text-slate-600">{isAr ? r.systemAr : r.systemEn}</div>
                    </div>
                    <div className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: levelColor(r.level) + "20", color: levelColor(r.level) }}>
                      {levelLabel(r.level)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black" style={{ color: r.color }}>{r.risk}%</span>
                    <span className="text-[9px] text-slate-600">
                      {isAr ? `${r.daysLeft} يوم` : `${r.daysLeft}d`}
                    </span>
                  </div>
                  <RiskBar risk={r.risk} color={r.color} delay={i * 80} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Center — Detail + Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Component detail */}
          {selectedRisk && (() => {
            const r = selectedRisk;
            const RIcon = r.icon;
            return (
              <div className="p-5 border-b border-white/[0.05]" style={{ animation: "stepFadeIn 0.25s ease both" }}>
                {/* Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: r.color + "18", border: `1.5px solid ${r.color}40` }}>
                    <RIcon className="w-6 h-6" style={{ color: r.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black text-white">{isAr ? r.componentAr : r.componentEn}</h2>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{ backgroundColor: levelColor(r.level) + "20", color: levelColor(r.level) }}>
                        {levelLabel(r.level)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{isAr ? r.systemAr : r.systemEn}</p>
                  </div>

                  {/* Risk score big */}
                  <div className="text-right">
                    <div className="text-4xl font-black tabular-nums" style={{ color: r.color }}>{r.risk}%</div>
                    <div className="text-[10px] text-slate-600">{isAr ? "احتمال العطل" : "Failure probability"}</div>
                  </div>
                </div>

                {/* Risk bar */}
                <div className="mb-4">
                  <RiskBar risk={r.risk} color={r.color} />
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { k: isAr ? "الأيام المتبقية" : "Days Left", v: `${r.daysLeft}d`, icon: Clock, c: r.color },
                    { k: isAr ? "الكيلومترات" : "Miles Left", v: `${(r.milesLeft/1000).toFixed(1)}k`, icon: Gauge, c: r.color },
                    { k: isAr ? "تكلفة دنيا" : "Min Cost", v: `$${r.costMin}`, icon: ArrowRight, c: "#22c55e" },
                    { k: isAr ? "تكلفة عليا" : "Max Cost", v: `$${r.costMax}`, icon: ArrowUp, c: "#f97316" },
                  ].map(m => {
                    const MIcon = m.icon;
                    return (
                      <div key={m.k} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <MIcon className="w-3.5 h-3.5 mb-1.5" style={{ color: m.c }} />
                        <div className="text-sm font-black text-white">{m.v}</div>
                        <div className="text-[9px] text-slate-600 mt-0.5">{m.k}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Symptoms & Action */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                      {isAr ? "الأعراض المرصودة" : "Detected Symptoms"}
                    </div>
                    <ul className="space-y-1.5">
                      {(isAr ? r.symptomsAr : r.symptomsEn).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                          <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: r.color }} />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl border"
                    style={{ backgroundColor: r.color + "08", borderColor: r.color + "30" }}>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: r.color + "aa" }}>
                      {isAr ? "الإجراء الموصى به" : "Recommended Action"}
                    </div>
                    <div className="flex items-start gap-2">
                      <Wrench className="w-4 h-4 shrink-0 mt-0.5" style={{ color: r.color }} />
                      <p className="text-[12px] font-medium text-white leading-relaxed">
                        {isAr ? r.actionAr : r.actionEn}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Maintenance Calendar */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-black text-white">
                {isAr ? "جدول الصيانة — 8 أشهر قادمة" : "Maintenance Calendar — Next 8 Months"}
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {CALENDAR_MONTHS.map(({ month, year, events }) => {
                const isPast = month < 5;
                return (
                  <div key={month} className={cn(
                    "p-3 rounded-xl border",
                    events.length > 0
                      ? "bg-white/[0.03] border-white/[0.08]"
                      : "bg-white/[0.01] border-white/[0.04]"
                  )}>
                    <div className="text-[10px] font-bold text-slate-500 mb-2">
                      {isAr ? MONTH_AR[month - 1] : MONTH_EN[month - 1]} {year}
                    </div>
                    {events.length === 0 ? (
                      <div className="flex items-center gap-1 text-[9px] text-slate-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {isAr ? "لا صيانة" : "Clear"}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {events.map((ev, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                            <span className="text-[10px] font-medium" style={{ color: ev.color }}>
                              {isAr ? ev.labelAr : ev.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total cost estimate */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-violet-400" />
                  <div>
                    <div className="text-sm font-black text-white">
                      {isAr ? "إجمالي تكلفة الصيانة المتوقعة" : "Total Projected Maintenance Cost"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isAr ? "يشمل قطع الغيار والعمالة" : "Includes parts and labor estimate"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-violet-400">${totalCostMin}–{totalCostMax}</div>
                  <div className="text-[10px] text-slate-600">USD</div>
                </div>
              </div>

              {/* Mini cost bars per component */}
              <div className="mt-4 space-y-2">
                {RISKS.map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="text-[10px] text-slate-500 w-32 truncate">
                      {isAr ? r.componentAr : r.componentEn}
                    </div>
                    <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{
                          width: `${(r.costMax / totalCostMax) * 100}%`,
                          backgroundColor: r.color,
                          opacity: 0.8,
                        }} />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 w-20 text-right">
                      ${r.costMin}–{r.costMax}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right mini panel — Actions queue */}
        <div className="w-[230px] shrink-0 border-l border-white/[0.05] flex flex-col overflow-y-auto bg-[#070a10]">
          <div className="p-4">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
              {isAr ? "قائمة الإجراءات الأولوية" : "Priority Action Queue"}
            </div>
            <div className="space-y-2">
              {RISKS.filter(r => r.level !== "low").sort((a, b) => b.risk - a.risk).map((r, i) => {
                const RIcon = r.icon;
                return (
                  <div key={r.id} className="flex items-start gap-2.5 p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: r.color + "20" }}>
                      <RIcon className="w-3 h-3" style={{ color: r.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-white truncate">
                        {isAr ? r.componentAr.split(" ")[0] : r.componentEn.split(" ").slice(0, 2).join(" ")}
                      </div>
                      <div className="text-[9px] text-slate-600">
                        {isAr ? `خلال ${r.daysLeft} يوم` : `In ${r.daysLeft} days`}
                      </div>
                    </div>
                    <span className="text-[9px] font-black" style={{ color: r.color }}>{r.risk}%</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
                {isAr ? "إحصاءات AI" : "AI Stats"}
              </div>
              {[
                { label: isAr ? "نماذج محللة" : "Models Analyzed", v: "41 vehicles" },
                { label: isAr ? "نقاط بيانات" : "Data Points", v: "127,840" },
                { label: isAr ? "دقة التنبؤ" : "Prediction Accuracy", v: "91%" },
                { label: isAr ? "آخر تحديث" : "Last Updated", v: "2 min ago" },
              ].map(s => (
                <div key={s.label} className="flex justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-[9px] text-slate-600">{s.label}</span>
                  <span className="text-[9px] font-mono text-slate-400">{s.v}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-green-500/8 border border-green-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] font-bold text-green-400">
                  {isAr ? "2 مركبات سليمة 100%" : "2 Vehicles 100% OK"}
                </span>
              </div>
              <p className="text-[9px] text-green-400/60 leading-relaxed">
                {isAr ? "2023 Lexus LX 600 و Nissan Patrol" : "2023 Lexus LX 600 & Nissan Patrol"}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
