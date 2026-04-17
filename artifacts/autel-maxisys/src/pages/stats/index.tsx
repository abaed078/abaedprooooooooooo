import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart
} from "recharts";
import {
  TrendingUp, Car, Clock, CheckCircle2, AlertCircle,
  Award, Users, BarChart2, FileText, Zap, Calendar, Database, AlertTriangle, RefreshCw
} from "lucide-react";

interface ApiSummary {
  totalVehicles: number;
  totalSessions: number;
  totalDtcCodes: number;
  activeDtcCodes: number;
  clearedDtcCodes: number;
  criticalAlerts: number;
  recentSessions: Array<{
    id: number;
    vehicleName: string;
    status: string;
    startedAt: string;
  }>;
}

const MONTH_DATA = [
  { month: "أكتوبر", scans: 38, dtcs: 94, fixed: 31 },
  { month: "نوفمبر", scans: 52, dtcs: 128, fixed: 47 },
  { month: "ديسمبر", scans: 41, dtcs: 103, fixed: 36 },
  { month: "يناير",  scans: 63, dtcs: 154, fixed: 58 },
  { month: "فبراير", scans: 57, dtcs: 141, fixed: 51 },
  { month: "مارس",   scans: 74, dtcs: 189, fixed: 69 },
  { month: "أبريل",  scans: 19, dtcs: 48,  fixed: 17 },
];

const MONTH_DATA_EN = [
  { month: "Oct", scans: 38, dtcs: 94, fixed: 31 },
  { month: "Nov", scans: 52, dtcs: 128, fixed: 47 },
  { month: "Dec", scans: 41, dtcs: 103, fixed: 36 },
  { month: "Jan", scans: 63, dtcs: 154, fixed: 58 },
  { month: "Feb", scans: 57, dtcs: 141, fixed: 51 },
  { month: "Mar", scans: 74, dtcs: 189, fixed: 69 },
  { month: "Apr", scans: 19, dtcs: 48,  fixed: 17 },
];

const TOP_DTCS = [
  { code: "P0300", count: 34, category: "Engine", nameAr: "تعثر عشوائي" },
  { code: "P0420", count: 29, category: "Exhaust", nameAr: "كفاءة المحفّز" },
  { code: "P0171", count: 24, category: "Fuel", nameAr: "نظام وقود مفقر" },
  { code: "C0040", count: 18, category: "Chassis", nameAr: "حساس عجلة يمين" },
  { code: "B0001", count: 15, category: "Body", nameAr: "وسادة هوائية أمامية" },
  { code: "P0102", count: 12, category: "Engine", nameAr: "دائرة MAF منخفضة" },
  { code: "U0100", count: 9, category: "Network", nameAr: "فقد التواصل مع ECM" },
];

const CATEGORY_DATA = [
  { name: "Engine",  nameAr: "المحرك",       value: 45, color: "#ef4444" },
  { name: "Chassis", nameAr: "الهيكل",       value: 18, color: "#f97316" },
  { name: "Body",    nameAr: "الهيكل الخارجي",value: 13, color: "#eab308" },
  { name: "Network", nameAr: "الشبكة",       value: 11, color: "#8b5cf6" },
  { name: "Exhaust", nameAr: "العادم",        value: 9,  color: "#06b6d4" },
  { name: "Fuel",    nameAr: "الوقود",        value: 4,  color: "#10b981" },
];

const TECHNICIANS = [
  { name: "Ahmad Al-Mahmoud", nameAr: "أحمد المحمود", scans: 89, fixed: 82, avg: "18 دقيقة", color: "bg-blue-600" },
  { name: "Khalid Al-Rashid", nameAr: "خالد الراشد",  scans: 67, fixed: 61, avg: "22 دقيقة", color: "bg-violet-600" },
  { name: "Omar Al-Fahad",    nameAr: "عمر الفهد",    scans: 54, fixed: 48, avg: "25 دقيقة", color: "bg-emerald-600" },
  { name: "Saad Al-Otaibi",   nameAr: "سعد العتيبي",  scans: 34, fixed: 31, avg: "20 دقيقة", color: "bg-amber-600" },
];

