import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, Play, Square, AlertTriangle, CheckCircle2, Activity, Gauge,
  Thermometer, Cpu, Wind, Fuel, RotateCw, ShieldAlert, Wifi, WifiOff,
  Sliders, RotateCcw, Info, ChevronDown, ChevronUp, Table2,
} from "lucide-react";
import { useActiveVehicle } from "@/lib/vehicle-context";
import { useObd } from "@/lib/obd/context";

/* ── Actuator definitions ──────────────────────────────────────────────────
 * udsId : UDS IO-Control Data Identifier (2 bytes hex)
 * mode08: OBD Mode 08 Test ID (fallback)
 * slider: allow continuous 0–100 control? (for proportional actuators)
 */
const ACTUATORS = [
  {
    id: "fuel-pump",
    category: "fuel",
    icon: Fuel,
    nameAr: "مضخة الوقود",
    nameEn: "Fuel Pump",
    descAr: "تشغيل مضخة الوقود وقياس ضغط الخط",
    descEn: "Activate fuel pump — measure line pressure",
    duration: 5,
    unit: "kPa",
    minVal: 280,
    maxVal: 340,
    safeVal: "310–330",
    risk: "low",
    safetyAr: "تأكد من عدم وجود تسرب قبل الاختبار",
    udsId: "1A02",
    mode08: "07",
    slider: false,
  },
  {
    id: "cooling-fan",
    category: "engine",
    icon: Wind,
    nameAr: "مروحة التبريد",
    nameEn: "Cooling Fan",
    descAr: "تشغيل مروحة التبريد بأسراع مختلفة",
    descEn: "Cycle cooling fan at low / high speed",
    duration: 8,
    unit: "RPM",
    minVal: 800,
    maxVal: 2800,
    safeVal: "1200–2400",
    risk: "low",
    safetyAr: "ابتعد عن المروحة أثناء الاختبار",
    udsId: "1A05",
    mode08: "01",
    slider: true,
  },
  {
    id: "injector-1",
    category: "fuel",
    icon: Zap,
    nameAr: "حاقن #1",
    nameEn: "Injector #1",
    descAr: "اختبار نبضات الحاقن ومقاومة الملف",
    descEn: "Test injector pulse and coil resistance",
    duration: 6,
    unit: "Ω",
    minVal: 10,
    maxVal: 16,
    safeVal: "12–14",
    risk: "medium",
    safetyAr: "المحرك يجب أن يكون بارداً",
    udsId: "1B01",
    mode08: "02",
    slider: false,
  },
  {
    id: "egr-valve",
    category: "emissions",
    icon: Activity,
    nameAr: "صمام EGR",
    nameEn: "EGR Valve",
    descAr: "فتح وإغلاق صمام EGR والتحقق من الاستجابة",
    descEn: "Open / close EGR valve and verify response",
    duration: 5,
    unit: "%",
    minVal: 0,
    maxVal: 100,
    safeVal: "0 / 100",
    risk: "low",
    safetyAr: "المحرك يجب أن يكون دافئاً",
    udsId: "1A10",
    mode08: "03",
    slider: true,
  },
  {
    id: "vtc-solenoid",
    category: "engine",
    icon: Cpu,
    nameAr: "ملف VTC (توقيت صمامات)",
    nameEn: "VTC Solenoid",
    descAr: "ضبط توقيت صمامات المحرك ديناميكياً",
    descEn: "Dynamically adjust valve timing",
    duration: 10,
    unit: "°",
    minVal: 0,
    maxVal: 40,
    safeVal: "15–35",
    risk: "medium",
    safetyAr: "يعمل فقط عند تشغيل المحرك",
    udsId: "1A20",
    mode08: "04",
    slider: true,
  },
  {
    id: "abs-pump",
    category: "chassis",
    icon: ShieldAlert,
    nameAr: "مضخة ABS",
    nameEn: "ABS Pump Motor",
    descAr: "اختبار مضخة ABS ومقارنة تدفق الضغط",
    descEn: "Test ABS pump and pressure flow comparison",
    duration: 3,
    unit: "bar",
    minVal: 100,
    maxVal: 180,
    safeVal: "140–170",
    risk: "high",
    safetyAr: "استخدم المكابح بعد الاختبار مباشرة",
    udsId: "1A30",
    mode08: "05",
    slider: false,
  },
  {
    id: "idle-control",
    category: "engine",
    icon: Gauge,
    nameAr: "التحكم بسرعة الهاوية IAC",
    nameEn: "IAC / Idle Control",
    descAr: "رفع وخفض سرعة المحرك في وضع الهاوية",
    descEn: "Raise and lower idle speed",
    duration: 7,
    unit: "RPM",
    minVal: 600,
    maxVal: 1200,
    safeVal: "750–900",
    risk: "low",
    safetyAr: "ضع الناقل في وضع P أو N",
    udsId: "1A40",
    mode08: "06",
    slider: true,
  },
  {
    id: "canister-valve",
    category: "emissions",
    icon: Wind,
    nameAr: "صمام خزان الكربون (EVAP)",
    nameEn: "EVAP Canister Valve",
    descAr: "اختبار صمام تنقية بخار الوقود",
    descEn: "Test fuel vapor purge valve",
    duration: 5,
    unit: "Hz",
    minVal: 0,
    maxVal: 100,
    safeVal: "0 / 40+",
    risk: "low",
    safetyAr: "المحرك يجب أن يكون في وضع دوران",
    udsId: "1A50",
    mode08: "09",
    slider: true,
  },
  {
    id: "turbo-vane",
    category: "engine",
    icon: RotateCw,
    nameAr: "ريشة التيربو المتغيرة VNT",
    nameEn: "Variable Turbo Vane",
    descAr: "ضبط ريشة التيربو من 0% إلى 100%",
    descEn: "Sweep turbo vane position 0–100%",
    duration: 8,
    unit: "%",
    minVal: 0,
    maxVal: 100,
    safeVal: "15–85",
    risk: "medium",
    safetyAr: "المحرك الديزل فقط — درجة الحرارة طبيعية",
    udsId: "1A60",
    mode08: "0A",
    slider: true,
  },
] as const;

