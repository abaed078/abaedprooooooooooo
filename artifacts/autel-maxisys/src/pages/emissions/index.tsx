import { useState } from "react";
import { Leaf, AlertTriangle, TrendingUp, TrendingDown, Flame, Wind, Droplets, Car, Activity, Info } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartTooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useActiveVehicle } from "@/lib/vehicle-context";

const ACTIVE_DTCS = [
  { code: "P0300", emission: "CO, HC", impactPct: 42, descAr: "احتراق ناقص يرفع HC وCO بشدة", descEn: "Incomplete combustion drastically raises HC and CO" },
  { code: "P0420", emission: "CO, NOx", impactPct: 35, descAr: "المحفز غير فعّال يضاعف الانبعاثات", descEn: "Ineffective catalyst doubles emissions output" },
  { code: "P0234", emission: "CO₂, NOx", impactPct: 18, descAr: "ضغط توربو زائد يرفع استهلاك الوقود", descEn: "Over-boost raises fuel consumption and CO₂" },
];

const POLLUTANTS = [
  { key: "CO₂", valueNow: 258, valueClean: 120, unit: "g/km", icon: Flame, color: "#ef4444", labelAr: "ثاني أكسيد الكربون", labelEn: "Carbon Dioxide" },
  { key: "HC", valueNow: 320, valueClean: 80, unit: "ppm", icon: Wind, color: "#f97316", labelAr: "الهيدروكربونات", labelEn: "Hydrocarbons" },
  { key: "CO", valueNow: 1.8, valueClean: 0.3, unit: "%", icon: Droplets, color: "#8b5cf6", labelAr: "أول أكسيد الكربون", labelEn: "Carbon Monoxide" },
  { key: "NOx", valueNow: 145, valueClean: 40, unit: "ppm", icon: Activity, color: "#f59e0b", labelAr: "أكاسيد النيتروجين", labelEn: "Nitrogen Oxides" },
];

function getMonthlyData(isAr: boolean) {
  return [
    { month: isAr ? "أكتوبر" : "Oct", co2: 180, clean: 120 },
    { month: isAr ? "نوفمبر" : "Nov", co2: 195, clean: 120 },
    { month: isAr ? "ديسمبر" : "Dec", co2: 210, clean: 120 },
    { month: isAr ? "يناير" : "Jan", co2: 228, clean: 120 },
    { month: isAr ? "فبراير" : "Feb", co2: 215, clean: 120 },
    { month: isAr ? "مارس" : "Mar", co2: 242, clean: 120 },
    { month: isAr ? "أبريل" : "Apr", co2: 258, clean: 120 },
  ];
}

const ECO_SCORE = 28;