const VEHICLES_TOP = [
  { make: "Toyota Land Cruiser 300", count: 23 },
  { make: "Lexus LX 600",           count: 18 },
  { make: "Mercedes-Benz G 63 AMG", count: 14 },
  { make: "Nissan Patrol",          count: 12 },
  { make: "BMW X5",                 count: 9  },
];

/* SVG donut chart — avoids Recharts ResponsiveContainer zero-width issue */
function DonutChart({ data, lang }: { data: typeof CATEGORY_DATA; lang: string }) {
  const size = 140, cx = size / 2, cy = size / 2, r = 52, strokeW = 18;
  const total = data.reduce((s, d) => s + d.value, 0);
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const pct = d.value / total;
    const dash = pct * circ;
    const slice = { ...d, dash, offset };
    offset += dash + 2;
    return slice;
  });
  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeDasharray={`${s.dash - 2} ${circ - s.dash + 2}`}
            strokeDashoffset={-(s.offset) + circ * 0.25}
            strokeLinecap="butt"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={18} fontWeight={700}>{total}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={9}>{lang === "ar" ? "من المجموع" : "of total"}</text>
      </svg>
    </div>
  );
}

const KPI = ({ icon: Icon, value, labelAr, labelEn, sub, color, lang }: any) => (
  <div className={cn("p-4 rounded-2xl border bg-white/[0.02] border-white/[0.07] flex items-start gap-3")}>
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <div className="text-2xl font-black text-white tabular-nums">{value}</div>
      <div className="text-[11px] font-semibold text-slate-300">{lang === "ar" ? labelAr : labelEn}</div>
      {sub && <div className="text-[10px] text-slate-600">{sub}</div>}
    </div>
  </div>
);

