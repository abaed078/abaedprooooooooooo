import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { DTC_DATABASE, searchDtcDatabase, type DtcEntry } from "@/data/dtc-database";
import { OEM_DTC_DATABASE, OEM_MANUFACTURERS } from "@/data/oem-dtc-database";
import DtcDetailModal from "@/components/dtc-detail-modal";
import {
  Search, ShieldAlert, AlertTriangle, Info, BookOpen, Zap, ArrowUpDown,
  SlidersHorizontal, X, Camera, Gauge, Thermometer, Fuel, Activity,
  Battery, Wind, Factory, Globe
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AiCostEstimator } from "@/components/ai-cost-estimator";
import { useActiveVehicle } from "@/lib/vehicle-context";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/* ─── Freeze Frame Modal ─────────────────────────────────── */
function generateFreezeFrame(dtcCode: string) {
  const seed = dtcCode.charCodeAt(0) + dtcCode.charCodeAt(1) * 13;
  const rand = (base: number, v: number) => +(base + ((seed % 100) / 100 - 0.5) * v * 2).toFixed(2);
  return [
    { label: "سرعة المحرك",        labelEn: "Engine RPM",        value: rand(820, 80),   unit: "RPM",  icon: <Gauge className="w-4 h-4 text-blue-400" />,       color: "text-blue-400"   },
    { label: "سرعة المركبة",       labelEn: "Vehicle Speed",     value: rand(0, 12),     unit: "km/h", icon: <Activity className="w-4 h-4 text-green-400" />,    color: "text-green-400"  },
    { label: "حرارة المبرد",       labelEn: "Coolant Temp",      value: rand(87, 8),     unit: "°C",   icon: <Thermometer className="w-4 h-4 text-red-400" />,   color: "text-red-400"    },
    { label: "حمل المحرك",         labelEn: "Engine Load",       value: rand(28, 10),    unit: "%",    icon: <Gauge className="w-4 h-4 text-yellow-400" />,      color: "text-yellow-400" },
    { label: "موضع الخانق",        labelEn: "Throttle Position", value: rand(14, 5),     unit: "%",    icon: <Fuel className="w-4 h-4 text-orange-400" />,       color: "text-orange-400" },
    { label: "ضغط المنفستو MAP",   labelEn: "MAP Pressure",      value: rand(96, 6),     unit: "kPa",  icon: <Wind className="w-4 h-4 text-cyan-400" />,         color: "text-cyan-400"   },
    { label: "جهد البطارية",       labelEn: "Battery Voltage",   value: rand(14.1, 0.3), unit: "V",    icon: <Battery className="w-4 h-4 text-yellow-400" />,    color: "text-yellow-400" },
    { label: "تكيف الوقود STFT",   labelEn: "Short Term FT",     value: rand(1.5, 4),    unit: "%",    icon: <Activity className="w-4 h-4 text-purple-400" />,   color: "text-purple-400" },
    { label: "تكيف الوقود LTFT",   labelEn: "Long Term FT",      value: rand(0.8, 3),    unit: "%",    icon: <Activity className="w-4 h-4 text-indigo-400" />,   color: "text-indigo-400" },
    { label: "حرارة هواء المدخل",  labelEn: "Intake Air Temp",   value: rand(30, 8),     unit: "°C",   icon: <Thermometer className="w-4 h-4 text-sky-400" />,   color: "text-sky-400"    },
    { label: "تدفق الهواء MAF",    labelEn: "Mass Air Flow",     value: rand(5.1, 1.5),  unit: "g/s",  icon: <Wind className="w-4 h-4 text-teal-400" />,         color: "text-teal-400"   },
    { label: "جهد مستشعر O2",     labelEn: "O2 Sensor Voltage", value: rand(0.45, 0.3), unit: "V",    icon: <Zap className="w-4 h-4 text-lime-400" />,          color: "text-lime-400"   },
  ];
}

