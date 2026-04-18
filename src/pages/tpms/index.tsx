import { useState, useEffect } from "react";
import { Gauge, AlertTriangle, CheckCircle2, RefreshCw, Bluetooth, Settings2, Info, Loader2, Layers, TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SensorStatus = "ok" | "low" | "missing" | "fault";

interface TireSensor {
  position: "FL" | "FR" | "RL" | "RR";
  labelAr: string;
  sensorId: string;
  pressure: number;
  temperature: number;
  battery: number;
  status: SensorStatus;
  tread: number;
}

function generateSensors(): TireSensor[] {
  return [
    { position: "FL", labelAr: "أمامي أيسر",  sensorId: "0x" + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,"0"), pressure: 32 + Math.random()*4-2,  temperature: 22 + Math.random()*8, battery: 85 + Math.random()*15, status: "ok",      tread: 6.5 + Math.random()*2 },
    { position: "FR", labelAr: "أمامي أيمن",  sensorId: "0x" + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,"0"), pressure: 28 + Math.random()*3-1,  temperature: 24 + Math.random()*8, battery: 40 + Math.random()*20, status: "low",     tread: 3.2 + Math.random()*1 },
    { position: "RL", labelAr: "خلفي أيسر",   sensorId: "0x" + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,"0"), pressure: 33 + Math.random()*3,    temperature: 20 + Math.random()*8, battery: 90 + Math.random()*10, status: "ok",      tread: 5.8 + Math.random()*2 },
    { position: "RR", labelAr: "خلفي أيمن",   sensorId: "0000000",                                                                            pressure: 0,                        temperature: 0,                    battery: 0,                    status: "missing", tread: 1.5 + Math.random()*1 },
  ];
}

const STATUS_CONFIG: Record<SensorStatus, { color: string; bg: string; border: string; label: string }> = {
  ok:      { color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  label: "سليم"      },
  low:     { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "ضغط منخفض" },
  missing: { color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    label: "مفقود"     },
  fault:   { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "عطل"       },
};

function TreadBar({ mm }: { mm: number }) {
  const pct = Math.min(100, (mm / 10) * 100);
  const color = mm >= 5 ? "#22c55e" : mm >= 3 ? "#eab308" : "#ef4444";
  const label = mm >= 5 ? "ممتاز" : mm >= 3 ? "مقبول" : "يحتاج تبديل";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span style={{ color }} className="font-bold">{mm.toFixed(1)} مم</span>
        <span style={{ color }} className="font-bold">{label}</span>
      </div>
      <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-border relative">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        {/* Legal minimum line */}
        <div className="absolute top-0 bottom-0 w-px bg-red-500/60" style={{ left: "16%" }} />
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground">
        <span>0 مم</span>
        <span className="text-red-400">الحد القانوني 1.6 مم</span>
        <span>10 مم</span>
      </div>
    </div>
  );
}