export default function WorkshopStats() {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<"overview" | "dtcs" | "technicians" | "vehicles">("overview");
  const [apiData, setApiData] = useState<ApiSummary | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const monthData = lang === "ar" ? MONTH_DATA : MONTH_DATA_EN;

  useEffect(() => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    setApiLoading(true);
    setApiError(false);
    fetch(`${base}/api/diagnostics/summary`)
      .then(r => r.json())
      .then(d => { setApiData(d); setApiLoading(false); })
      .catch(() => { setApiError(true); setApiLoading(false); });
  }, []);

  const refreshData = () => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    setApiLoading(true);
    setApiError(false);
    fetch(`${base}/api/diagnostics/summary`)
      .then(r => r.json())
      .then(d => { setApiData(d); setApiLoading(false); })
      .catch(() => { setApiError(true); setApiLoading(false); });
  };

  const tabs = [
    { id: "overview",     labelAr: "نظرة عامة",   labelEn: "Overview"     },
    { id: "dtcs",         labelAr: "الأكواد",      labelEn: "Fault Codes"  },
    { id: "technicians",  labelAr: "الفنيون",      labelEn: "Technicians"  },
    { id: "vehicles",     labelAr: "المركبات",     labelEn: "Vehicles"     },
  ];

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {lang === "ar" ? "إحصائيات الورشة" : "Workshop Statistics"}
          </h1>
          <p className="text-[11px] text-slate-500">
            {lang === "ar" ? "أداء الورشة والتحليلات التشخيصية — آخر 6 أشهر" : "Workshop performance & diagnostic analytics — last 6 months"}
          </p>
        </div>
      </div>

      {/* Real data banner */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 rounded-xl border text-[11px]",
        apiLoading
          ? "bg-blue-500/5 border-blue-500/20 text-blue-400"
          : apiError
          ? "bg-red-500/5 border-red-500/20 text-red-400"
          : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
      )}>
        <div className="flex items-center gap-2">
          {apiLoading ? (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" />{lang === "ar" ? "جارٍ تحميل البيانات من قاعدة البيانات..." : "Loading real data from database..."}</>
          ) : apiError ? (
            <><AlertTriangle className="w-3.5 h-3.5" />{lang === "ar" ? "تعذّر تحميل البيانات — عرض أرقام تجريبية" : "Could not load data — showing demo numbers"}</>
          ) : (
            <><Database className="w-3.5 h-3.5" /><span className="font-bold">{lang === "ar" ? "⚡ بيانات حقيقية من قاعدة البيانات" : "⚡ Real data from database"}</span></>
          )}
        </div>
        {!apiLoading && (
          <button onClick={refreshData} className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <RefreshCw className="w-3 h-3" />
            <span>{lang === "ar" ? "تحديث" : "Refresh"}</span>
          </button>
        )}
      </div>

      {/* KPIs — real data when available */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={FileText}
          value={apiData ? apiData.totalSessions : (apiLoading ? "..." : "344")}
          labelAr="إجمالي الجلسات" labelEn="Total Sessions"
          sub={apiData ? (lang === "ar" ? "من قاعدة البيانات" : "From database") : (lang === "ar" ? "آخر 6 أشهر (تجريبي)" : "Last 6 months (demo)")}
          color="bg-blue-600/80" lang={lang} />
        <KPI icon={Car}
          value={apiData ? apiData.totalVehicles : (apiLoading ? "..." : "41")}
          labelAr="مركبات مسجّلة" labelEn="Registered Vehicles"
          sub={apiData ? (lang === "ar" ? "في قاعدة البيانات" : "In database") : (lang === "ar" ? "تجريبي" : "Demo")}
          color="bg-violet-600/80" lang={lang} />
        <KPI icon={AlertCircle}
          value={apiData ? apiData.activeDtcCodes : (apiLoading ? "..." : "89")}
          labelAr="أكواد نشطة" labelEn="Active DTCs"
          sub={apiData ? (lang === "ar" ? `${apiData.totalDtcCodes} إجمالي | ${apiData.clearedDtcCodes} مُسوَّاة` : `${apiData.totalDtcCodes} total | ${apiData.clearedDtcCodes} cleared`) : (lang === "ar" ? "تجريبي" : "Demo")}
          color="bg-red-600/80" lang={lang} />
        <KPI icon={Zap}
          value={apiData ? apiData.criticalAlerts : (apiLoading ? "..." : "3")}
          labelAr="تنبيهات حرجة" labelEn="Critical Alerts"
          sub={apiData ? (lang === "ar" ? "تتطلب اهتماماً فورياً" : "Require immediate attention") : (lang === "ar" ? "تجريبي" : "Demo")}
          color="bg-amber-600/80" lang={lang} />
      </div>

      {/* Recent sessions from real DB */}
      {apiData && apiData.recentSessions.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              {lang === "ar" ? "أحدث الجلسات — بيانات حقيقية" : "Latest Sessions — Real Data"}
            </span>
          </div>
          <div className="space-y-2">
            {apiData.recentSessions.map((s, i) => (
              <div key={s.id || i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    s.status === "completed" ? "bg-emerald-400" : s.status === "in_progress" ? "bg-blue-400" : "bg-slate-500"
                  )} />
                  <span className="text-[11px] text-slate-300">{s.vehicleName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded-full",
                    s.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  )}>
                    {s.status === "completed" ? (lang === "ar" ? "مكتمل" : "Complete") : (lang === "ar" ? "جارٍ" : "In Progress")}
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono">
                    {new Date(s.startedAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
              activeTab === t.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {lang === "ar" ? t.labelAr : t.labelEn}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Scans chart */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[12px] font-bold text-white">{lang === "ar" ? "الفحوصات الشهرية" : "Monthly Scans"}</div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />{lang === "ar" ? "فحوصات" : "Scans"}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />{lang === "ar" ? "محلولة" : "Fixed"}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <RechartTooltip
                  contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: "#fff" }} itemStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="scans" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="fixed" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut chart — custom SVG */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-[12px] font-bold text-white mb-4">{lang === "ar" ? "توزيع الأعطال" : "Fault Distribution"}</div>
            <DonutChart data={CATEGORY_DATA} lang={lang} />
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {CATEGORY_DATA.map(c => (
                <div key={c.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                  {lang === "ar" ? c.nameAr : c.name} ({c.value}%)
                </div>
              ))}
            </div>
          </div>

          {/* DTC trend line */}
          <div className="lg:col-span-3 bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-[12px] font-bold text-white mb-4">{lang === "ar" ? "اتجاه أكواد الأعطال" : "DTC Trend"}</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={monthData}>
                <defs>
                  <linearGradient id="dtcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <RechartTooltip
                  contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: "#fff" }} itemStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="dtcs" stroke="#ef4444" fill="url(#dtcGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "dtcs" && (
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="text-[12px] font-bold text-white">{lang === "ar" ? "أكثر الأكواد تكراراً" : "Most Common DTCs"}</div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {TOP_DTCS.map((dtc, i) => (
              <div key={dtc.code} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <span className="text-[11px] font-mono text-slate-600 w-5 text-right">{i + 1}</span>
                <span className={cn(
                  "font-mono text-[12px] font-black px-2.5 py-0.5 rounded-lg",
                  dtc.category === "Engine" ? "bg-red-500/15 text-red-400" :
                  dtc.category === "Chassis" ? "bg-orange-500/15 text-orange-400" :
                  dtc.category === "Body" ? "bg-yellow-500/15 text-yellow-400" :
                  dtc.category === "Network" ? "bg-violet-500/15 text-violet-400" :
                  "bg-blue-500/15 text-blue-400"
                )}>{dtc.code}</span>
                <div className="flex-1">
                  <div className="text-[11px] text-slate-300">{lang === "ar" ? dtc.nameAr : dtc.code}</div>
                  <div className="text-[10px] text-slate-600">{dtc.category}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-black text-white">{dtc.count}</div>
                  <div className="text-[9px] text-slate-600">{lang === "ar" ? "مرة" : "times"}</div>
                </div>
                <div className="w-24">
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(dtc.count / TOP_DTCS[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "technicians" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TECHNICIANS.map((t, i) => (
            <div key={t.name} className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-4">
              <div className="relative shrink-0">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[16px] font-black", t.color)}>
                  {(lang === "ar" ? t.nameAr : t.name).charAt(0)}
                </div>
                {i === 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    <Award className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-white">{lang === "ar" ? t.nameAr : t.name}</div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="text-center">
                    <div className="text-[18px] font-black text-white">{t.scans}</div>
                    <div className="text-[9px] text-slate-600 uppercase">{lang === "ar" ? "فحص" : "Scans"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[18px] font-black text-emerald-400">{t.fixed}</div>
                    <div className="text-[9px] text-slate-600 uppercase">{lang === "ar" ? "محلول" : "Fixed"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-black text-blue-400">{t.avg}</div>
                    <div className="text-[9px] text-slate-600 uppercase">{lang === "ar" ? "متوسط" : "Avg"}</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(t.fixed / t.scans) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-600 mt-1">{Math.round((t.fixed / t.scans) * 100)}% {lang === "ar" ? "نسبة نجاح" : "fix rate"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "vehicles" && (
        <div className="space-y-3">
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <div className="text-[12px] font-bold text-white">{lang === "ar" ? "أكثر المركبات مراجعةً" : "Most Visited Vehicles"}</div>
            </div>
            {VEHICLES_TOP.map((v, i) => (
              <div key={v.make} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                <span className="text-[11px] text-slate-600 w-5 text-right font-mono">#{i+1}</span>
                <Car className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="flex-1 text-[12px] text-slate-200 font-medium">{v.make}</span>
                <span className="text-[13px] font-black text-white">{v.count}</span>
                <span className="text-[10px] text-slate-600">{lang === "ar" ? "زيارة" : "visits"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
