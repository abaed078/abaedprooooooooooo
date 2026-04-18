import { useState, useEffect } from "react";
import { useGetDiagnosticSummary } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useActiveVehicle } from "@/lib/vehicle-context";
import {
  Gauge, Settings2, Activity, ShieldAlert, Cpu, Thermometer,
  ShieldCheck, LayoutGrid, Zap, Fuel, Radio, Target, Battery,
  Car, ChevronRight, AlertTriangle, CheckCircle2, WifiOff,
  ArrowRight, Info, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────
   System definitions
────────────────────────────────────────────── */
type Status = "ok" | "warn" | "critical" | "offline";

interface SystemDef {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: any;
  category: string;
  categoryAr: string;
  zone: string;
  protocols: string[];
  descAr: string;
  descEn: string;
}

const SYSTEMS: SystemDef[] = [
  // Engine zone
  { id: "ecm",   nameAr: "وحدة التحكم بالمحرك",     nameEn: "Engine Control Module",      icon: Gauge,       category: "Powertrain",  categoryAr: "الدفع",    zone: "engine",  protocols: ["CAN", "UDS"],          descAr: "التحكم بالحقن ووقت الاشتعال وانبعاثات المحرك", descEn: "Controls fuel injection, ignition timing and emissions" },
  { id: "tcm",   nameAr: "وحدة التحكم بناقل الحركة", nameEn: "Transmission Control",       icon: Settings2,   category: "Powertrain",  categoryAr: "الدفع",    zone: "engine",  protocols: ["CAN", "UDS"],          descAr: "يتحكم في تغيير التروس وزيت ناقل الحركة",       descEn: "Controls gear shifting and transmission fluid" },
  { id: "batt",  nameAr: "نظام البطارية / الشحن",    nameEn: "Battery & Charging System",  icon: Battery,     category: "Electrical",  categoryAr: "كهرباء",   zone: "engine",  protocols: ["LIN", "CAN"],          descAr: "مراقبة شحن البطارية وجهد الدينامو",            descEn: "Monitors battery charge and alternator voltage" },
  // Safety zone
  { id: "abs",   nameAr: "نظام الفرامل ABS",          nameEn: "ABS / Brake System",         icon: Activity,    category: "Safety",      categoryAr: "سلامة",    zone: "safety",  protocols: ["CAN", "ISO 15765"],    descAr: "نظام الفرامل المانع للانغلاق ومراقبة الانزلاق", descEn: "Anti-lock braking and traction control" },
  { id: "srs",   nameAr: "الوسائد الهوائية SRS",      nameEn: "SRS / Airbag System",        icon: ShieldAlert, category: "Safety",      categoryAr: "سلامة",    zone: "safety",  protocols: ["CAN", "ISO 14229"],    descAr: "وسائد هوائية وأحزمة ومستشعرات الاصطدام",       descEn: "Airbags, seatbelt pretensioners and crash sensors" },
  { id: "tpms",  nameAr: "ضغط الإطارات TPMS",         nameEn: "Tire Pressure Monitor",      icon: Target,      category: "Safety",      categoryAr: "سلامة",    zone: "safety",  protocols: ["315MHz RF", "LIN"],    descAr: "مراقبة ضغط الإطارات الأربع في الوقت الفعلي",   descEn: "Real-time tire pressure monitoring for all 4 wheels" },
  // Body zone
  { id: "bcm",   nameAr: "وحدة التحكم بالهيكل BCM",  nameEn: "Body Control Module",        icon: Cpu,         category: "Body",        categoryAr: "هيكل",     zone: "body",    protocols: ["CAN", "LIN"],          descAr: "الإضاءة والنوافذ والأبواب والمرايا",            descEn: "Lighting, windows, doors, mirrors control" },
  { id: "hvac",  nameAr: "نظام التكييف HVAC",          nameEn: "HVAC Climate Control",       icon: Thermometer, category: "Body",        categoryAr: "هيكل",     zone: "body",    protocols: ["LIN", "CAN"],          descAr: "التحكم في درجة الحرارة والمروحة والتبريد",     descEn: "Temperature, fan, and AC compressor control" },
  { id: "ic",    nameAr: "لوحة العدادات",             nameEn: "Instrument Cluster",         icon: LayoutGrid,  category: "Body",        categoryAr: "هيكل",     zone: "body",    protocols: ["CAN"],                 descAr: "عرض السرعة والدورات ومؤشرات التحذير",          descEn: "Speed, RPM display and warning indicators" },
  { id: "immo",  nameAr: "نظام مانع السرقة",          nameEn: "Immobilizer System",         icon: ShieldCheck, category: "Security",    categoryAr: "أمان",     zone: "body",    protocols: ["ISO 14230", "RF"],     descAr: "نظام مانع السرقة ومصادقة المفتاح",             descEn: "Anti-theft and key authentication system" },
  // Advanced zone
  { id: "eps",   nameAr: "التوجيه الكهربائي EPS",     nameEn: "Electric Power Steering",    icon: Settings2,   category: "Chassis",     categoryAr: "شاسيه",    zone: "advanced",protocols: ["CAN", "SENT"],         descAr: "نظام التوجيه الكهربائي ومساعدة القيادة",       descEn: "Electric steering assist and lane keeping" },
  { id: "adas",  nameAr: "أنظمة قيادة ADAS",          nameEn: "ADAS Driver Assistance",     icon: Radio,       category: "ADAS",        categoryAr: "مساعدة",   zone: "advanced",protocols: ["CAN FD", "MOST"],      descAr: "كاميرا أمامية، رادار، جهاز استشعار الحارة",    descEn: "Front camera, radar, LKA, ACC, blind spot" },
  { id: "pdc",   nameAr: "أجهزة الاستشعار للركن",    nameEn: "Parking Distance Control",   icon: Target,      category: "ADAS",        categoryAr: "مساعدة",   zone: "advanced",protocols: ["LIN", "CAN"],          descAr: "أجهزة استشعار الركن الأمامية والخلفية بالموجات فوق الصوتية", descEn: "Front/rear parking sensors using ultrasonic" },
  // Powertrain extended
  { id: "fuel",  nameAr: "نظام الوقود والعادم",       nameEn: "Fuel & Exhaust System",      icon: Fuel,        category: "Powertrain",  categoryAr: "الدفع",    zone: "fuel",    protocols: ["CAN"],                 descAr: "مضخة الوقود، الحاقنات، نظام معالجة العادم",    descEn: "Fuel pump, injectors, exhaust aftertreatment" },
  { id: "cat",   nameAr: "محول حفازي / DPF",          nameEn: "Catalytic Converter / DPF",  icon: Zap,         category: "Emissions",   categoryAr: "انبعاثات", zone: "fuel",    protocols: ["OBD-II", "CAN"],       descAr: "محول العوادم الحفازي ومرشح الجسيمات",          descEn: "Catalytic converter and diesel particulate filter" },
];

/* Status generator based on system id + seed */
function getStatus(id: string, seed: number): Status {
  const v = Math.abs(Math.sin(seed * 7 + id.charCodeAt(0) * 3 + id.length));
  if (v > 0.85) return "critical";
  if (v > 0.70) return "warn";
  if (v > 0.10) return "ok";
  return "offline";
}

/* Color maps */
const STATUS_COLORS = {
  ok:       { ring: "#22c55e", glow: "#22c55e55", text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  label: { ar: "سليم",    en: "Healthy"  } },
  warn:     { ring: "#eab308", glow: "#eab30855", text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: { ar: "تحذير",   en: "Warning"  } },
  critical: { ring: "#ef4444", glow: "#ef444455", text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/40",    label: { ar: "حرج",     en: "Critical" } },
  offline:  { ring: "#475569", glow: "#47556944", text: "text-slate-500",  bg: "bg-slate-500/5",   border: "border-slate-500/20",  label: { ar: "غير متصل", en: "Offline" } },
};

const ZONE_INFO: Record<string, { labelAr: string; labelEn: string; color: string }> = {
  engine:   { labelAr: "محرك",   labelEn: "Powertrain",  color: "#3b82f6" },
  safety:   { labelAr: "سلامة",  labelEn: "Safety",      color: "#ef4444" },
  body:     { labelAr: "هيكل",   labelEn: "Body",        color: "#a855f7" },
  advanced: { labelAr: "متقدم",  labelEn: "Advanced",    color: "#06b6d4" },
  fuel:     { labelAr: "وقود",   labelEn: "Fuel/Exhaust",color: "#f97316" },
};

/* ──────────────────────────────────────────────
   Sub-components
────────────────────────────────────────────── */
function StatusDot({ status, pulse }: { status: Status; pulse?: boolean }) {
  const c = STATUS_COLORS[status];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && status === "critical" && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: c.ring }} />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: c.ring, boxShadow: `0 0 6px ${c.glow}` }} />
    </span>
  );
}