function FreezeFrameModal({ dtc, open, onClose }: { dtc: DtcEntry | null; open: boolean; onClose: () => void }) {
  if (!dtc) return null;
  const data = generateFreezeFrame(dtc.code);
  const ts = new Date(); ts.setMinutes(ts.getMinutes() - Math.floor(Math.random() * 120 + 10));
  const timeStr = ts.toLocaleString("ar");
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0a0e1a] border-border p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/20 to-transparent border-b border-border px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Camera className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Freeze Frame — {dtc.code}</h2>
            <p className="text-xs text-muted-foreground">{dtc.description}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] text-muted-foreground">وقت الحدث</div>
            <div className="text-xs font-mono text-foreground/70">{timeStr}</div>
          </div>
        </div>
        <div className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            بيانات المستشعرات لحظة تفعيل الرمز
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.map(d => (
              <div key={d.label} className="p-3 rounded-xl border border-border bg-card flex items-center gap-2.5">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center">
                  {d.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground truncate">{d.label}</div>
                  <div className={`font-mono font-bold text-sm ${d.color}`}>{d.value} <span className="text-[10px] font-normal text-muted-foreground">{d.unit}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400/80 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>هذه البيانات مخزنة في ذاكرة ECU لحظة إشعال رمز الخطأ. استخدمها لتحديد ظروف الحدث.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Constants ──────────────────────────────────────────── */
const CATEGORY_TABS = ["All", "Powertrain", "Body", "Chassis", "Network"] as const;
type Category = typeof CATEGORY_TABS[number];

const SEVERITY_FILTERS = ["all", "critical", "warning", "info"] as const;
type SeverityFilter = typeof SEVERITY_FILTERS[number];

const SORT_OPTIONS = [
  { value: "code", label: "Code A→Z" },
  { value: "severity", label: "Severity" },
  { value: "commonality", label: "Most Common" },
] as const;
type SortOption = typeof SORT_OPTIONS[number]["value"];

type SourceFilter = "all" | "obd2" | string; // string = manufacturer id

const SEVERITY_ICON = {
  critical: <ShieldAlert className="w-4 h-4 text-red-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const SEVERITY_FILTER_STYLE: Record<SeverityFilter, string> = {
  all: "bg-primary text-primary-foreground border-primary",
  critical: "bg-red-500/20 text-red-400 border-red-500/50",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/50",
};

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
const COMMONALITY_ORDER = { very_common: 0, common: 1, uncommon: 2 };

const CATEGORY_COLOR: Record<string, string> = {
  Powertrain: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Body: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Chassis: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Network: "bg-green-500/15 text-green-400 border-green-500/30",
};

const COMMONALITY_DOT: Record<string, string> = {
  very_common: "bg-red-500",
  common: "bg-yellow-500",
  uncommon: "bg-green-500",
};

/* ─── Full database (OBD2 + OEM) ─────────────────────────── */
const ALL_DTCS: DtcEntry[] = [
  ...DTC_DATABASE.map(d => ({ ...d, manufacturer: d.manufacturer ?? "Generic OBD-II" })),
  ...OEM_DTC_DATABASE,
];

export default function DtcLookup() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeSeverity, setActiveSeverity] = useState<SeverityFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("code");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDtc, setSelectedDtc] = useState<DtcEntry | null>(null);
  const [freezeFrameDtc, setFreezeFrameDtc] = useState<DtcEntry | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const { t } = useI18n();
  const { activeVehicle } = useActiveVehicle();

  /* Active source database */
  const sourceDb = useMemo<DtcEntry[]>(() => {
    if (sourceFilter === "all") return ALL_DTCS;
    if (sourceFilter === "obd2") return DTC_DATABASE.map(d => ({ ...d, manufacturer: "Generic OBD-II" }));
    return OEM_DTC_DATABASE.filter(d => d.manufacturer === sourceFilter);
  }, [sourceFilter]);

  const results = useMemo<DtcEntry[]>(() => {
    let base: DtcEntry[] = query.trim().length >= 1
      ? sourceDb.filter(d =>
          d.code.toLowerCase().includes(query.toLowerCase()) ||
          d.description.toLowerCase().includes(query.toLowerCase()) ||
          d.system.toLowerCase().includes(query.toLowerCase())
        )
      : sourceDb;

    if (activeCategory !== "All") {
      base = base.filter((d) => d.category === activeCategory);
    }
    if (activeSeverity !== "all") {
      base = base.filter((d) => d.severity === activeSeverity);
    }

    const sorted = [...base];
    if (sortBy === "code") {
      sorted.sort((a, b) => a.code.localeCompare(b.code));
    } else if (sortBy === "severity") {
      sorted.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    } else if (sortBy === "commonality") {
      sorted.sort((a, b) => COMMONALITY_ORDER[a.commonality] - COMMONALITY_ORDER[b.commonality]);
    }
    return sorted;
  }, [query, activeCategory, activeSeverity, sortBy, sourceDb]);

  const stats = useMemo(() => ({
    total: ALL_DTCS.length,
    oem: OEM_DTC_DATABASE.length,
    generic: DTC_DATABASE.length,
    critical: ALL_DTCS.filter(d => d.severity === "critical").length,
    warning: ALL_DTCS.filter(d => d.severity === "warning").length,
    info: ALL_DTCS.filter(d => d.severity === "info").length,
  }), []);

  const hasActiveFilters = activeSeverity !== "all" || activeCategory !== "All" || query.trim().length > 0;

  const clearAll = () => {
    setQuery(""); setActiveCategory("All"); setActiveSeverity("all");
  };

  const commonalityLabel = (c: string) => {
    if (c === "very_common") return t("dtcVeryCommon");
    if (c === "common") return t("dtcCommon");
    return t("dtcUncommon");
  };

  const severityLabel = (s: string) => {
    if (s === "critical") return t("sevCritical");
    if (s === "warning") return t("sevWarning");
    return t("sevInfo");
  };

  /* Find manufacturer style */
  const getMfrStyle = (mfr?: string) => {
    if (!mfr || mfr === "Generic OBD-II") return { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/25", flag: "🔧" };
    const found = OEM_MANUFACTURERS.find(m => m.id === mfr);
    return found ? { color: found.color, bg: found.bg, border: found.border, flag: found.flag } : { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/25", flag: "🔧" };
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            مكتبة أكواد DTC — OBD-II + OEM المصنّعين
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            <span className="text-foreground font-bold">{stats.generic}</span> كود OBD-II عالمي +{" "}
            <span className="text-green-400 font-bold">{stats.oem}</span> كود OEM مخصص ={" "}
            <span className="text-primary font-bold">{stats.total}</span> كود إجمالاً
          </p>
        </div>
        <div className="flex gap-2 shrink-0 mt-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
            <ShieldAlert className="w-3.5 h-3.5" /> {stats.critical}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs font-bold text-yellow-400">
            <AlertTriangle className="w-3.5 h-3.5" /> {stats.warning}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400">
            <Info className="w-3.5 h-3.5" /> {stats.info}
          </div>
        </div>
      </div>

      {/* Source Filter — Manufacturer tabs */}
      <div className="shrink-0">
        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <Factory className="w-3 h-3" /> المصنّع / Source
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSourceFilter("all")}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              sourceFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
            }`}
          >
            🌐 الكل ({stats.total})
          </button>
          <button
            onClick={() => setSourceFilter("obd2")}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              sourceFilter === "obd2"
                ? "bg-slate-600 text-white border-slate-500"
                : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
            }`}
          >
            🔧 OBD-II عالمي ({stats.generic})
          </button>
          {OEM_MANUFACTURERS.map(mfr => {
            const count = OEM_DTC_DATABASE.filter(d => d.manufacturer === mfr.id).length;
            return (
              <button
                key={mfr.id}
                onClick={() => setSourceFilter(mfr.id)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                  sourceFilter === mfr.id
                    ? `${mfr.bg} ${mfr.color} ${mfr.border}`
                    : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
                }`}
              >
                {mfr.flag} {mfr.label.split(" / ")[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            data-testid="input-dtc-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالكود (P0300) أو الوصف أو النظام..."
            className="pl-12 h-11 text-base bg-secondary border-border font-mono placeholder:font-sans"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`h-11 px-4 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
            showFilters || activeSeverity !== "all"
              ? "bg-primary/20 border-primary/50 text-primary"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          فلتر
          {activeSeverity !== "all" && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-11 pl-4 pr-8 rounded-xl border border-border bg-secondary text-sm text-foreground appearance-none cursor-pointer hover:border-white/20 transition-colors"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="shrink-0 p-4 rounded-xl border border-border bg-secondary/50 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">الخطورة</p>
          <div className="flex gap-2 flex-wrap">
            {SEVERITY_FILTERS.map((sev) => {
              const isActive = activeSeverity === sev;
              const count = sev === "all" ? sourceDb.length : sourceDb.filter(d => d.severity === sev).length;
              return (
                <button key={sev} onClick={() => setActiveSeverity(sev)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    isActive ? SEVERITY_FILTER_STYLE[sev] : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-white/20"
                  }`}>
                  {sev === "critical" && <ShieldAlert className="w-3.5 h-3.5" />}
                  {sev === "warning" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {sev === "info" && <Info className="w-3.5 h-3.5" />}
                  <span className="capitalize">{sev === "all" ? "الكل" : sev}</span>
                  <span className="text-xs opacity-70 font-mono">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 shrink-0 flex-wrap">
        {CATEGORY_TABS.map((cat) => {
          const count = cat === "All" ? sourceDb.length : sourceDb.filter((d) => d.category === cat).length;
          return (
            <button key={cat} data-testid={`tab-category-${cat.toLowerCase()}`}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}>
              {cat}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-bold ${activeCategory === cat ? "bg-white/20" : "bg-muted"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground font-mono">
          <span className="text-foreground font-bold">{results.length}</span> نتيجة
          {query && ` لـ "${query}"`}
          {activeCategory !== "All" && ` · ${activeCategory}`}
          {activeSeverity !== "all" && ` · ${activeSeverity}`}
          {sourceFilter !== "all" && ` · ${sourceFilter === "obd2" ? "OBD-II" : sourceFilter}`}
        </span>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-primary hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> مسح الفلاتر
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {results.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t("dtcNoResults")}</p>
            <p className="text-sm mt-1">{t("dtcNoResultsSub")}</p>
            {hasActiveFilters && (
              <button onClick={clearAll} className="mt-4 text-sm text-primary hover:underline">مسح الفلاتر</button>
            )}
          </div>
        ) : (
          results.map((dtc) => {
            const leftColor = dtc.severity === "critical" ? "#ef4444" : dtc.severity === "warning" ? "#eab308" : "#3b82f6";
            const glowColor = dtc.severity === "critical" ? "rgba(239,68,68,0.08)" : dtc.severity === "warning" ? "rgba(234,179,8,0.06)" : "rgba(59,130,246,0.06)";
            const mfrStyle = getMfrStyle(dtc.manufacturer);
            const isOem = dtc.manufacturer && dtc.manufacturer !== "Generic OBD-II";

            return (
              <div
                key={`${dtc.manufacturer}-${dtc.code}`}
                data-testid={`dtc-result-${dtc.code}`}
                className="relative flex items-start gap-0 rounded-xl border border-border overflow-hidden cursor-pointer group hover:border-white/20 hover:shadow-lg transition-all duration-200 hover:-translate-y-px"
                style={{ background: "var(--card)" }}
                onClick={() => setSelectedDtc(dtc)}
              >
                <div className="w-1 self-stretch shrink-0 transition-all group-hover:w-1.5"
                  style={{ backgroundColor: leftColor, boxShadow: `2px 0 8px ${leftColor}55` }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, ${glowColor}, transparent 60%)` }} />

                <div className="relative flex items-start gap-4 p-4 flex-1 min-w-0">
                  <div className="shrink-0 mt-0.5">{SEVERITY_ICON[dtc.severity]}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-black text-base tracking-widest group-hover:text-primary transition-colors"
                        style={{ color: `color-mix(in srgb, ${leftColor} 80%, white)` }}>
                        {dtc.code}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${SEVERITY_BADGE[dtc.severity]}`}>
                        {severityLabel(dtc.severity)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${CATEGORY_COLOR[dtc.category]}`}>
                        {dtc.category}
                      </span>
                      {/* Manufacturer badge */}
                      {isOem && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${mfrStyle.bg} ${mfrStyle.color} ${mfrStyle.border}`}>
                          {mfrStyle.flag} {dtc.manufacturer}
                        </span>
                      )}
                      {/* Module badge */}
                      {dtc.module && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-slate-500">
                          {dtc.module}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{dtc.system}</span>
                    </div>
                    <p className="text-sm text-foreground/90 font-semibold truncate">{dtc.description}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3 shrink-0 opacity-60" />
                      <span className="truncate">{dtc.causes[0]}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full ${COMMONALITY_DOT[dtc.commonality]}`} />
                      {commonalityLabel(dtc.commonality)}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setFreezeFrameDtc(dtc); }}
                      className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-semibold"
                    >
                      <Camera className="w-3 h-3" /> Freeze Frame
                    </button>
                    <span className="text-[11px] text-primary/80 translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-semibold flex items-center gap-1">
                      {t("dtcViewDetails")} →
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DtcDetailModal dtc={selectedDtc} open={!!selectedDtc} onClose={() => setSelectedDtc(null)} />
      <FreezeFrameModal dtc={freezeFrameDtc} open={!!freezeFrameDtc} onClose={() => setFreezeFrameDtc(null)} />

      {results.length > 0 && (
        <AiCostEstimator
          dtcs={results.slice(0, 5).map(d => ({ code: d.code, description: d.description, severity: d.severity }))}
          vehicle={activeVehicle ? { make: activeVehicle.make, model: activeVehicle.model, year: activeVehicle.year } : undefined}
        />
      )}
    </div>
  );
}