function EcoScoreGauge({ score }: { score: number }) {
  const gaugeColor = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const data = [
    { name: "score", value: score, fill: gaugeColor },
    { name: "remaining", value: 100 - score, fill: "rgba(255,255,255,0.04)" },
  ];
  return (
    <div className="relative w-40 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={data} startAngle={180} endAngle={0} barSize={14}>
          <RadialBar dataKey="value" cornerRadius={6} background={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-3xl font-black" style={{ color: gaugeColor }}>{score}</span>
        <span className="text-[10px] text-slate-500">/100</span>
      </div>
    </div>
  );
}

export default function EmissionsPage() {
  const { lang, dir } = useI18n();
  const { activeVehicle } = useActiveVehicle();
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<"overview" | "pollutants" | "trend">("overview");

  const extraCO2PerMonth = 258 - 120;
  const treeEquiv = Math.round((extraCO2PerMonth * 30) / 21000);
  const costPerMonth = Math.round(extraCO2PerMonth * 0.018 * 30);

  const monthlyData = getMonthlyData(isAr);

  return (
    <div className="p-5 max-w-5xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <h1 className="text-[18px] font-black text-white">
              {isAr ? "لوحة الانبعاثات البيئية" : "Emissions & Environmental Impact"}
            </h1>
          </div>
          <p className="text-[12px] text-slate-500">
            {isAr
              ? "تقييم التأثير البيئي للأعطال النشطة على انبعاثات المركبة"
              : "Environmental impact assessment of active faults on vehicle emissions"
            }
          </p>
        </div>
        {activeVehicle && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[11px] text-slate-400">
            <Car className="w-3.5 h-3.5" />
            {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
          </div>
        )}
      </div>

      {/* Top row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Eco score */}
        <div className="col-span-1 bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 flex flex-col items-center">
          <div className="text-[11px] font-bold text-slate-400 mb-2">
            {isAr ? "نقاط البيئة" : "Eco Score"}
          </div>
          <EcoScoreGauge score={ECO_SCORE} />
          <div className="mt-2 text-center">
            <div className="text-[12px] font-bold text-red-400">{isAr ? "ملوث بشدة" : "Heavily Polluting"}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? `أسوأ بـ ${100 - ECO_SCORE}% من الطبيعي` : `${100 - ECO_SCORE}% worse than normal`}
            </div>
          </div>
        </div>

        {/* Impact metrics */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          {[
            {
              icon: Flame, color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/15",
              value: `+${extraCO2PerMonth}`, unit: "g/km",
              labelAr: "زيادة CO₂ عن الطبيعي", labelEn: "Extra CO₂ vs clean baseline"
            },
            {
              icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/8", border: "border-orange-500/15",
              value: `+${Math.round((258 / 120 - 1) * 100)}%`, unit: "",
              labelAr: "تجاوز حد الانبعاثات", labelEn: "Above emission limits"
            },
            {
              icon: Leaf, color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/15",
              value: String(treeEquiv), unit: isAr ? "شجرة/شهر" : "trees/mo",
              labelAr: "أشجار مطلوبة لتعويض الأثر", labelEn: "Trees needed to offset monthly"
            },
            {
              icon: TrendingDown, color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/15",
              value: String(costPerMonth), unit: isAr ? "ر.س/شهر" : "SAR/mo",
              labelAr: "تكلفة وقود إضافي شهرياً", labelEn: "Extra fuel cost monthly"
            },
          ].map((m, i) => {
            const MIcon = m.icon;
            return (
              <div key={i} className={cn("rounded-2xl p-4 border", m.bg, m.border)}>
                <MIcon className={cn("w-5 h-5 mb-2", m.color)} />
                <div className={cn("text-[20px] font-black", m.color)}>
                  {m.value} <span className="text-[12px] font-normal text-slate-500">{m.unit}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{isAr ? m.labelAr : m.labelEn}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit">
        {(["overview", "pollutants", "trend"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all",
              activeTab === t ? "bg-primary text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {t === "overview" ? (isAr ? "نظرة عامة" : "Overview")
              : t === "pollutants" ? (isAr ? "الملوثات" : "Pollutants")
              : (isAr ? "الاتجاه" : "Trend")}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-[12px] font-bold text-white mb-3">
              {isAr ? "الأعطال المؤثرة على الانبعاثات" : "Emission-Affecting Faults"}
            </div>
            <div className="space-y-3">
              {ACTIVE_DTCS.map((dtc, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="font-mono text-[11px] font-bold text-red-400 w-16 shrink-0">{dtc.code}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-300">{isAr ? dtc.descAr : dtc.descEn}</span>
                      <span className="text-[10px] text-red-400 font-bold shrink-0 ms-2">+{dtc.impactPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400" style={{ width: `${dtc.impactPct}%` }} />
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{dtc.emission}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-red-400 mb-3">🚗 {isAr ? "مركبتك الآن" : "Your Vehicle Now"}</div>
              {POLLUTANTS.slice(0, 2).map((p, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/[0.05] last:border-0">
                  <span className="text-[11px] text-slate-400">{p.key}</span>
                  <span className="text-[12px] font-bold text-red-400">{p.valueNow} {p.unit}</span>
                </div>
              ))}
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-emerald-400 mb-3">✅ {isAr ? "المركبة السليمة" : "Clean Baseline"}</div>
              {POLLUTANTS.slice(0, 2).map((p, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/[0.05] last:border-0">
                  <span className="text-[11px] text-slate-400">{p.key}</span>
                  <span className="text-[12px] font-bold text-emerald-400">{p.valueClean} {p.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pollutants */}
      {activeTab === "pollutants" && (
        <div className="grid grid-cols-2 gap-4">
          {POLLUTANTS.map((p, i) => {
            const PIcon = p.icon;
            const ratio = Math.min((p.valueNow / (p.valueClean * 3)) * 100, 100);
            const overLimit = p.valueNow > p.valueClean;
            return (
              <div key={i} className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                      <PIcon className="w-4 h-4" style={{ color: p.color }} />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-white">{p.key}</div>
                      <div className="text-[9px] text-slate-500">{isAr ? p.labelAr : p.labelEn}</div>
                    </div>
                  </div>
                  {overLimit && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 font-bold">
                      {isAr ? "تجاوز الحد" : "OVER LIMIT"}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-[24px] font-black" style={{ color: p.color }}>{p.valueNow}</span>
                  <span className="text-[11px] text-slate-500 mb-1">{p.unit}</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${ratio}%`, background: p.color }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>0</span>
                  <span className="text-emerald-500">{isAr ? "الطبيعي" : "Normal"}: {p.valueClean}</span>
                  <span>{p.valueClean * 3} {p.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trend */}
      {activeTab === "trend" && (
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[12px] font-bold text-white">
              {isAr ? "اتجاه CO₂ — آخر 7 أشهر" : "CO₂ Trend — Last 7 Months"}
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" />{isAr ? "مركبتك" : "Your Vehicle"}</div>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" />{isAr ? "الخط الأساسي" : "Clean Baseline"}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gradCO2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradClean" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <RechartTooltip
                contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                formatter={(v: number, n: string) => [`${v} g/km`, n === "co2" ? (isAr ? "مركبتك" : "Your vehicle") : (isAr ? "الطبيعي" : "Clean")]}
              />
              <Area type="monotone" dataKey="co2" stroke="#ef4444" strokeWidth={2} fill="url(#gradCO2)" />
              <Area type="monotone" dataKey="clean" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gradClean)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400">
              {isAr
                ? "الانبعاثات في تصاعد مستمر. إصلاح الأعطال الحالية سيخفض CO₂ بنسبة تصل إلى 53% ويوفر ما يزيد عن 400 ريال شهرياً في الوقود."
                : "Emissions are steadily increasing. Fixing current faults will reduce CO₂ by up to 53% and save over 400 SAR monthly in fuel costs."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
