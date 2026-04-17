import { useState, useEffect, useRef } from "react";
import { useGetDiagnosticSummary, useListVehicles, useListDiagnosticSessions } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, Car, CheckCircle2, Clock, ShieldAlert,
  ShieldCheck, Zap, ArrowRight, Wrench, TrendingUp, BarChart2, Radio,
  Cpu, Gauge, Thermometer, Fuel, Battery, Wifi, Settings2, Plug,
  Play, LayoutGrid, ChevronRight, Bot, FileText, Target, Sliders, X
} from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useTechnician } from "@/lib/technician";

type WidgetId = "kpis" | "gauges" | "quick-tiles" | "ecu-grid" | "recent-sessions" | "fleet-summary" | "ai-tips";

const ALL_WIDGETS: { id: WidgetId; nameAr: string; nameEn: string }[] = [
  { id: "kpis",             nameAr: "مؤشرات الأداء",    nameEn: "KPI Cards"           },
  { id: "gauges",           nameAr: "عدادات المحرك",     nameEn: "Engine Gauges"       },
  { id: "quick-tiles",      nameAr: "الوظائف السريعة",  nameEn: "Quick Tiles"         },
  { id: "ecu-grid",         nameAr: "شبكة الأنظمة",     nameEn: "ECU Systems Grid"    },
  { id: "recent-sessions",  nameAr: "الجلسات الأخيرة",  nameEn: "Recent Sessions"     },
  { id: "fleet-summary",    nameAr: "ملخص الأسطول",      nameEn: "Fleet Summary"       },
  { id: "ai-tips",          nameAr: "نصائح الذكاء",     nameEn: "AI Tips"             },
];

function useWidgetVisibility() {
  const [visible, setVisible] = useState<Record<WidgetId, boolean>>(() => {
    try {
      const saved = localStorage.getItem("dashboard-widgets");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load dashboard widgets", e);
    }
    return Object.fromEntries(ALL_WIDGETS.map(w => [w.id, true])) as Record<WidgetId, boolean>;
  });

  function toggle(id: WidgetId) {
    setVisible(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("dashboard-widgets", JSON.stringify(next));
      return next;
    });
  }

  function resetAll() {
    const all = Object.fromEntries(ALL_WIDGETS.map(w => [w.id, true])) as Record<WidgetId, boolean>;
    setVisible(all);
    localStorage.setItem("dashboard-widgets", JSON.stringify(all));
  }

  return { visible, toggle, resetAll };
}

/* ───────────────────── INSTRUMENT GAUGE ───────────────────── */
function ArcGauge({
  value, max, label, unit, color, size = 100
}: { value: number; max: number; label: string; unit: string; color: string; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const startAngle = 220, sweep = 280;
  const pct = Math.min(1, Math.max(0, value / max));
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (deg: number) => {
    const a = toRad(deg - 90);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  };
  const arcPath = (start: number, end: number) => {
    const s = toRad(start - 90), e = toRad(end - 90);
    const large = end - start > 180 ? 1 : 0;
    return `M ${cx + r * Math.cos(s)},${cy + r * Math.sin(s)} A ${r},${r} 0 ${large} 1 ${cx + r * Math.cos(e)},${cy + r * Math.sin(e)}`;
  };
  const valAngle = startAngle + pct * sweep;
  const ir = r - 10;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path d={arcPath(startAngle, startAngle + sweep)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" strokeLinecap="round" />
        {/* Fill */}
        {pct > 0.001 && (
          <path d={arcPath(startAngle, valAngle)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
        )}
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const a = toRad(startAngle + t * sweep - 90);
          const x1 = cx + (ir - 4) * Math.cos(a), y1 = cy + (ir - 4) * Math.sin(a);
          const x2 = cx + ir * Math.cos(a), y2 = cy + ir * Math.sin(a);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />;
        })}
        {/* Needle dot */}
        {pct > 0.001 && (() => {
          const a = toRad(valAngle - 90);
          return <circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r="3.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
        })()}
        {/* Center */}
        <circle cx={cx} cy={cy} r="3" fill="rgba(255,255,255,0.15)" />
        {/* Value */}
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize={size * 0.18} fontWeight="700" fill="white" fontFamily="monospace">
          {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value % 1 === 0 ? value : value.toFixed(1)}
        </text>
        <text x={cx} y={cy + size * 0.14} textAnchor="middle" fontSize={size * 0.1} fill="rgba(255,255,255,0.5)" fontFamily="monospace">
          {unit}
        </text>
      </svg>
      <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">{label}</span>
    </div>
  );
}

