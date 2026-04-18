import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import {
  BatteryCharging, BatteryFull, Zap, Thermometer, AlertTriangle,
  CheckCircle2, Activity, TrendingUp, TrendingDown, RotateCcw,
  ChevronRight, Clock, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Data & types
───────────────────────────────────────────── */
const BATTERY = {
  brand: "Varta Silver Dynamic",
  capacity: "95 Ah",
  rated_cca: 830,
  soh: 74,
  soc: 91,
  voltage_rest: 12.42,
  voltage_load: 10.8,
  measured_cca: 614,
  internal_resistance: 8.4,
  temp_c: 24,
  cycles: 847,
  age_months: 40,
  recommendation: "replace_soon" as const,
};

const ALTERNATOR = {
  voltage_idle: 14.1,
  voltage_2000rpm: 14.3,
  voltage_3500rpm: 14.4,
  ripple_mv: 82,
  charge_current_a: 38,
  status: "ok" as const,
};

const STARTER = {
  peak_current_a: 156,
  crank_voltage_drop: 9.8,
  crank_time_ms: 420,
  status: "ok" as const,
};

// Voltage history (24 readings over 24h)
const VOLTAGE_HISTORY = [
  12.65, 12.62, 12.58, 12.51, 12.42, 12.38, 12.35, 12.40,
  14.21, 14.30, 14.28, 14.25, 14.31, 14.27, 14.19, 13.82,
  13.40, 12.95, 12.71, 12.58, 12.50, 12.45, 12.43, 12.42,
];

/* ─────────────────────────────────────────────
   Animated gauge (SOH / SOC)
───────────────────────────────────────────── */
function CircleGauge({ value, label, color, size = 100 }: {
  value: number; label: string; color: string; size?: number;
}) {
  const [v, setV] = useState(0);
  const R = size * 0.4;
  const circ = 2 * Math.PI * R;
  const center = size / 2;

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 2;
      setV(Math.min(n, value));
      if (n >= value) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={center} cy={center} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={size * 0.08} />
          <circle cx={center} cy={center} r={R} fill="none"
            stroke={color} strokeWidth={size * 0.08} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - v / 100)}
            style={{ transition: "stroke-dashoffset 0.05s linear", filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black tabular-nums leading-none" style={{ fontSize: size * 0.22, color }}>{v}</span>
          <span style={{ fontSize: size * 0.09, color: "#64748b" }}>%</span>
        </div>
      </div>
      <div className="text-[10px] text-slate-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Voltage history mini chart (SVG)
───────────────────────────────────────────── */
function VoltageChart({ data }: { data: number[] }) {
  const W = 400, H = 80;
  const minV = 10, maxV = 15;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - minV) / (maxV - minV)) * H;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${H} ${pts} ${W},${H}`;

  // Highlight charging zone (readings 8-15)
  const chargeStart = (8 / (data.length - 1)) * W;
  const chargeEnd = (15 / (data.length - 1)) * W;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="rounded-lg overflow-hidden">
      {/* Charging zone */}
      <rect x={chargeStart} y={0} width={chargeEnd - chargeStart} height={H}
        fill="rgba(59,130,246,0.08)" />

      {/* 14V line */}
      <line x1={0} y1={H - ((14 - minV) / (maxV - minV)) * H}
        x2={W} y2={H - ((14 - minV) / (maxV - minV)) * H}
        stroke="rgba(59,130,246,0.2)" strokeDasharray="3,5" strokeWidth={1} />

      {/* 12V line */}
      <line x1={0} y1={H - ((12 - minV) / (maxV - minV)) * H}
        x2={W} y2={H - ((12 - minV) / (maxV - minV)) * H}
        stroke="rgba(100,116,139,0.15)" strokeDasharray="3,5" strokeWidth={1} />

      {/* Area fill */}
      <polygon points={area} fill="rgba(59,130,246,0.06)" />

      {/* Line */}
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 3px #3b82f6)" }} />

      {/* Labels */}
      <text x={4} y={H - ((14 - minV) / (maxV - minV)) * H - 3}
        fill="rgba(59,130,246,0.5)" fontSize="8" fontFamily="monospace">14.0V</text>
      <text x={4} y={H - ((12 - minV) / (maxV - minV)) * H - 3}
        fill="rgba(100,116,139,0.4)" fontSize="8" fontFamily="monospace">12.0V</text>
      <text x={chargeStart + 4} y={10}
        fill="rgba(59,130,246,0.5)" fontSize="7" fontFamily="monospace">CHARGING</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function BatteryAnalyzer() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [testRunning, setTestRunning] = useState(false);
  const [testDone, setTestDone] = useState(false);

  const rec: string = BATTERY.recommendation;
  const recColor = rec === "ok" ? "#22c55e" : rec === "replace_soon" ? "#f97316" : "#ef4444";
  const recLabelAr = rec === "ok" ? "البطارية بحالة جيدة" : rec === "replace_soon" ? "يُنصح بالاستبدال قريباً" : "استبدال فوري مطلوب";
  const recLabelEn = rec === "ok" ? "Battery in good condition" : rec === "replace_soon" ? "Replacement recommended soon" : "Immediate replacement required";

  const sohColor = BATTERY.soh >= 80 ? "#22c55e" : BATTERY.soh >= 60 ? "#f97316" : "#ef4444";
  const socColor = BATTERY.soc >= 80 ? "#22c55e" : BATTERY.soc >= 50 ? "#eab308" : "#ef4444";

  const runTest = () => {
    setTestRunning(true);
    setTestDone(false);
    setTimeout(() => { setTestRunning(false); setTestDone(true); }, 3500);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#080b12]">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-yellow-400" />
          <BatteryCharging className="w-5 h-5 text-yellow-400" />
          <div>
            <h1 className="text-lg font-black text-white leading-none">
              {isAr ? "محلل البطارية والجهاز الكهربائي" : "Battery & Electrical Analyzer"}
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? "فحص SOH / CCA / الدينامو / المارش — مرجعية Midtronics MDX-650P" : "SOH / CCA / Alternator / Starter — Midtronics MDX-650P Reference"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
          style={{ backgroundColor: recColor + "12", borderColor: recColor + "30" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: recColor }} />
          <span className="text-[10px] font-bold" style={{ color: recColor }}>
            {isAr ? recLabelAr : recLabelEn}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 grid grid-cols-3 gap-5">

          {/* Battery specs card */}
          <div className="col-span-1 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
              {isAr ? "مواصفات البطارية" : "Battery Specs"}
            </div>
            <div className="text-sm font-black text-white mb-1">{BATTERY.brand}</div>
            <div className="text-[10px] text-slate-500 mb-4">{BATTERY.capacity} · {BATTERY.rated_cca} CCA</div>

            {/* SOH & SOC gauges */}
            <div className="flex justify-around mb-4">
              <CircleGauge value={BATTERY.soh} label={isAr ? "صحة البطارية" : "State of Health"} color={sohColor} size={90} />
              <CircleGauge value={BATTERY.soc} label={isAr ? "مستوى الشحن" : "State of Charge"} color={socColor} size={90} />
            </div>

            {/* Key metrics */}
            <div className="space-y-2">
              {[
                { k: isAr ? "الجهد في الراحة" : "Rest Voltage", v: `${BATTERY.voltage_rest} V`, c: BATTERY.voltage_rest >= 12.4 ? "#22c55e" : "#f97316" },
                { k: isAr ? "جهد تحت الحمل" : "Load Voltage", v: `${BATTERY.voltage_load} V`, c: BATTERY.voltage_load >= 10.5 ? "#22c55e" : "#ef4444" },
                { k: isAr ? "المقاومة الداخلية" : "Internal Resistance", v: `${BATTERY.internal_resistance} mΩ`, c: BATTERY.internal_resistance <= 10 ? "#22c55e" : "#f97316" },
                { k: isAr ? "عدد دورات الشحن" : "Charge Cycles", v: `${BATTERY.cycles}`, c: "#94a3b8" },
                { k: isAr ? "عمر البطارية" : "Battery Age", v: `${Math.floor(BATTERY.age_months / 12)}y ${BATTERY.age_months % 12}m`, c: "#94a3b8" },
              ].map(m => (
                <div key={m.k} className="flex justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-[10px] text-slate-600">{m.k}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: m.c }}>{m.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Center column: CCA + Voltage chart */}
          <div className="col-span-1 flex flex-col gap-4">
            {/* CCA Test */}
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                  {isAr ? "اختبار CCA (التيار البارد)" : "CCA Cold Cranking Test"}
                </div>
                <button
                  onClick={runTest}
                  disabled={testRunning}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                    testRunning ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08]"
                  )}
                >
                  {testRunning ? <><RotateCcw className="w-3 h-3 animate-spin" />{isAr ? "جارٍ..." : "Testing..."}</> : <>{isAr ? "اختبر الآن" : "Run Test"}</>}
                </button>
              </div>

              {/* CCA visual bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] text-slate-600">{isAr ? "المقاس الفعلي" : "Measured"}</span>
                  <span className="font-mono text-xs font-black text-yellow-400">{BATTERY.measured_cca} A</span>
                </div>
                <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-1000"
                    style={{ width: `${(BATTERY.measured_cca / BATTERY.rated_cca) * 100}%`, boxShadow: "0 0 8px #eab30860" }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-700">0 A</span>
                  <span className="text-[9px] text-slate-600">{isAr ? "مقنن:" : "Rated:"} {BATTERY.rated_cca} A</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border"
                style={{
                  backgroundColor: (BATTERY.measured_cca / BATTERY.rated_cca) >= 0.75 ? "#22c55e12" : "#f9731612",
                  borderColor: (BATTERY.measured_cca / BATTERY.rated_cca) >= 0.75 ? "#22c55e25" : "#f9731625",
                }}>
                <div className="flex items-center gap-2">
                  {(BATTERY.measured_cca / BATTERY.rated_cca) >= 0.75
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                  <span className="text-[10px] font-bold"
                    style={{ color: (BATTERY.measured_cca / BATTERY.rated_cca) >= 0.75 ? "#22c55e" : "#f97316" }}>
                    {Math.round((BATTERY.measured_cca / BATTERY.rated_cca) * 100)}% {isAr ? "من القدرة المقننة" : "of rated capacity"}
                  </span>
                </div>
              </div>

              {testDone && (
                <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400">
                  ✓ {isAr ? "اكتمل الاختبار — النتائج محدّثة" : "Test complete — results updated"}
                </div>
              )}
            </div>

            {/* Voltage history */}
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
                {isAr ? "تاريخ الجهد — 24 ساعة" : "Voltage History — 24 Hours"}
              </div>
              <VoltageChart data={VOLTAGE_HISTORY} />
              <div className="flex justify-between mt-2 text-[9px] text-slate-700">
                <span>00:00</span>
                <span className="text-blue-500/50">{isAr ? "▲ فترة الشحن" : "▲ charging"}</span>
                <span>24:00</span>
              </div>
            </div>
          </div>

          {/* Right column: Alternator + Starter */}
          <div className="col-span-1 flex flex-col gap-4">
            {/* Alternator */}
            <div className="p-4 rounded-2xl border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-green-400" />
                <div className="text-[9px] font-bold uppercase tracking-widest text-green-600">
                  {isAr ? "اختبار الدينامو (Alternator)" : "Alternator Test"}
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
              </div>

              <div className="space-y-2.5">
                {[
                  { k: isAr ? "جهد عند الخمول" : "At idle", v: `${ALTERNATOR.voltage_idle} V`, rpm: "800 RPM" },
                  { k: isAr ? "جهد عند 2000 RPM" : "At 2000 RPM", v: `${ALTERNATOR.voltage_2000rpm} V`, rpm: "2000 RPM" },
                  { k: isAr ? "جهد عند 3500 RPM" : "At 3500 RPM", v: `${ALTERNATOR.voltage_3500rpm} V`, rpm: "3500 RPM" },
                ].map(a => (
                  <div key={a.k} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-[9px] text-slate-600">{a.k}</div>
                      <div className="h-1 rounded-full bg-white/[0.04] mt-1 overflow-hidden">
                        <div className="h-full rounded-full bg-green-400"
                          style={{ width: `${((parseFloat(a.v) - 13) / 2) * 100}%` }} />
                      </div>
                    </div>
                    <span className="font-mono text-xs font-black text-green-400 w-12 text-right">{a.v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { k: isAr ? "تموج الجهد" : "Ripple", v: `${ALTERNATOR.ripple_mv} mV`, ok: ALTERNATOR.ripple_mv < 100 },
                  { k: isAr ? "تيار الشحن" : "Output", v: `${ALTERNATOR.charge_current_a} A`, ok: true },
                ].map(m => (
                  <div key={m.k} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <div className="text-[9px] text-slate-600">{m.k}</div>
                    <div className="font-mono text-xs font-black" style={{ color: m.ok ? "#22c55e" : "#f97316" }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Starter motor */}
            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="w-4 h-4 text-blue-400" />
                <div className="text-[9px] font-bold uppercase tracking-widest text-blue-600">
                  {isAr ? "اختبار المارش (Starter)" : "Starter Motor Test"}
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 ml-auto" />
              </div>
              <div className="space-y-2">
                {[
                  { k: isAr ? "ذروة تيار التشغيل" : "Peak Start Current", v: `${STARTER.peak_current_a} A`, ok: STARTER.peak_current_a < 200 },
                  { k: isAr ? "انخفاض الجهد عند التشغيل" : "Voltage Drop Cranking", v: `${STARTER.crank_voltage_drop} V`, ok: STARTER.crank_voltage_drop > 9.6 },
                  { k: isAr ? "زمن تشغيل المحرك" : "Crank Time to Start", v: `${STARTER.crank_time_ms} ms`, ok: STARTER.crank_time_ms < 600 },
                ].map(m => (
                  <div key={m.k} className="flex justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                    <span className="text-[10px] text-slate-600">{m.k}</span>
                    <span className="font-mono text-[10px] font-black" style={{ color: m.ok ? "#3b82f6" : "#f97316" }}>{m.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-4 rounded-2xl border"
              style={{ backgroundColor: recColor + "08", borderColor: recColor + "30" }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: recColor }} />
                <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: recColor + "aa" }}>
                  {isAr ? "التوصية" : "Recommendation"}
                </div>
              </div>
              <p className="text-[11px] font-medium leading-relaxed" style={{ color: recColor }}>
                {isAr
                  ? `البطارية عمرها ${Math.floor(BATTERY.age_months / 12)} سنوات وقدرتها انخفضت لـ ${BATTERY.soh}% من قدرتها الأصلية. يُنصح باستبدالها خلال 60–90 يوماً لتجنب العطل المفاجئ في الطقس البارد.`
                  : `Battery is ${Math.floor(BATTERY.age_months / 12)} years old with ${BATTERY.soh}% capacity remaining. Replacement recommended within 60–90 days to prevent cold-weather failure.`}
              </p>
              <div className="mt-2 text-[9px]" style={{ color: recColor + "70" }}>
                {isAr ? "مواصفات الاستبدال: 95Ah / 830CCA (AGM مُوصى به)" : "Replacement spec: 95Ah / 830CCA (AGM recommended)"}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