function SystemCard({
  sys, status, selected, onClick, isAr
}: {
  sys: SystemDef; status: Status; selected: boolean; onClick: () => void; isAr: boolean;
}) {
  const c = STATUS_COLORS[status];
  const Icon = sys.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        "hover:scale-[1.01] hover:shadow-lg",
        selected
          ? `${c.border} ${c.bg} ring-1 ring-offset-0 shadow-lg`
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]",
        status === "critical" && "animate-[borderPulse_2s_ease-in-out_infinite]"
      )}
      style={selected ? { boxShadow: `0 0 16px ${STATUS_COLORS[status].glow}` } : {}}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", c.bg, "border", c.border)}>
        <Icon className={cn("w-4 h-4", c.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} pulse />
          <span className="text-xs font-bold text-white truncate">{isAr ? sys.nameAr : sys.nameEn}</span>
        </div>
        <div className="text-[10px] text-slate-600 font-mono mt-0.5">{sys.protocols[0]}</div>
      </div>
      <ChevronRight className={cn("w-3.5 h-3.5 shrink-0 transition-transform", selected && "rotate-90", "text-slate-600")} />
    </button>
  );
}

/* ─── Top-down SVG car diagram ──────────────── */
function CarDiagram({
  systems, statuses, selectedId, onSelect, isAr
}: {
  systems: SystemDef[];
  statuses: Record<string, Status>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isAr: boolean;
}) {
  const zoneStatus = (zone: string): Status => {
    const zoneSystems = systems.filter(s => s.zone === zone);
    if (zoneSystems.some(s => statuses[s.id] === "critical")) return "critical";
    if (zoneSystems.some(s => statuses[s.id] === "warn")) return "warn";
    if (zoneSystems.every(s => statuses[s.id] === "offline")) return "offline";
    return "ok";
  };

  const zoneColor = (zone: string) => {
    const s = zoneStatus(zone);
    return STATUS_COLORS[s].ring;
  };

  const zoneGlow = (zone: string) => {
    const s = zoneStatus(zone);
    return STATUS_COLORS[s].glow;
  };

  const zoneBg = (zone: string) => {
    const c = zoneStatus(zone);
    if (c === "critical") return "rgba(239,68,68,0.12)";
    if (c === "warn") return "rgba(234,179,8,0.10)";
    if (c === "ok") return "rgba(34,197,94,0.07)";
    return "rgba(71,85,105,0.06)";
  };

  const zones = ["engine", "safety", "body", "advanced", "fuel"];

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* SVG car top-down */}
      <svg viewBox="0 0 320 580" className="w-full max-w-[300px]" style={{ filter: "drop-shadow(0 0 30px rgba(59,130,246,0.08))" }}>
        {/* Car outer body */}
        <defs>
          {zones.map(z => (
            <radialGradient key={z} id={`glow-${z}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={zoneColor(z)} stopOpacity="0.25" />
              <stop offset="100%" stopColor={zoneColor(z)} stopOpacity="0" />
            </radialGradient>
          ))}
          <filter id="carGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Car silhouette - body */}
        <path d="M 80 520 Q 30 520 25 470 L 20 380 L 15 200 Q 15 100 80 80 L 130 65 Q 160 58 160 58 Q 160 58 190 65 L 240 80 Q 305 100 305 200 L 300 380 L 295 470 Q 290 520 240 520 Z"
          fill="#0d1117" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />

        {/* Windshield front */}
        <path d="M 100 90 Q 160 72 220 90 L 215 140 Q 160 128 105 140 Z"
          fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />

        {/* Windshield rear */}
        <path d="M 100 480 Q 160 498 220 480 L 215 440 Q 160 452 105 440 Z"
          fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />

        {/* Wheels */}
        {[
          [22, 155], [278, 155], [22, 395], [278, 395]
        ].map(([cx, cy], i) => (
          <g key={i}>
            <rect x={cx - 18} y={cy - 30} width="36" height="60" rx="8"
              fill="#0a0d14" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx={cx} cy={cy} r="5" fill="rgba(255,255,255,0.12)" />
          </g>
        ))}

        {/* Door lines */}
        <line x1="55" y1="240" x2="265" y2="240" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 3" />
        <line x1="55" y1="340" x2="265" y2="340" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 3" />

        {/* ZONE: engine (top) */}
        <g onClick={() => onSelect("ecm")} style={{ cursor: "pointer" }}>
          <rect x="75" y="72" width="170" height="115" rx="10" fill={zoneBg("engine")}
            stroke={zoneColor("engine")} strokeWidth={zoneStatus("engine") === "critical" ? "2" : "1"}
            strokeOpacity={zoneStatus("engine") === "critical" ? "0.8" : "0.3"}
            style={{ filter: `drop-shadow(0 0 8px ${zoneGlow("engine")})` }} />
          <rect x="75" y="72" width="170" height="115" rx="10" fill={`url(#glow-engine)`} />
          <text x="160" y="112" textAnchor="middle" fontSize="9" fontWeight="700" fill={zoneColor("engine")} letterSpacing="1">{isAr ? "المحرك" : "ENGINE"}</text>
          <text x="160" y="126" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.4)">ECM · TCM · Battery</text>
          {/* status dot */}
          <circle cx="232" cy="84" r="5" fill={zoneColor("engine")}
            style={{ filter: `drop-shadow(0 0 4px ${zoneColor("engine")})` }}>
            {zoneStatus("engine") === "critical" && <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* ZONE: advanced (ADAS - very top strip) */}
        <g onClick={() => onSelect("adas")} style={{ cursor: "pointer" }}>
          <rect x="95" y="55" width="130" height="22" rx="5" fill={zoneBg("advanced")}
            stroke={zoneColor("advanced")} strokeWidth="1" strokeOpacity="0.4" />
          <text x="160" y="70" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={zoneColor("advanced")} letterSpacing="1">ADAS</text>
          <circle cx="218" cy="64" r="4" fill={zoneColor("advanced")}
            style={{ filter: `drop-shadow(0 0 3px ${zoneColor("advanced")})` }}>
            {zoneStatus("advanced") === "critical" && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* ZONE: safety (middle top) */}
        <g onClick={() => onSelect("abs")} style={{ cursor: "pointer" }}>
          <rect x="75" y="198" width="170" height="90" rx="10" fill={zoneBg("safety")}
            stroke={zoneColor("safety")} strokeWidth={zoneStatus("safety") === "critical" ? "2" : "1"}
            strokeOpacity={zoneStatus("safety") === "critical" ? "0.8" : "0.3"}
            style={{ filter: `drop-shadow(0 0 8px ${zoneGlow("safety")})` }} />
          <rect x="75" y="198" width="170" height="90" rx="10" fill={`url(#glow-safety)`} />
          <text x="160" y="237" textAnchor="middle" fontSize="9" fontWeight="700" fill={zoneColor("safety")} letterSpacing="1">{isAr ? "السلامة" : "SAFETY"}</text>
          <text x="160" y="251" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.4)">ABS · SRS · TPMS</text>
          <circle cx="232" cy="210" r="5" fill={zoneColor("safety")}
            style={{ filter: `drop-shadow(0 0 4px ${zoneColor("safety")})` }}>
            {zoneStatus("safety") === "critical" && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* ZONE: body (middle) */}
        <g onClick={() => onSelect("bcm")} style={{ cursor: "pointer" }}>
          <rect x="75" y="300" width="170" height="100" rx="10" fill={zoneBg("body")}
            stroke={zoneColor("body")} strokeWidth={zoneStatus("body") === "critical" ? "2" : "1"}
            strokeOpacity={zoneStatus("body") === "critical" ? "0.8" : "0.3"}
            style={{ filter: `drop-shadow(0 0 8px ${zoneGlow("body")})` }} />
          <rect x="75" y="300" width="170" height="100" rx="10" fill={`url(#glow-body)`} />
          <text x="160" y="340" textAnchor="middle" fontSize="9" fontWeight="700" fill={zoneColor("body")} letterSpacing="1">{isAr ? "الهيكل" : "BODY"}</text>
          <text x="160" y="354" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.4)">BCM · HVAC · IC · IMMO</text>
          <circle cx="232" cy="312" r="5" fill={zoneColor("body")}
            style={{ filter: `drop-shadow(0 0 4px ${zoneColor("body")})` }}>
            {zoneStatus("body") === "critical" && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* ZONE: fuel (bottom) */}
        <g onClick={() => onSelect("fuel")} style={{ cursor: "pointer" }}>
          <rect x="75" y="412" width="170" height="95" rx="10" fill={zoneBg("fuel")}
            stroke={zoneColor("fuel")} strokeWidth={zoneStatus("fuel") === "critical" ? "2" : "1"}
            strokeOpacity={zoneStatus("fuel") === "critical" ? "0.8" : "0.3"}
            style={{ filter: `drop-shadow(0 0 8px ${zoneGlow("fuel")})` }} />
          <rect x="75" y="412" width="170" height="95" rx="10" fill={`url(#glow-fuel)`} />
          <text x="160" y="453" textAnchor="middle" fontSize="9" fontWeight="700" fill={zoneColor("fuel")} letterSpacing="1">{isAr ? "الوقود والعادم" : "FUEL/EXHAUST"}</text>
          <text x="160" y="467" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.4)">Fuel · Catalytic · DPF</text>
          <circle cx="232" cy="424" r="5" fill={zoneColor("fuel")}
            style={{ filter: `drop-shadow(0 0 4px ${zoneColor("fuel")})` }}>
            {zoneStatus("fuel") === "critical" && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
          </circle>
        </g>
      </svg>

      {/* Zone legend */}
      <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
        {zones.map(z => {
          const s = zoneStatus(z);
          const c = STATUS_COLORS[s];
          const info = ZONE_INFO[z];
          return (
            <div key={z} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium", c.border, c.bg)}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.ring }} />
              <span className={c.text}>{isAr ? info.labelAr : info.labelEn}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main page
────────────────────────────────────────────── */
export default function SystemMap() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { activeVehicle } = useActiveVehicle();
  const { data: summary } = useGetDiagnosticSummary({
    query: { queryKey: ["/api/diagnostics/summary"] }
  });

  const seed = summary?.totalSessions || 7;
  const statuses: Record<string, Status> = Object.fromEntries(
    SYSTEMS.map(s => [s.id, getStatus(s.id, seed)])
  );

  const [selectedId, setSelectedId] = useState<string | null>("ecm");
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState<string | null>(null);

  const selectedSys = SYSTEMS.find(s => s.id === selectedId);
  const selectedStatus = selectedId ? statuses[selectedId] : null;

  const criticalCount = SYSTEMS.filter(s => statuses[s.id] === "critical").length;
  const warnCount     = SYSTEMS.filter(s => statuses[s.id] === "warn").length;
  const okCount       = SYSTEMS.filter(s => statuses[s.id] === "ok").length;
  const offlineCount  = SYSTEMS.filter(s => statuses[s.id] === "offline").length;
  const healthScore   = Math.round((okCount / SYSTEMS.length) * 100);

  const filteredSystems = SYSTEMS.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.nameAr.includes(q) || s.nameEn.toLowerCase().includes(q) || s.id.includes(q);
    const matchZone = !filterZone || s.zone === filterZone;
    return matchSearch && matchZone;
  });

  const zones = ["engine", "safety", "body", "advanced", "fuel"];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] bg-[#080b12]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1 h-5 rounded-full bg-cyan-400" />
              <h1 className="text-xl font-black tracking-tight text-white">
                {isAr ? "خريطة أنظمة المركبة" : "Vehicle System Map"}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold uppercase tracking-wide">
                {SYSTEMS.length} {isAr ? "نظام" : "Systems"}
              </span>
            </div>
            <p className="text-xs text-slate-500 ml-3">
              {activeVehicle
                ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`
                : (isAr ? "اختر مركبة لرؤية حالتها" : "Select a vehicle to view its health")}
            </p>
          </div>

          {/* Health score */}
          <div className="flex items-center gap-5">
            <div className="text-center hidden sm:block">
              <div className={cn("text-3xl font-black tabular-nums", healthScore >= 70 ? "text-green-400" : healthScore >= 40 ? "text-yellow-400" : "text-red-400")}>
                {healthScore}<span className="text-sm font-normal text-slate-500">%</span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{isAr ? "صحة الجهاز" : "Health"}</div>
            </div>
            <div className="flex gap-2">
              {[
                { count: criticalCount, label: isAr ? "حرج"     : "Critical", color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
                { count: warnCount,     label: isAr ? "تحذير"   : "Warn",     color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
                { count: okCount,       label: isAr ? "سليم"    : "OK",       color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
                { count: offlineCount,  label: isAr ? "مقطوع"   : "Offline",  color: "text-slate-500",  bg: "bg-slate-500/10",  border: "border-slate-500/20"  },
              ].map(s => (
                <div key={s.label} className={cn("flex flex-col items-center justify-center w-14 h-14 rounded-xl border", s.bg, s.border)}>
                  <span className={cn("text-xl font-black", s.color)}>{s.count}</span>
                  <span className="text-[9px] text-slate-600 uppercase">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* Left: Car diagram */}
        <div className="w-[280px] shrink-0 border-r border-white/[0.05] overflow-y-auto p-5 bg-[#070a10]">
          <CarDiagram
            systems={SYSTEMS}
            statuses={statuses}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isAr={isAr}
          />
        </div>

        {/* Center: System list */}
        <div className="w-[280px] shrink-0 border-r border-white/[0.05] flex flex-col bg-[#080b12]">
          {/* Search + filter */}
          <div className="p-3 border-b border-white/[0.05] space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAr ? "ابحث عن نظام..." : "Search systems..."}
                className="w-full pl-8 pr-8 py-2 text-xs bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
                </button>
              )}
            </div>
            {/* Zone filter pills */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterZone(null)}
                className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-all",
                  !filterZone ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "border-white/[0.06] text-slate-500 hover:text-white")}
              >
                {isAr ? "الكل" : "All"}
              </button>
              {zones.map(z => {
                const info = ZONE_INFO[z];
                return (
                  <button
                    key={z}
                    onClick={() => setFilterZone(filterZone === z ? null : z)}
                    className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-all",
                      filterZone === z
                        ? "bg-white/10 border-white/20 text-white"
                        : "border-white/[0.06] text-slate-500 hover:text-white")}
                  >
                    {isAr ? info.labelAr : info.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* System list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {filteredSystems.map(sys => (
              <SystemCard
                key={sys.id}
                sys={sys}
                status={statuses[sys.id]}
                selected={selectedId === sys.id}
                onClick={() => setSelectedId(sys.id)}
                isAr={isAr}
              />
            ))}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#080b12]">
          {selectedSys && selectedStatus ? (
            <div className="max-w-2xl space-y-5">
              {/* System header */}
              <div className={cn("p-5 rounded-2xl border", STATUS_COLORS[selectedStatus].border, STATUS_COLORS[selectedStatus].bg)}
                style={{ boxShadow: `0 0 30px ${STATUS_COLORS[selectedStatus].glow}` }}>
                <div className="flex items-start gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0", STATUS_COLORS[selectedStatus].bg, STATUS_COLORS[selectedStatus].border)}>
                    <selectedSys.icon className={cn("w-7 h-7", STATUS_COLORS[selectedStatus].text)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-black text-white">{isAr ? selectedSys.nameAr : selectedSys.nameEn}</h2>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold border uppercase", STATUS_COLORS[selectedStatus].border, STATUS_COLORS[selectedStatus].bg, STATUS_COLORS[selectedStatus].text)}>
                        <StatusDot status={selectedStatus} pulse />
                        <span className="ml-1">{STATUS_COLORS[selectedStatus].label[isAr ? "ar" : "en"]}</span>
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {isAr ? selectedSys.descAr : selectedSys.descEn}
                    </p>
                  </div>
                </div>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: isAr ? "الفئة"      : "Category",   v: isAr ? selectedSys.categoryAr : selectedSys.category },
                  { k: isAr ? "المنطقة"    : "Zone",       v: isAr ? ZONE_INFO[selectedSys.zone].labelAr : ZONE_INFO[selectedSys.zone].labelEn },
                  { k: isAr ? "البروتوكول" : "Protocol",   v: selectedSys.protocols.join(", ") },
                  { k: isAr ? "المعرّف"    : "System ID",  v: selectedSys.id.toUpperCase() },
                ].map(item => (
                  <div key={item.k} className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">{item.k}</div>
                    <div className="font-mono text-sm font-bold text-white">{item.v}</div>
                  </div>
                ))}
              </div>

              {/* Status-based guidance */}
              {selectedStatus === "critical" && (
                <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    {isAr ? "يتطلب فحصاً فورياً" : "Requires Immediate Inspection"}
                  </div>
                  <p className="text-xs text-red-400/70">
                    {isAr
                      ? "تم اكتشاف أعطال حرجة في هذا النظام. يُوصى بفحص فوري لتجنب تلف إضافي أو خطر على السلامة."
                      : "Critical faults detected in this system. Immediate inspection recommended to prevent further damage or safety risk."}
                  </p>
                  <Link href="/diagnostics">
                    <Button size="sm" className="gap-1.5 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 w-full mt-1">
                      {isAr ? "فحص هذا النظام الآن" : "Scan This System Now"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
              {selectedStatus === "warn" && (
                <div className="p-4 rounded-xl bg-yellow-500/8 border border-yellow-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {isAr ? "يتطلب متابعة" : "Requires Attention"}
                  </div>
                  <p className="text-xs text-yellow-400/70">
                    {isAr
                      ? "تحذيرات نشطة في هذا النظام. راقب الحالة وافحص عند الفرصة."
                      : "Active warnings in this system. Monitor and inspect at your next opportunity."}
                  </p>
                </div>
              )}
              {selectedStatus === "ok" && (
                <div className="p-4 rounded-xl bg-green-500/8 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {isAr ? "النظام يعمل بشكل صحيح" : "System Operating Normally"}
                  </div>
                </div>
              )}
              {selectedStatus === "offline" && (
                <div className="p-4 rounded-xl bg-slate-500/8 border border-slate-500/20">
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                    <WifiOff className="w-4 h-4" />
                    {isAr ? "النظام غير متصل أو غير مثبَّت" : "System offline or not installed"}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{isAr ? "إجراءات سريعة" : "Quick Actions"}</div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/diagnostics">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-white/[0.08] text-slate-300 hover:bg-white/[0.05] text-xs">
                      <Activity className="w-3.5 h-3.5" />{isAr ? "فحص" : "Full Scan"}
                    </Button>
                  </Link>
                  <Link href="/dtc-lookup">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-white/[0.08] text-slate-300 hover:bg-white/[0.05] text-xs">
                      <Search className="w-3.5 h-3.5" />{isAr ? "مكتبة DTC" : "DTC Library"}
                    </Button>
                  </Link>
                  <Link href="/live-scan">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-white/[0.08] text-slate-300 hover:bg-white/[0.05] text-xs">
                      <Radio className="w-3.5 h-3.5" />{isAr ? "بيانات حية" : "Live Data"}
                    </Button>
                  </Link>
                  <Link href="/reports">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-white/[0.08] text-slate-300 hover:bg-white/[0.05] text-xs">
                      <Info className="w-3.5 h-3.5" />{isAr ? "تقرير" : "Report"}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* All systems summary */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                  {isAr ? "جميع الأنظمة" : "All Systems Overview"}
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/[0.04] overflow-hidden flex">
                  {[
                    { s: "critical", pct: (criticalCount / SYSTEMS.length) * 100, color: "#ef4444" },
                    { s: "warn",     pct: (warnCount     / SYSTEMS.length) * 100, color: "#eab308" },
                    { s: "ok",       pct: (okCount        / SYSTEMS.length) * 100, color: "#22c55e" },
                    { s: "offline",  pct: (offlineCount  / SYSTEMS.length) * 100, color: "#475569" },
                  ].map(b => (
                    <div key={b.s} style={{ width: `${b.pct}%`, backgroundColor: b.color }} className="h-full transition-all duration-700" />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
                  <span>{criticalCount} {isAr ? "حرج" : "Critical"}</span>
                  <span>{warnCount} {isAr ? "تحذير" : "Warn"}</span>
                  <span>{okCount} {isAr ? "سليم" : "OK"}</span>
                  <span>{offlineCount} {isAr ? "مقطوع" : "Offline"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-600">
                <Car className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">{isAr ? "انقر على منطقة في الخريطة لعرض التفاصيل" : "Click a zone on the map to view details"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
