import { useState, useEffect, useRef } from "react";
import { Zap, Battery, Thermometer, Activity, AlertTriangle, CheckCircle2, BarChart3, Cpu, Wind, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CELL_COUNT = 96;

function CellGrid({ cells }: { cells: number[] }) {
  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.ceil(CELL_COUNT / 4)}, 1fr)` }}>
      {cells.map((v, i) => {
        const pct = ((v - 3.6) / (4.2 - 3.6)) * 100;
        const color = pct > 70 ? "#22c55e" : pct > 40 ? "#eab308" : "#ef4444";
        return (
          <div key={i} title={`Cell ${i + 1}: ${v.toFixed(3)}V`}
            className="h-4 rounded-sm cursor-pointer transition-opacity hover:opacity-70"
            style={{ backgroundColor: color + Math.round(pct * 0.8 + 20).toString(16).padStart(2, "0") }} />
        );
      })}
    </div>
  );
}

function Gauge({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const angle = (pct / 100) * 180 - 90;
  const r = 52, cx = 64, cy = 64;
  const toXY = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
  });
  const from = toXY(-90); const to = toXY(angle);
  const largeArc = pct > 50 ? 1 : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={128} height={80} viewBox="0 0 128 80">
        <path d={`M ${toXY(-90).x} ${toXY(-90).y} A ${r} ${r} 0 1 1 ${toXY(90).x} ${toXY(90).y}`}
          stroke="#1e293b" strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d={`M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 1 ${to.x} ${to.y}`}
          stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={16} fontWeight="bold">{value.toFixed(1)}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#94a3b8" fontSize={9}>{unit}</text>
      </svg>
      <span className="text-[10px] text-muted-foreground font-semibold">{label}</span>
    </div>
  );
}

export default function EVDiagnostics() {
  const { lang } = useI18n();
  const [tab, setTab] = useState<"battery"|"motor"|"charging"|"thermal">("battery");
  const [cells, setCells] = useState<number[]>([]);
  const [soc, setSoc] = useState(78.4);
  const [packVoltage, setPackVoltage] = useState(387.2);
  const [current, setCurrent] = useState(-12.3);
  const [temp, setTemp] = useState(28.7);
  const [motorRpm, setMotorRpm] = useState(1240);
  const [motorTemp, setMotorTemp] = useState(52.3);
  const [chargeV, setChargeV] = useState(0);
  const [chargeA, setChargeA] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    queueMicrotask(() => {
      const base = Array.from({ length: CELL_COUNT }, () => 3.85 + Math.random() * 0.3);
      base[7] = 3.62; base[23] = 3.58; base[51] = 4.19;
      setCells(base);
    });

    const tick = () => {
      setSoc(v => +(v + (Math.random() - 0.5) * 0.05).toFixed(2));
      setPackVoltage(v => +(v + (Math.random() - 0.5) * 0.8).toFixed(1));
      setCurrent(v => +(v + (Math.random() - 0.5) * 0.4).toFixed(1));
      setTemp(v => +(v + (Math.random() - 0.5) * 0.1).toFixed(1));
      setMotorRpm(v => Math.max(0, +(v + (Math.random() - 0.5) * 50).toFixed(0)));
      setMotorTemp(v => +(v + (Math.random() - 0.5) * 0.2).toFixed(1));
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const tabs = [
    { id: "battery",  labelAr: "بطارية",       icon: Battery    },
    { id: "motor",    labelAr: "موتور",         icon: Zap        },
    { id: "charging", labelAr: "شحن",           icon: TrendingUp },
    { id: "thermal",  labelAr: "إدارة حرارة",  icon: Thermometer},
  ] as const;

  const issues = cells.filter(v => v < 3.65 || v > 4.18).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <Zap className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">تشخيص المركبات الكهربائية EV</h1>
          <p className="text-sm text-muted-foreground">تحليل شامل لبطارية الجهد العالي، الموتور، ونظام الشحن</p>
        </div>
        <div className="mr-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-green-500/20 bg-green-500/5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-green-400 font-bold">BMS متصل</span>
        </div>
      </div>

      {issues > 0 && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-300">تحذير: {issues} خلية{issues > 1 ? " خارج" : ""} النطاق الطبيعي (3.65–4.18V) — تحقق على الفور</p>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "شحن البطارية SoC", value: `${soc.toFixed(1)}%`,    color: soc > 50 ? "text-green-400" : "text-yellow-400", icon: Battery },
          { label: "جهد الحزمة",       value: `${packVoltage.toFixed(1)}V`, color: "text-blue-400",   icon: Zap },
          { label: "تيار الحزمة",      value: `${current.toFixed(1)}A`, color: current < 0 ? "text-orange-400" : "text-cyan-400", icon: Activity },
          { label: "حرارة البطارية",   value: `${temp.toFixed(1)}°C`,   color: temp > 40 ? "text-red-400" : "text-teal-400", icon: Thermometer },
        ].map(k => (
          <div key={k.label} className="p-3 rounded-xl border border-border bg-card flex items-center gap-3">
            <k.icon className={`w-5 h-5 ${k.color} shrink-0`} />
            <div>
              <div className={`text-xl font-black font-mono ${k.color}`}>{k.value}</div>
              <div className="text-[9px] text-muted-foreground leading-tight">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.labelAr}
          </button>
        ))}
      </div>

      {tab === "battery" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">خريطة الخلايا — {CELL_COUNT} خلية</span>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${issues === 0 ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}`}>
                {issues === 0 ? "جميع الخلايا طبيعية" : `${issues} خلية شاذة`}
              </span>
            </div>
            <CellGrid cells={cells} />
            <div className="flex items-center gap-4 mt-3">
              {[{ color:"#22c55e", label:"طبيعية >70%"},{ color:"#eab308", label:"متوسطة 40–70%"},{ color:"#ef4444", label:"منخفضة <40%"}].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "أدنى خلية",   value: `${Math.min(...cells).toFixed(3)}V`, color: "text-red-400" },
              { label: "متوسط الخلايا",value: `${(cells.reduce((a,b)=>a+b,0)/cells.length).toFixed(3)}V`, color:"text-blue-400"},
              { label: "أعلى خلية",   value: `${Math.max(...cells).toFixed(3)}V`, color: "text-green-400"},
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl border border-border bg-card text-center">
                <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "motor" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "سرعة الموتور",   value: motorRpm, max: 4000, unit: "RPM",  color: "#3b82f6" },
            { label: "حرارة الموتور",  value: motorTemp, max: 150, unit: "°C",   color: motorTemp > 90 ? "#ef4444" : "#22c55e" },
            { label: "حرارة المحوّل",  value: 67.4,      max: 100, unit: "°C",   color: "#eab308" },
            { label: "عزم الدوران",    value: 180,       max: 300, unit: "N·m",  color: "#8b5cf6" },
          ].map(g => (
            <div key={g.label} className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center">
              <Gauge value={g.value} max={g.max} label={g.label} unit={g.unit} color={g.color} />
            </div>
          ))}
        </div>
      )}

      {tab === "charging" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 text-center">
            <div className="text-5xl font-black font-mono text-cyan-400 mb-1">{chargeV.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground mb-3">V — جهد الشاحن</div>
            <div className="text-3xl font-black font-mono text-green-400">{chargeA.toFixed(1)} A</div>
            <p className="text-xs text-muted-foreground mt-3">
              {chargeV === 0 ? "غير متصل بالشاحن حالياً" : "الشحن نشط"}
            </p>
            <button onClick={() => { setChargeV(v => v > 0 ? 0 : 240); setChargeA(v => v > 0 ? 0 : 32); }}
              className="mt-4 px-6 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm font-bold hover:bg-cyan-500/25 transition-all">
              {chargeV > 0 ? "إيقاف الشحن" : "اختبار الشحن"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "مستوى الشحن", value: "AC Level 2 (J1772)", color: "text-blue-400" },
              { label: "معدل الشحن",  value: "7.2 kW",             color: "text-green-400"},
              { label: "وقت الاكتمال",value: "2h 40min",           color: "text-yellow-400"},
              { label: "كفاءة الشحن", value: "94.2%",              color: "text-cyan-400" },
            ].map(i => (
              <div key={i.label} className="p-3 rounded-xl border border-border bg-card">
                <div className={`font-mono font-bold ${i.color}`}>{i.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{i.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "thermal" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["منطقة أمامية","منطقة خلفية","مدخل المشعاع","مخرج المشعاع"].map((z, i) => {
              const tVal = 24 + i * 5;
              const color = tVal > 40 ? "#ef4444" : tVal > 30 ? "#eab308" : "#22c55e";
              return (
                <div key={z} className="p-4 rounded-xl border border-border bg-card text-center">
                  <Thermometer className="w-6 h-6 mx-auto mb-2" style={{ color }} />
                  <div className="text-xl font-black font-mono" style={{ color }}>{tVal.toFixed(1)}°C</div>
                  <div className="text-[10px] text-muted-foreground">{z}</div>
                </div>
              );
            })}
          </div>
          <div className="p-4 rounded-2xl border border-border bg-card">
            <div className="text-sm font-bold mb-3">سجل درجات الحرارة (آخر ساعة)</div>
            <div className="flex items-end gap-1 h-24">
              {Array.from({length:30},(_,i)=>24+Math.sin(i/4)*8).map((t,i)=>(
                <div key={i} className="flex-1 rounded-t transition-all"
                  style={{ height:`${((t-15)/30)*100}%`, backgroundColor: t>40?"#ef4444":t>30?"#eab308":"#22c55e" }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