function TireCard({ sensor, onProgram }: { sensor: TireSensor; onProgram: () => void }) {
  const cfg = STATUS_CONFIG[sensor.status];
  const pressurePct = Math.min(100, (sensor.pressure / 45) * 100);
  return (
    <div className={`rounded-2xl border p-5 ${cfg.border} ${cfg.bg} flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{sensor.position}</span>
          <div className="text-base font-bold mt-0.5">{sensor.labelAr}</div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${cfg.border} ${cfg.color}`}>{cfg.label}</span>
      </div>
      {sensor.status !== "missing" ? (
        <>
          <div className="text-center">
            <div className={`text-4xl font-black font-mono ${cfg.color}`}>{sensor.pressure.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">PSI</div>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-border">
            <div className="h-full rounded-full transition-all" style={{ width: `${pressurePct}%`, backgroundColor: sensor.status === "ok" ? "#22c55e" : "#eab308" }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div><div className="font-mono font-bold">{sensor.temperature.toFixed(0)}°C</div><div className="text-muted-foreground">الحرارة</div></div>
            <div><div className="font-mono font-bold">{sensor.battery.toFixed(0)}%</div><div className="text-muted-foreground">البطارية</div></div>
            <div><div className="font-mono font-bold text-[9px]">{sensor.sensorId}</div><div className="text-muted-foreground">ID</div></div>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="text-3xl mb-1">❌</div>
          <p className="text-xs text-muted-foreground">لا يوجد مستشعر مثبّت</p>
        </div>
      )}
      <button onClick={onProgram}
        className="w-full py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5">
        <Settings2 className="w-3.5 h-3.5" />
        {sensor.status === "missing" ? "تركيب مستشعر جديد" : "إعادة برمجة"}
      </button>
    </div>
  );
}

function TreadTireCard({ sensor }: { sensor: TireSensor }) {
  const treadColor = sensor.tread >= 5 ? "#22c55e" : sensor.tread >= 3 ? "#eab308" : "#ef4444";
  const recommendation = sensor.tread >= 5 ? "حالة ممتازة" : sensor.tread >= 3 ? "تابع بعد 5,000 كم" : "يحتاج تبديل فوري";
  return (
    <div className={cn("rounded-2xl border p-5 space-y-4",
      sensor.tread < 3 ? "border-red-500/30 bg-red-500/5" : sensor.tread < 5 ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5"
    )}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{sensor.position}</div>
          <div className="font-bold">{sensor.labelAr}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black" style={{ color: treadColor }}>{sensor.status === "missing" ? "--" : sensor.tread.toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground">مم</div>
        </div>
      </div>
      {sensor.status !== "missing" ? (
        <>
          <TreadBar mm={sensor.tread} />
          <div className="p-2 rounded-lg text-center text-[10px] font-bold" style={{ backgroundColor: treadColor + "15", color: treadColor }}>
            {recommendation}
          </div>
        </>
      ) : (
        <div className="text-center py-2 text-xs text-muted-foreground">لا يوجد مستشعر</div>
      )}
    </div>
  );
}

const RELEARN_METHODS = [
  { id: "obdii",      nameAr: "إعادة تعلم OBD-II",       descAr: "تلقائي عبر منفذ OBD",          time: "~2 دقيقتان"  },
  { id: "stationary", nameAr: "إعادة تعلم ثابت",         descAr: "تشغيل المحرك مع ضغط الإطارات", time: "~10 دقائق" },
  { id: "drive",      nameAr: "إعادة تعلم أثناء القيادة", descAr: "قيادة لمدة 10–30 دقيقة",       time: "~20 دقيقة" },
];

type Tab = "sensors" | "tread" | "relearn";

export default function TPMS() {
  const { lang } = useI18n();
  const [sensors, setSensors] = useState<TireSensor[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [selectedRelearn, setSelectedRelearn] = useState<string | null>(null);
  const [programTarget, setProgramTarget] = useState<TireSensor | null>(null);
  const [tab, setTab] = useState<Tab>("sensors");

  const scan = () => {
    setScanning(true);
    setTimeout(() => { setSensors(generateSensors()); setScanning(false); setScanned(true); }, 2500);
  };

  const avgTread = sensors.filter(s => s.status !== "missing").reduce((acc, s) => acc + s.tread, 0) / Math.max(1, sensors.filter(s => s.status !== "missing").length);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
          <Gauge className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">TPMS — ضواغط وإطارات</h1>
          <p className="text-sm text-muted-foreground">مستشعرات الضغط + تحليل عمق المداس</p>
        </div>
        <button onClick={scan} disabled={scanning}
          className="mr-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-bold hover:bg-blue-500/25 transition-all disabled:opacity-50">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
          {scanning ? "جارٍ المسح..." : "مسح المستشعرات"}
        </button>
      </div>

      {!scanned && !scanning && (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <Gauge className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg font-medium text-muted-foreground mb-2">اضغط "مسح المستشعرات" لبدء الاتصال</p>
          <p className="text-sm text-muted-foreground">RF 315/433 MHz · OBD-II · BLE</p>
        </div>
      )}

      {scanning && (
        <div className="py-16 text-center border border-border rounded-2xl bg-card">
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">جارٍ البحث عن مستشعرات TPMS...</p>
          <p className="text-[10px] text-muted-foreground mt-1">RF 315 MHz → 433 MHz → BLE</p>
        </div>
      )}

      {scanned && sensors.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "سليم",    count: sensors.filter(s=>s.status==="ok").length,      color: "text-green-400"  },
              { label: "منخفض",  count: sensors.filter(s=>s.status==="low").length,     color: "text-yellow-400" },
              { label: "مفقود",  count: sensors.filter(s=>s.status==="missing").length, color: "text-red-400"    },
              { label: "متوسط مداس", count: isNaN(avgTread) ? "--" : avgTread.toFixed(1) + " مم", color: avgTread >= 5 ? "text-green-400" : avgTread >= 3 ? "text-yellow-400" : "text-red-400" },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl border border-border bg-card text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.count}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            {([["sensors","مستشعرات الضغط"], ["tread","محلّل المداس "], ["relearn","إعادة التعلم"]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn("flex-1 py-2.5 text-xs font-bold transition-all",
                  tab === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                {label}
              </button>
            ))}
          </div>

          {/* TAB: Sensors */}
          {tab === "sensors" && (
            <div className="grid grid-cols-2 gap-4">
              {sensors.map(s => <TireCard key={s.position} sensor={s} onProgram={() => setProgramTarget(s)} />)}
            </div>
          )}

          {/* TAB: Tire Tread Analyzer */}
          {tab === "tread" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">محلّل عمق المداس — Tire Tread Analyzer</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-4">الحد القانوني الأدنى: 1.6 مم · يُنصح بالتبديل عند: 3 مم</p>
                <div className="grid grid-cols-2 gap-4">
                  {sensors.map(s => <TreadTireCard key={s.position} sensor={s} />)}
                </div>
              </div>
              {/* Overall recommendation */}
              <div className={cn("p-4 rounded-2xl border flex items-center gap-3",
                avgTread >= 5 ? "border-green-500/30 bg-green-500/5" : avgTread >= 3 ? "border-yellow-500/30 bg-yellow-500/5" : "border-red-500/30 bg-red-500/5"
              )}>
                {avgTread >= 5 ? <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" /> : avgTread >= 3 ? <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />}
                <div>
                  <div className="font-bold text-sm">التوصية الإجمالية</div>
                  <div className="text-xs text-muted-foreground">
                    {avgTread >= 5 ? "إطارات في حالة ممتازة — الفحص القادم بعد 10,000 كم" :
                     avgTread >= 3 ? "مداس مقبول — يُنصح بالتخطيط لتبديل الإطارات قريباً" :
                     "مداس أقل من الحد الآمن — يُنصح بالتبديل الفوري"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Relearn */}
          {tab === "relearn" && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold">إجراءات إعادة التعلم</span>
              </div>
              <div className="p-4 space-y-2">
                {RELEARN_METHODS.map(m => (
                  <button key={m.id} onClick={() => setSelectedRelearn(selectedRelearn === m.id ? null : m.id)}
                    className={`w-full text-right p-3 rounded-xl border transition-all ${selectedRelearn === m.id ? "border-primary/40 bg-primary/5" : "border-border hover:border-white/20"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{m.nameAr}</span>
                      <span className="text-[10px] text-muted-foreground">{m.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{m.descAr}</p>
                    {selectedRelearn === m.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                          بدء إجراء إعادة التعلم
                        </button>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Program modal */}
      {programTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setProgramTarget(null)}>
          <div className="w-80 bg-[#0a0e1a] border border-border rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-1">{programTarget.labelAr} — برمجة المستشعر</h3>
            <p className="text-[11px] text-muted-foreground mb-4">إدخال ID المستشعر الجديد يدوياً أو عبر المسح</p>
            <input className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-center text-sm mb-3 focus:outline-none focus:border-primary/50"
              placeholder="أدخل Sensor ID أو امسح المستشعر" />
            <div className="flex gap-2">
              <button onClick={() => setProgramTarget(null)}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">برمجة</button>
              <button onClick={() => setProgramTarget(null)}
                className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