/* ───────────────────── HEALTH RING ───────────────────── */
function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size * 0.38, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const glow = score >= 80 ? "#22c55e66" : score >= 50 ? "#eab30866" : "#ef444466";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 4px ${glow})` }} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={size * 0.18} fontWeight="800" fill={color}>{score}</text>
    </svg>
  );
}

/* ───────────────────── SYSTEM MATRIX ───────────────────── */
type SysStatus = "ok" | "warn" | "critical" | "offline";

interface EcuSystem {
  id: string;
  name: string;
  nameAr: string;
  icon: any;
  category: string;
  dtcs: number;
  status: SysStatus;
}

const ALL_SYSTEMS: Omit<EcuSystem, "dtcs" | "status">[] = [
  { id: "ecm",   name: "Engine Control",     nameAr: "وحدة محرك ECM",    icon: Gauge,      category: "Powertrain"  },
  { id: "tcm",   name: "Transmission",       nameAr: "ناقل الحركة TCM",  icon: Settings2,  category: "Powertrain"  },
  { id: "abs",   name: "ABS / Brakes",       nameAr: "نظام ABS",          icon: Activity,   category: "Safety"      },
  { id: "srs",   name: "SRS / Airbags",      nameAr: "الوسائد الهوائية", icon: ShieldAlert,category: "Safety"      },
  { id: "bcm",   name: "Body Control BCM",   nameAr: "التحكم بالهيكل",   icon: Cpu,        category: "Body"        },
  { id: "tpms",  name: "TPMS",               nameAr: "ضغط الإطارات",     icon: Gauge,      category: "Safety"      },
  { id: "eps",   name: "Power Steering EPS", nameAr: "توجيه كهربائي",    icon: Settings2,  category: "Chassis"     },
  { id: "hvac",  name: "HVAC Climate",       nameAr: "تكييف HVAC",        icon: Thermometer,category: "Body"        },
  { id: "immo",  name: "Immobilizer",        nameAr: "مانع السرقة",       icon: ShieldCheck,category: "Security"    },
  { id: "ic",    name: "Instrument Cluster", nameAr: "لوحة العدادات",     icon: LayoutGrid, category: "Body"        },
  { id: "fuel",  name: "Fuel Injection",     nameAr: "حقن الوقود",        icon: Fuel,       category: "Powertrain"  },
  { id: "ign",   name: "Ignition System",    nameAr: "نظام الإشعال",      icon: Zap,        category: "Powertrain"  },
  { id: "dpf",   name: "DPF / Exhaust",      nameAr: "فلتر الجسيمات",    icon: Activity,   category: "Emissions"   },
  { id: "vvt",   name: "Variable Valve VVT", nameAr: "توقيت الصمامات",    icon: Settings2,  category: "Engine"      },
  { id: "turbo", name: "Turbo / Boost",      nameAr: "التيربو والضغط",    icon: Gauge,      category: "Engine"      },
  { id: "batt",  name: "Battery / BMS",      nameAr: "إدارة البطارية",    icon: Battery,    category: "Electrical"  },
  { id: "4wd",   name: "4WD Transfer",       nameAr: "دفع رباعي 4WD",     icon: Settings2,  category: "Drivetrain"  },
  { id: "diff",  name: "Differential",       nameAr: "الفارق التفاضلي",   icon: Settings2,  category: "Drivetrain"  },
  { id: "susp",  name: "Active Suspension",  nameAr: "تعليق نشط",         icon: Activity,   category: "Chassis"     },
  { id: "ldw",   name: "Lane Departure",     nameAr: "تحذير الحارة",      icon: ShieldCheck,category: "ADAS"        },
  { id: "acc",   name: "Adaptive Cruise ACC",nameAr: "مثبت سرعة ذكي",    icon: Gauge,      category: "ADAS"        },
  { id: "pdc",   name: "Parking Sensors",    nameAr: "حساسات الركن",      icon: Radio,      category: "ADAS"        },
  { id: "cam",   name: "Camera System",      nameAr: "نظام الكاميرات",    icon: Cpu,        category: "ADAS"        },
  { id: "gw",    name: "Gateway Module",     nameAr: "بوابة الشبكة",      icon: Wifi,       category: "Network"     },
  { id: "door",  name: "Door Modules",       nameAr: "وحدات الأبواب",     icon: Settings2,  category: "Body"        },
  { id: "seat",  name: "Seat Memory",        nameAr: "ذاكرة المقعد",      icon: Settings2,  category: "Body"        },
  { id: "alt",   name: "Alternator",         nameAr: "المولّد الكهربائي", icon: Zap,        category: "Electrical"  },
  { id: "tel",   name: "Telematics",         nameAr: "الاتصالات",         icon: Wifi,       category: "Network"     },
  { id: "ecu2",  name: "Secondary ECU",      nameAr: "ECU مساعد",         icon: Cpu,        category: "Powertrain"  },
  { id: "light", name: "Lighting Control",   nameAr: "التحكم بالإضاءة",  icon: Zap,        category: "Body"        },
];

function generateSystemStatus(id: string, seed: number): SysStatus {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), seed);
  const v = hash % 10;
  if (v < 6) return "ok";
  if (v < 8) return "warn";
  if (v < 9) return "critical";
  return "offline";
}

function SystemGrid({ systems, lang }: { systems: EcuSystem[]; lang: string }) {
  const STATUS_CONFIG = {
    ok:       { dot: "bg-green-400",  text: "text-green-400",  border: "border-green-500/20",  bg: "bg-green-500/5"  },
    warn:     { dot: "bg-yellow-400", text: "text-yellow-400", border: "border-yellow-500/20", bg: "bg-yellow-500/5" },
    critical: { dot: "bg-red-500",    text: "text-red-400",    border: "border-red-500/30",    bg: "bg-red-500/5"    },
    offline:  { dot: "bg-gray-500",   text: "text-gray-500",   border: "border-border",         bg: "bg-secondary/20" },
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-1.5">
      {systems.map(sys => {
        const c = STATUS_CONFIG[sys.status];
        const Icon = sys.icon;
        return (
          <Link href="/diagnostics" key={sys.id}>
            <div className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border ${c.border} ${c.bg} cursor-pointer hover:scale-[1.04] transition-all group`}>
              <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${c.dot} ${sys.status === "critical" ? "animate-pulse" : ""}`} />
              <Icon className={`w-4 h-4 ${c.text} mt-0.5`} />
              <span className="text-[9px] font-medium text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                {lang === "ar" ? sys.nameAr : sys.name}
              </span>
              {sys.dtcs > 0 && (
                <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1 rounded">{sys.dtcs}</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ───────────────────── LIVE TICKER ───────────────────── */
function LiveTicker({ items }: { items: string[] }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % items.length); setFade(true); }, 300);
    }, 3000);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <span className="transition-opacity duration-300" style={{ opacity: fade ? 1 : 0 }}>
      {items[idx]}
    </span>
  );
}

/* ───────────────────── STAT CARD ───────────────────── */
function MiniBarChart({ color, seed }: { color: string; seed: number }) {
  const bars = [0.4, 0.65, 0.5, 0.8, 0.6, 0.75, 1].map((b, i) => {
    const h = Math.max(0.2, Math.min(1, b * (0.8 + ((seed + i * 7) % 13) / 40)));
    return h;
  });
  return (
    <div className="flex items-end gap-[2px] h-6 opacity-40 group-hover:opacity-60 transition-opacity">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 100}%`, backgroundColor: color }} />
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg, border, sub, href, trend, trendUp }: any) {
  const colorHex = color.includes("red") ? "#ef4444" : color.includes("green") ? "#22c55e" : color.includes("blue") ? "#3b82f6" : color.includes("primary") ? "#3b82f6" : "#94a3b8";
  const inner = (
    <div className={`relative rounded-xl border ${border} overflow-hidden p-5 flex flex-col gap-2 h-full cursor-pointer group hover:scale-[1.02] hover:shadow-lg transition-all duration-200`}
      style={{ background: `linear-gradient(135deg, var(--card) 0%, transparent 100%)` }}>
      <div className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity"
        style={{ background: `radial-gradient(ellipse at top left, ${colorHex}, transparent 70%)` }} />
      <div className="relative flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase leading-tight">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${colorHex}18`, boxShadow: `0 0 14px ${colorHex}22` }}>
          <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
        </div>
      </div>
      <div className="relative flex items-end gap-3">
        <span className={`text-4xl font-black tracking-tight leading-none ${color}`}>{value}</span>
        {trend !== undefined && (
          <span className={`text-[11px] font-bold mb-1 flex items-center gap-0.5 ${trendUp ? "text-green-400" : "text-red-400"}`}>
            {trendUp ? "↑" : "↓"}{trend}%
          </span>
        )}
      </div>
      <div className="relative flex items-center justify-between gap-2 mt-1">
        <span className="text-[11px] text-muted-foreground leading-tight">{sub}</span>
        <MiniBarChart color={colorHex} seed={value} />
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ───────────────────── SESSION ROW ───────────────────── */
function SessionRow({ session, lang }: { session: any; lang: string }) {
  const hasErrors = session.dtcCount > 0;
  return (
    <Link href={`/diagnostics/${session.id}`}>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background/60 hover:bg-secondary/30 hover:border-primary/30 transition-all cursor-pointer group">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${hasErrors ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
          {hasErrors
            ? <AlertTriangle className="w-5 h-5 text-red-400" />
            : <CheckCircle2 className="w-5 h-5 text-green-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {session.vehicleName || `Vehicle #${session.vehicleId}`}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {new Date(session.startedAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
            <span className="w-1 h-1 bg-border rounded-full" />
            <span className="font-mono">{session.systemsScanned}/{session.totalSystems} sys</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasErrors ? (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-xs font-bold text-red-400">{session.dtcCount} DTC</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="text-xs font-bold text-green-400">{lang === "ar" ? "سليم" : "PASS"}</span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

/* ───────────────────── MAIN DASHBOARD ───────────────────── */
export default function Dashboard() {
  const { t, lang } = useI18n();
  const { current: tech } = useTechnician();
  const { visible, toggle, resetAll } = useWidgetVisibility();
  const [showCustomize, setShowCustomize] = useState(false);
  const isAr = lang === "ar";

  const { data: summary, isLoading } = useGetDiagnosticSummary({
    query: { queryKey: ["/api/diagnostics/summary"], refetchInterval: 15000 }
  });
  const { data: vehicles } = useListVehicles();
  const { data: sessions } = useListDiagnosticSessions({}, {
    query: { queryKey: ["/api/diagnostics/sessions"] }
  });

  const fleetHealth = summary ? Math.max(0, Math.min(100,
    100 - (summary.criticalAlerts * 20) - (Math.max(0, summary.activeDtcCodes - summary.criticalAlerts) * 5)
  )) : 0;

  const seed = summary?.totalSessions || 0;
  const systems: EcuSystem[] = ALL_SYSTEMS.map((s) => {
    const status = generateSystemStatus(s.id, seed);
    return { ...s, status, dtcs: status === "critical" ? Math.ceil(Math.abs(Math.sin(seed + s.id.charCodeAt(0))) * 3) : status === "warn" ? 1 : 0 };
  });

  const criticalSystems  = systems.filter(s => s.status === "critical").length;
  const warnSystems      = systems.filter(s => s.status === "warn").length;
  const okSystems        = systems.filter(s => s.status === "ok").length;
  const offlineSystems   = systems.filter(s => s.status === "offline").length;

  const tickerMsgs = lang === "ar" ? [
    "نظام التشخيص يعمل بكامل طاقته",
    `${okSystems} نظام سليم من أصل ${systems.length}`,
    "OBD-II جاهز للاتصال",
    "بيانات حية متوفرة لجميع الأنظمة",
  ] : [
    "Diagnostic system fully operational",
    `${okSystems} systems healthy out of ${systems.length}`,
    "OBD-II ready for real connection",
    "Live data available across all modules",
  ];

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-secondary/40 animate-pulse rounded-xl" />)}
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="p-6 space-y-5 relative z-10 min-h-full">

      {/* Critical Alert Banner */}
      {summary.criticalAlerts > 0 && (
        <div className="relative flex items-center gap-4 px-5 py-4 rounded-xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.05) 100%)", border: "1px solid rgba(239,68,68,0.45)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(239,68,68,0.15), transparent 60%)" }} />
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center"
              style={{ boxShadow: "0 0 18px rgba(239,68,68,0.3)" }}>
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="font-black text-sm text-red-300 tracking-wide">
              {lang === "ar"
                ? `${summary.criticalAlerts} عطل حرج نشط — مطلوب فحص فوري`
                : `${summary.criticalAlerts} Critical Fault${summary.criticalAlerts > 1 ? "s" : ""} — Immediate attention required`}
            </p>
            <p className="text-xs text-red-400/70 mt-0.5 flex items-center gap-1.5">
              <span className="font-medium">{lang === "ar" ? "الأنظمة المتأثرة:" : "Affected:"}</span>
              {systems.filter(s => s.status === "critical").map(s => lang === "ar" ? s.nameAr.split(" ")[0] : s.name.split(" ")[0]).slice(0, 4).map((n, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-red-500/15 border border-red-500/25 rounded text-red-400/80 text-[10px] font-mono">{n}</span>
              ))}
            </p>
          </div>
          <Link href="/diagnostics">
            <Button size="sm" className="relative bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:text-red-200 shrink-0 gap-1.5 font-bold">
              {lang === "ar" ? "فحص فوري" : "View Now"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <h1 className="text-2xl font-black tracking-tight">
              {lang === "ar" ? `أهلاً، ${tech.nameAr}` : `Welcome, ${tech.name.split(" ")[0]}`}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-3.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <LiveTicker items={tickerMsgs} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <Button variant="outline" size="sm" className="gap-1.5 border-white/10 text-slate-400 hover:bg-white/[0.05]"
            onClick={() => setShowCustomize(v => !v)}>
            <Sliders className="w-3.5 h-3.5" />
            {isAr ? "تخصيص" : "Customize"}
          </Button>
          <Link href="/live-scan">
            <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
              <Radio className="w-4 h-4" />
              {isAr ? "فحص حي" : "Live Scan"}
            </Button>
          </Link>
          <Link href="/diagnostics">
            <Button size="sm" className="gap-1.5" data-testid="button-start-scan">
              <Play className="w-3.5 h-3.5" fill="currentColor" />
              {isAr ? "فحص جديد" : "New Scan"}
            </Button>
          </Link>
          <Link href="/reports">
            <Button size="sm" variant="secondary" className="gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              {isAr ? "التقارير" : "Reports"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Dashboard Customize Panel */}
      {showCustomize && (
        <div className="rounded-xl border border-white/10 bg-[#0d1117] p-4 space-y-3 relative shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">{isAr ? "تخصيص لوحة البيانات" : "Customize Dashboard"}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={resetAll} className="text-[10px] text-slate-500 hover:text-slate-300 underline">
                {isAr ? "إظهار الكل" : "Show All"}
              </button>
              <button onClick={() => setShowCustomize(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {ALL_WIDGETS.map(w => (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all text-left ${
                  visible[w.id]
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-600 hover:text-slate-400"
                }`}
              >
                <div className={`w-3 h-3 rounded border-2 flex items-center justify-center shrink-0 ${
                  visible[w.id] ? "bg-primary border-primary" : "border-slate-700"
                }`}>
                  {visible[w.id] && <CheckCircle2 className="w-2 h-2 text-white" />}
                </div>
                {isAr ? w.nameAr : w.nameEn}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600">{isAr ? "يتم حفظ إعداداتك تلقائياً" : "Settings are saved automatically"}</p>
        </div>
      )}

      {/* ─── Quick Function Tiles (Autel-style home grid) ─── */}
      {visible["quick-tiles"] && <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[
          {
            href: "/diagnostics",
            icon: Activity,
            labelAr: "فحص كامل", labelEn: "Full Scan",
            subAr: "30 نظام ECU", subEn: "30 ECU systems",
            color: "#3B82F6", bg: "from-blue-600/20 to-blue-900/10", border: "border-blue-500/25",
            featured: true,
          },
          {
            href: "/maintenance",
            icon: Wrench,
            labelAr: "إعادة الضبط", labelEn: "Service Reset",
            subAr: "30+ وظيفة", subEn: "30+ functions",
            color: "#F97316", bg: "from-orange-600/15 to-orange-900/5", border: "border-orange-500/20",
          },
          {
            href: "/programming",
            icon: Cpu,
            labelAr: "برمجة ECU", labelEn: "ECU Program",
            subAr: "8 وحدات", subEn: "8 modules",
            color: "#8B5CF6", bg: "from-violet-600/15 to-violet-900/5", border: "border-violet-500/20",
          },
          {
            href: "/adas",
            icon: Target,
            labelAr: "معايرة ADAS", labelEn: "ADAS Calib.",
            subAr: "12 نظام", subEn: "12 systems",
            color: "#22C55E", bg: "from-green-600/15 to-green-900/5", border: "border-green-500/20",
          },
          {
            href: "/live-scan",
            icon: Radio,
            labelAr: "بيانات حية", labelEn: "Live Data",
            subAr: "OBD-II", subEn: "OBD-II",
            color: "#EAB308", bg: "from-yellow-600/15 to-yellow-900/5", border: "border-yellow-500/20",
          },
          {
            href: "/reports",
            icon: FileText,
            labelAr: "التقارير", labelEn: "Reports",
            subAr: "PDF / طباعة", subEn: "PDF / Print",
            color: "#06B6D4", bg: "from-cyan-600/15 to-cyan-900/5", border: "border-cyan-500/20",
          },
          {
            href: "/vehicles",
            icon: Car,
            labelAr: "الأسطول", labelEn: "Fleet",
            subAr: `${summary.totalVehicles} مركبة`, subEn: `${summary.totalVehicles} vehicles`,
            color: "#EC4899", bg: "from-pink-600/15 to-pink-900/5", border: "border-pink-500/20",
          },
        ].map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <div className={`
              relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border
              bg-gradient-to-br ${tile.bg} ${tile.border}
              cursor-pointer hover:scale-[1.04] active:scale-[0.97] transition-all group
              ${tile.featured ? "col-span-1 row-span-1" : ""}
              min-h-[90px]
            `}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: tile.color + "22", boxShadow: `0 0 12px ${tile.color}22` }}
              >
                <tile.icon className="w-5 h-5" style={{ color: tile.color }} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white leading-tight">
                  {lang === "ar" ? tile.labelAr : tile.labelEn}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: tile.color + "aa" }}>
                  {lang === "ar" ? tile.subAr : tile.subEn}
                </p>
              </div>
              {tile.featured && (
                <div
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: tile.color }}
                />
              )}
            </div>
          </Link>
        ))}
      </div>}

      {/* KPI Strip */}
      {visible["kpis"] && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={lang === "ar" ? "أعطال نشطة" : "Active DTCs"}
          value={summary.activeDtcCodes}
          icon={AlertTriangle}
          color={summary.activeDtcCodes > 0 ? "text-red-400" : "text-green-400"}
          bg={summary.activeDtcCodes > 0 ? "bg-red-500/5" : "bg-green-500/5"}
          border={summary.activeDtcCodes > 0 ? "border-red-500/20" : "border-green-500/20"}
          sub={lang === "ar" ? "تستوجب المراجعة" : "Require attention"}
          href="/diagnostics"
          trend={12} trendUp={false}
        />
        <StatCard
          label={lang === "ar" ? "المركبات" : "Vehicles"}
          value={summary.totalVehicles}
          icon={Car}
          color="text-primary"
          bg="bg-primary/5"
          border="border-primary/15"
          sub={lang === "ar" ? "مُدارة في النظام" : "Managed in system"}
          href="/vehicles"
          trend={8} trendUp={true}
        />
        <StatCard
          label={lang === "ar" ? "جلسات الفحص" : "Scan Sessions"}
          value={summary.totalSessions}
          icon={Activity}
          color="text-blue-400"
          bg="bg-blue-500/5"
          border="border-blue-500/15"
          sub={lang === "ar" ? "إجمالي الفحوصات" : "Total performed"}
          href="/diagnostics"
          trend={24} trendUp={true}
        />
        <StatCard
          label={lang === "ar" ? "تم إصلاحها" : "Resolved"}
          value={summary.clearedDtcCodes}
          icon={CheckCircle2}
          color="text-green-400"
          bg="bg-green-500/5"
          border="border-green-500/15"
          sub={lang === "ar" ? "أعطال محلولة" : "Issues cleared"}
          trend={5} trendUp={true}
        />
      </div>}

      {/* Instrument Cluster Bar */}
      {visible["gauges"] && <div className="relative rounded-2xl border border-white/5 bg-gradient-to-br from-secondary/80 to-background/80 p-5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.08),transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {lang === "ar" ? "عدادات الأداء الحية" : "Performance Instruments"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              {lang === "ar" ? "بانتظار الاتصال" : "Awaiting Connection"}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 justify-items-center">
            <ArcGauge value={3240}  max={8000} label={lang === "ar" ? "RPM"       : "RPM"}      unit="rpm"  color="#3b82f6" size={90} />
            <ArcGauge value={94}    max={260}  label={lang === "ar" ? "السرعة"   : "Speed"}     unit="km/h" color="#22c55e" size={90} />
            <ArcGauge value={88}    max={130}  label={lang === "ar" ? "المحرك"   : "Coolant"}   unit="°C"   color="#ef4444" size={90} />
            <ArcGauge value={14.2}  max={16}   label={lang === "ar" ? "البطارية" : "Battery"}   unit="V"    color="#eab308" size={90} />
            <ArcGauge value={67}    max={100}  label={lang === "ar" ? "الخانق"   : "Throttle"}  unit="%"    color="#8b5cf6" size={90} />
            <ArcGauge value={92}    max={300}  label={lang === "ar" ? "MAF"       : "MAF"}       unit="g/s"  color="#06b6d4" size={90} />
            <ArcGauge value={72}    max={100}  label={lang === "ar" ? "الوقود"   : "Fuel"}      unit="%"    color="#f97316" size={90} />
          </div>
        </div>
      </div>}

      {/* ECU System Matrix + Fleet Health */}
      {(visible["ecu-grid"] || visible["fleet-summary"]) && <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* System Matrix — takes 3 cols */}
        <div className="xl:col-span-3 rounded-2xl border border-border bg-card/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm">{lang === "ar" ? "مصفوفة أنظمة المركبة (30 نظام)" : "Vehicle ECU System Matrix (30 Systems)"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="text-green-400 font-bold">{okSystems}</span> {lang === "ar" ? "سليم" : "OK"} ·{" "}
                <span className="text-yellow-400 font-bold">{warnSystems}</span> {lang === "ar" ? "تحذير" : "Warn"} ·{" "}
                <span className="text-red-400 font-bold">{criticalSystems}</span> {lang === "ar" ? "حرج" : "Critical"} ·{" "}
                <span className="text-gray-400 font-bold">{offlineSystems}</span> {lang === "ar" ? "غير متصل" : "Offline"}
              </p>
            </div>
            <Link href="/diagnostics">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                {lang === "ar" ? "فحص كامل" : "Full Scan"}
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <SystemGrid systems={systems} lang={lang} />
        </div>

        {/* Fleet Health */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card/50 p-5 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              {lang === "ar" ? "صحة الأسطول" : "Fleet Health"}
            </h3>
            <div className="flex flex-col items-center gap-3">
              <HealthRing score={fleetHealth} size={100} />
              <div className="text-center">
                <div className={`text-xl font-black ${fleetHealth >= 80 ? "text-green-400" : fleetHealth >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                  {fleetHealth >= 80
                    ? (lang === "ar" ? "ممتاز" : "Excellent")
                    : fleetHealth >= 50 ? (lang === "ar" ? "متوسط" : "Fair")
                    : (lang === "ar" ? "حرج" : "Critical")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.activeDtcCodes} {lang === "ar" ? "عطل" : "faults"} · {summary.criticalAlerts} {lang === "ar" ? "حرج" : "critical"}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { label: lang === "ar" ? "أنظمة سليمة" : "Healthy Systems", value: okSystems, max: systems.length, color: "bg-green-400" },
                { label: lang === "ar" ? "تحتاج متابعة" : "Need Attention",  value: warnSystems, max: systems.length, color: "bg-yellow-400" },
                { label: lang === "ar" ? "حرجة" : "Critical",                value: criticalSystems, max: systems.length, color: "bg-red-500" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{item.label}</span><span className="font-mono font-bold text-foreground">{item.value}</span>
                  </div>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${(item.value / item.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>}

      {/* Sessions + Quick Actions */}
      {visible["recent-sessions"] && <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Sessions */}
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {lang === "ar" ? "آخر الجلسات التشخيصية" : "Recent Diagnostic Sessions"}
            </h2>
            <Link href="/diagnostics">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7">
                {lang === "ar" ? "الكل" : "View all"}
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          {sessions?.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground text-sm gap-2">
              <Activity className="w-8 h-8 opacity-20" />
              {lang === "ar" ? "لا جلسات بعد — ابدأ فحصاً جديداً" : "No sessions yet — start a new scan"}
            </div>
          ) : (
            <div className="space-y-2">
              {sessions?.slice(0, 5).map(s => <SessionRow key={s.id} session={s} lang={lang} />)}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {lang === "ar" ? "الوصول السريع" : "Quick Actions"}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/live-scan",    icon: Plug,       label: lang === "ar" ? "ربط مركبة"      : "Connect Vehicle", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
              { href: "/maintenance",  icon: Wrench,     label: lang === "ar" ? "ضبط الخدمة"    : "Service Reset",   color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
              { href: "/adas",         icon: Zap,        label: lang === "ar" ? "معايرة ADAS"   : "ADAS Calib.",     color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
              { href: "/programming",  icon: Cpu,        label: lang === "ar" ? "برمجة ECU"     : "ECU Program",     color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20" },
              { href: "/dtc-lookup",   icon: Activity,   label: lang === "ar" ? "مكتبة DTC"     : "DTC Library",     color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
              { href: "/compare",      icon: BarChart2,  label: lang === "ar" ? "مقارنة"        : "Compare",         color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20" },
            ].map((a, i) => (
              <Link key={i} href={a.href}>
                <div className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${a.border} ${a.bg} cursor-pointer hover:scale-[1.04] transition-all text-center group`}>
                  <a.icon className={`w-5 h-5 ${a.color}`} />
                  <span className="text-[11px] font-medium leading-tight">{a.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>}

    </div>
  );
}