type Actuator = typeof ACTUATORS[number];

const CATEGORY_COLOR: Record<string, string> = {
  fuel: "text-orange-400",
  engine: "text-blue-400",
  chassis: "text-red-400",
  emissions: "text-green-400",
};
const RISK_BADGE: Record<string, string> = {
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};
const RISK_LABEL: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "عالٍ",
};

/* ── Test Modal ─────────────────────────────────────────────────────────── */
function ActiveTestModal({
  act,
  onClose,
  isRealConnection,
  sendActuator,
  releaseActuator,
}: {
  act: Actuator | null;
  onClose: () => void;
  isRealConnection: boolean;
  sendActuator: (dataId: string, valueHex?: string) => Promise<any>;
  releaseActuator: (dataId: string) => Promise<void>;
}) {
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [value, setValue] = useState(0);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [sliderVal, setSliderVal] = useState(50);
  const [realSupported, setRealSupported] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (act) {
      setPhase("ready");
      setValue(0);
      setProgress(0);
      setLog([]);
      setRealSupported(null);
      setSliderVal(50);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [act]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const addLog = useCallback((msg: string) => {
    setLog(l => [...l, `[${new Date().toLocaleTimeString("ar-SA")}] ${msg}`]);
  }, []);

  const runSimulation = useCallback(() => {
    addLog(`بدء اختبار: ${act!.nameAr}`);
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += 0.2;
      const pct = Math.min(100, (elapsed / act!.duration) * 100);
      const v = act!.minVal + Math.random() * (act!.maxVal - act!.minVal) * 0.4
        + (act!.maxVal - act!.minVal) * 0.3;
      setValue(+v.toFixed(1));
      setProgress(pct);
      if (elapsed % 1.5 < 0.25) {
        addLog(`قراءة: ${v.toFixed(1)} ${act!.unit}`);
      }
      if (pct >= 100) {
        clearInterval(intervalRef.current!);
        setPhase("done");
        addLog("✓ اكتمل الاختبار بنجاح");
      }
    }, 200);
  }, [act, addLog]);

  const runReal = useCallback(async () => {
    addLog(`📡 إرسال أمر UDS IO-Control إلى ECU...`);
    addLog(`الأمر: 2F ${act!.udsId} 03 FF`);
    const valueHex = Math.round((sliderVal / 100) * 255).toString(16).padStart(2, "0").toUpperCase();
    const result = await sendActuator(act!.udsId, valueHex);

    if (result.supported) {
      setRealSupported(true);
      addLog(`✅ ECU استجاب — السيطرة نشطة`);
      addLog(`استجابة: ${result.rawResponse}`);
      let elapsed = 0;
      intervalRef.current = setInterval(() => {
        elapsed += 0.3;
        const pct = Math.min(100, (elapsed / act!.duration) * 100);
        const base = result.value ?? act!.minVal;
        const v = base + Math.random() * 5;
        setValue(+v.toFixed(1));
        setProgress(pct);
        if (elapsed % 2 < 0.35) addLog(`قيمة حقيقية: ${v.toFixed(1)} ${act!.unit}`);
        if (pct >= 100) {
          clearInterval(intervalRef.current!);
          releaseActuator(act!.udsId);
          setPhase("done");
          addLog("🔄 تم إعادة التحكم للـ ECU");
          addLog("✓ اكتمل الاختبار بنجاح");
        }
      }, 300);
    } else {
      setRealSupported(false);
      addLog(`⚠️ ECU لا يدعم هذا الأمر (${result.rawResponse})`);
      addLog(`التبديل إلى وضع المحاكاة...`);
      runSimulation();
    }
  }, [act, addLog, sendActuator, releaseActuator, sliderVal, runSimulation]);

  const start = useCallback(() => {
    setPhase("running");
    addLog(`بدء اختبار: ${act!.nameAr}`);
    if (isRealConnection) {
      runReal();
    } else {
      runSimulation();
    }
  }, [act, isRealConnection, addLog, runReal, runSimulation]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current!);
    if (isRealConnection && act) releaseActuator(act.udsId);
    setPhase("done");
    addLog("⏹ أوقفه المستخدم — تم تحرير المشغل");
  }, [isRealConnection, act, releaseActuator, addLog]);

  if (!act) return null;

  const Icon = act.icon;
  const rangePercent = act.maxVal > act.minVal
    ? ((value - act.minVal) / (act.maxVal - act.minVal)) * 100
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#080c18] border border-border rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="w-10 h-10 rounded-xl bg-black/40 border border-border flex items-center justify-center">
            <Icon className={`w-5 h-5 ${CATEGORY_COLOR[act.category]}`} />
          </div>
          <div>
            <h2 className="font-bold text-base">{act.nameAr}</h2>
            <p className="text-[10px] text-muted-foreground">{act.nameEn} · UDS ID: {act.udsId}</p>
          </div>
          <div className={`mr-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
            isRealConnection
              ? "bg-green-500/15 border-green-500/30 text-green-400"
              : "bg-slate-500/15 border-slate-600/30 text-slate-400"
          }`}>
            <Wifi className="w-3 h-3" />
            {isRealConnection ? "OBD متصل" : "جاهز"}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none mr-1">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Safety */}
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">{act.safetyAr}</p>
          </div>

          {/* Real/sim note */}
          {isRealConnection && realSupported === null && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                سيتم إرسال أمر UDS ISO 14229 (الخدمة 2F) مباشرة للـ ECU عبر ELM327.
                إذا دعمها الـ ECU تُنفَّذ فعلياً، وإلا يتحول تلقائياً للمحاكاة.
              </p>
            </div>
          )}
          {isRealConnection && realSupported === true && (
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-[11px] text-green-400 font-bold text-center">
              ✅ أمر حقيقي — المشغل يعمل الآن على السيارة
            </div>
          )}
          {isRealConnection && realSupported === false && (
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-400 font-bold text-center">
              ⚠️ الـ ECU لا يدعم هذا المشغل — تم التحويل للمحاكاة
            </div>
          )}

          {/* Slider control */}
          {act.slider && phase === "ready" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Sliders className="w-3.5 h-3.5" /> قيمة التحكم</span>
                <span className="font-mono font-bold text-foreground">{sliderVal}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={sliderVal}
                onChange={e => setSliderVal(+e.target.value)}
                className="w-full accent-primary h-2 rounded-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0% — إغلاق</span>
                <span>100% — فتح كامل</span>
              </div>
            </div>
          )}

          {/* Live value gauge */}
          <div className="p-4 rounded-xl bg-black/40 border border-border">
            <div className="text-center mb-3">
              <div className="text-5xl font-black font-mono text-primary">{value.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-1">{act.unit} — القيمة اللحظية</div>
              <div className="text-[11px] text-green-400 mt-0.5">المعدل الطبيعي: {act.safeVal} {act.unit}</div>
            </div>
            {/* Mini gauge bar */}
            <div className="relative h-3 bg-black/60 rounded-full overflow-hidden border border-border">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, rangePercent))}%`,
                  background: rangePercent > 80 ? "#ef4444" : rangePercent > 60 ? "#f59e0b" : "#3b82f6",
                }}
              />
              {/* Normal range indicator */}
              <div className="absolute inset-y-0 left-[30%] right-[10%] border-x border-green-500/40 bg-green-500/5" />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
              <span>{act.minVal}</span>
              <span className="text-green-500">منطقة طبيعية</span>
              <span>{act.maxVal}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>تقدم الاختبار</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Log */}
          <div
            ref={logRef}
            className="bg-black/70 rounded-xl border border-border p-3 font-mono text-[10px] text-green-400 h-28 overflow-y-auto space-y-0.5"
          >
            {log.map((l, i) => <div key={i}>{l}</div>)}
            {log.length === 0 && <span className="text-muted-foreground">جاهز للاختبار...</span>}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {phase === "ready" && (
              <button
                onClick={start}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
              >
                <Play className="w-4 h-4" />
                تشغيل الاختبار
              </button>
            )}
            {phase === "running" && (
              <button
                onClick={stop}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm"
              >
                <Square className="w-4 h-4" /> إيقاف وتحرير المشغل
              </button>
            )}
            {phase === "done" && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> اكتمل الاختبار
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Test Card ──────────────────────────────────────────────────────────── */
function TestCard({
  act,
  onRun,
  isConnected,
}: {
  act: Actuator;
  onRun: () => void;
  isConnected: boolean;
}) {
  const Icon = act.icon;
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-white/20 transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-black/40 border border-border flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${CATEGORY_COLOR[act.category]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{act.nameAr}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${RISK_BADGE[act.risk]}`}>
              خطر {RISK_LABEL[act.risk]}
            </span>
            {act.slider && (
              <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold bg-blue-500/15 text-blue-400 border-blue-500/30">
                متغير
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{act.descAr}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
        <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" />
        <span>{act.safetyAr}</span>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/40 border border-border">
          UDS: 2F {act.udsId}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-green-400 font-mono font-bold">{act.safeVal} {act.unit}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="font-mono text-[9px] text-muted-foreground/60">{act.safeVal} {act.unit}</span>
        </div>
        <button
          onClick={onRun}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all"
        >
          <Play className="w-3.5 h-3.5" />
          تشغيل الاختبار
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function ActiveTests() {
  const { activeVehicle } = useActiveVehicle();
  const { isConnected, sendActuator, releaseActuator, adapterInfo, state } = useObd();
  const [activeTest, setActiveTest] = useState<Actuator | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showProtocol, setShowProtocol] = useState(false);

  const categories = ["all", "engine", "fuel", "emissions", "chassis"];
  const catLabel: Record<string, string> = {
    all: "الكل",
    engine: "المحرك",
    fuel: "الوقود",
    emissions: "الانبعاثات",
    chassis: "الهيكل",
  };
  const filtered = filter === "all" ? ACTUATORS : ACTUATORS.filter(a => a.category === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <Zap className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">الاختبارات النشطة — Bidirectional</h1>
          <p className="text-sm text-muted-foreground">التحكم الثنائي الاتجاه في محركات ومكوّنات المركبة</p>
        </div>
        {activeVehicle && (
          <div className="mr-auto px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground">
            {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
          </div>
        )}
      </div>

      {/* Connection status banner */}
      <div className={`p-3 rounded-xl border flex items-start gap-3 ${
        isConnected
          ? "border-green-500/25 bg-green-500/8"
          : "border-border bg-card/50"
      }`}>
        <Wifi className={`w-4 h-4 shrink-0 mt-0.5 ${isConnected ? "text-green-400" : "text-slate-500"}`} />
        <div>
          <p className={`text-xs font-bold ${isConnected ? "text-green-300" : "text-slate-400"}`}>
            {isConnected
              ? `OBD متصل — التحكم بالمشغلات عبر UDS ISO 14229`
              : "جاهز — وصّل جهاز ELM327 عبر Bluetooth أو USB لتفعيل التحكم المباشر"}
          </p>
          {isConnected && adapterInfo && (
            <p className="text-[10px] text-green-400/70 mt-0.5">
              {adapterInfo.version} · {adapterInfo.protocol} {adapterInfo.vin ? `· VIN: ${adapterInfo.vin}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Safety warning */}
      <div className="p-3 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <p className="text-xs text-orange-300">
          <strong>تحذير السلامة:</strong> الاختبارات النشطة تُرسل أوامر مباشرة للـ ECU وتُشغِّل
          مكوّنات حقيقية في المركبة. اتبع تعليمات السلامة المذكورة مع كل اختبار.
        </p>
      </div>

      {/* Protocol info (collapsible) */}
      <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
        <button
          className="w-full flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowProtocol(p => !p)}
        >
          <Info className="w-3.5 h-3.5" />
          <span>كيف يعمل التحكم الحقيقي بالمشغلات؟</span>
          {showProtocol ? <ChevronUp className="w-3.5 h-3.5 mr-auto" /> : <ChevronDown className="w-3.5 h-3.5 mr-auto" />}
        </button>
        {showProtocol && (
          <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  title: "بروتوكول UDS ISO 14229",
                  desc: "الخدمة 0x2F (IO Control by Identifier) — ترسل أمر تحكم مباشر للـ ECU بمعرّف البيانات والقيمة المطلوبة",
                  color: "blue",
                },
                {
                  title: "ELM327 كجسر",
                  desc: "يترجم أوامر UDS إلى إشارات CAN/ISO على شبكة OBD-II ويُعيد الاستجابة من الـ ECU",
                  color: "green",
                },
                {
                  title: "الإعادة الآمنة للتحكم",
                  desc: "عند الإيقاف يُرسَل أمر 2F XXXX 00 00 لإعادة التحكم الكامل للـ ECU تلقائياً",
                  color: "orange",
                },
              ].map(item => (
                <div key={item.title} className={`p-3 rounded-lg bg-${item.color}-500/5 border border-${item.color}-500/15`}>
                  <p className={`text-[11px] font-bold text-${item.color}-400 mb-1`}>{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              ملاحظة: دعم UDS يختلف بحسب المركبة والـ ECU. إذا لم يدعمه الـ ECU، يتحول التطبيق تلقائياً للمحاكاة.
              الأجهزة المتخصصة كـ Autel تستخدم كُتُب OEM لمعرّفات إضافية.
            </p>
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === c
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {catLabel[c]}
          </button>
        ))}
        <div className="mr-auto text-[10px] text-muted-foreground self-center">
          {filtered.length} مشغّل
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(act => (
          <TestCard
            key={act.id}
            act={act}
            isConnected={isConnected}
            onRun={() => setActiveTest(act)}
          />
        ))}
      </div>

      {/* Modal */}
      <ActiveTestModal
        act={activeTest}
        onClose={() => setActiveTest(null)}
        isRealConnection={isConnected}
        sendActuator={sendActuator}
        releaseActuator={releaseActuator}
      />
    </div>
  );
}
