import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useObd } from "@/lib/obd/context";
import type { MonitorStatus } from "@/lib/obd/elm327";
import {
  CheckCircle2, XCircle, MinusCircle, RefreshCw,
  Gauge, Flame, Droplets, Wind, Zap, ShieldCheck,
  AlertTriangle, Info, PlugZap, Activity, Wifi, Usb, Bluetooth
} from "lucide-react";

type MStatus = "complete" | "incomplete" | "na";

interface MonitorDef {
  id: keyof MonitorStatus;
  nameEn: string;
  nameAr: string;
  category: "continuous" | "non-continuous";
  icon: any;
  descEn: string;
  descAr: string;
  driveEn: string;
  driveAr: string;
}

const MONITOR_DEFS: MonitorDef[] = [
  {
    id: "misfire", nameEn: "Misfire Monitor", nameAr: "مراقب الاشتعال",
    category: "continuous", icon: Flame,
    descEn: "Detects engine misfires across all cylinders in real time",
    descAr: "يكتشف أعطال الاشتعال في جميع الأسطوانات فورياً",
    driveEn: "Drive at varying RPM between 1500–3500 for at least 10 minutes",
    driveAr: "قُد بسرعات متفاوتة بين 1500–3500 دورة/دقيقة لمدة 10 دقائق",
  },
  {
    id: "fuelSystem", nameEn: "Fuel System Monitor", nameAr: "مراقب منظومة الوقود",
    category: "continuous", icon: Droplets,
    descEn: "Monitors fuel trim, injectors and delivery system",
    descAr: "يراقب تعديل الوقود والحاقنات ونظام التوصيل",
    driveEn: "Complete a full cold-start drive cycle: idle 5 min, highway 20 min, stop-go city 10 min",
    driveAr: "قم بدورة قيادة كاملة: دوران 5 دقائق، طريق سريع 20 دقيقة، توقف وانطلاق 10 دقائق",
  },
  {
    id: "component", nameEn: "Component Monitor", nameAr: "مراقب المكونات الشامل",
    category: "continuous", icon: Activity,
    descEn: "Monitors all electrical components, sensors and actuators",
    descAr: "يراقب جميع المكونات الكهربائية والحساسات والمشغلات",
    driveEn: "Normal driving for 20–30 minutes covers component monitoring automatically",
    driveAr: "القيادة العادية لمدة 20–30 دقيقة تُكمل هذا الاختبار تلقائياً",
  },
  {
    id: "catalyst", nameEn: "Catalyst Monitor", nameAr: "مراقب المحفّز",
    category: "non-continuous", icon: ShieldCheck,
    descEn: "Tests catalytic converter efficiency (upstream vs downstream O2 sensors)",
    descAr: "يختبر كفاءة المحول الحفاز (مقارنة حساسات الأكسجين الأمامية والخلفية)",
    driveEn: "Warm up engine, drive 5 min at 45-55 mph, then decelerate without braking",
    driveAr: "سخّن المحرك، قُد 5 دقائق بسرعة 70-90 كم/س، ثم تباطأ بدون فرملة",
  },
  {
    id: "heatedCat", nameEn: "Heated Catalyst", nameAr: "المحفّز المسخّن",
    category: "non-continuous", icon: Flame,
    descEn: "Monitors heated catalytic converter warm-up function",
    descAr: "يراقب وظيفة تسخين المحول الحفاز",
    driveEn: "Cold-start, idle engine for 3 minutes, then drive normally",
    driveAr: "تشغيل بارد، اترك المحرك يعمل 3 دقائق ثم قُد بصورة طبيعية",
  },
  {
    id: "evap", nameEn: "Evaporative System", nameAr: "منظومة التبخر",
    category: "non-continuous", icon: Wind,
    descEn: "Checks for fuel vapor leaks in EVAP system and gas cap seal",
    descAr: "يفحص تسربات بخار الوقود في نظام EVAP وإحكام غطاء الوقود",
    driveEn: "Drive at 55-60 mph for 10 min with tank 1/4 to 3/4 full, then park 8 hours",
    driveAr: "قُد بسرعة 90-100 كم/س لمدة 10 دقائق مع خزان مليء بين 1/4 و3/4، ثم اترك السيارة 8 ساعات",
  },
  {
    id: "secondaryAir", nameEn: "Secondary Air System", nameAr: "نظام الهواء الثانوي",
    category: "non-continuous", icon: Wind,
    descEn: "Tests secondary air injection during cold-start warm-up",
    descAr: "يختبر حقن الهواء الثانوي أثناء تسخين المحرك بعد التشغيل البارد",
    driveEn: "Cold-start: idle for 2 minutes at ambient temperature below 35°C",
    driveAr: "تشغيل بارد: اترك المحرك يعمل 2 دقيقة في درجة حرارة محيط أقل من 35 درجة",
  },
  {
    id: "acRefrig", nameEn: "A/C Refrigerant", nameAr: "مبرّد التكييف",
    category: "non-continuous", icon: Wind,
    descEn: "Monitors A/C refrigerant charge and system pressure",
    descAr: "يراقب شحنة غاز التكييف وضغط النظام",
    driveEn: "Run A/C at max setting for 10 minutes while driving",
    driveAr: "شغّل التكييف على أقصى إعداد لمدة 10 دقائق أثناء القيادة",
  },
  {
    id: "o2Sensor", nameEn: "Oxygen Sensor", nameAr: "حساسات الأكسجين",
    category: "non-continuous", icon: Gauge,
    descEn: "Tests oxygen sensor response time and accuracy at operating temp",
    descAr: "يختبر استجابة ودقة حساسات الأكسجين عند درجة حرارة التشغيل",
    driveEn: "Warm up engine, then drive at 40-60 mph with some deceleration phases",
    driveAr: "سخّن المحرك ثم قُد بسرعة 65-100 كم/س مع فترات تباطؤ",
  },
  {
    id: "o2SensorHeat", nameEn: "O2 Sensor Heater", nameAr: "سخّان حساس الأكسجين",
    category: "non-continuous", icon: Flame,
    descEn: "Tests the electrical heater element inside the oxygen sensor",
    descAr: "يختبر عنصر التسخين الكهربائي داخل حساس الأكسجين",
    driveEn: "Cold-start and idle for 5 minutes — heater activates automatically",
    driveAr: "تشغيل بارد ثم اترك المحرك يعمل 5 دقائق — سيُنشّط السخّان تلقائياً",
  },
  {
    id: "egrVvt", nameEn: "EGR / VVT System", nameAr: "نظام EGR / VVT",
    category: "non-continuous", icon: RefreshCw,
    descEn: "Monitors exhaust gas recirculation and variable valve timing",
    descAr: "يراقب نظام إعادة تدوير غاز العادم وتوقيت الصمام المتغير",
    driveEn: "Drive at highway speeds (55-70 mph) for at least 15 minutes",
    driveAr: "قُد على الطريق السريع (90-115 كم/س) لمدة 15 دقيقة على الأقل",
  },
];

function getStatus(data: MonitorStatus, id: keyof MonitorStatus): MStatus {
  if (id === "milOn" || id === "confirmedDtcCount") return "na";
  const val = data[id] as { supported: boolean; complete: boolean };
  if (!val.supported) return "na";
  return val.complete ? "complete" : "incomplete";
}

function buildMonitors(data: MonitorStatus | null): Array<MonitorDef & { status: MStatus }> {
  return MONITOR_DEFS.map(def => ({
    ...def,
    status: data ? getStatus(data, def.id) : "na",
  }));
}

const StatusBadge = ({ status, lang }: { status: MStatus; lang: string }) => {
  if (status === "complete") return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
      <CheckCircle2 className="w-3 h-3" />
      <span className="text-[10px] font-bold">{lang === "ar" ? "جاهز" : "READY"}</span>
    </div>
  );
  if (status === "incomplete") return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
      <AlertTriangle className="w-3 h-3" />
      <span className="text-[10px] font-bold">{lang === "ar" ? "غير جاهز" : "NOT READY"}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 shrink-0">
      <MinusCircle className="w-3 h-3" />
      <span className="text-[10px] font-bold">{lang === "ar" ? "غير مدعوم" : "N/A"}</span>
    </div>
  );
};

export default function OBDMonitors() {
  const { lang } = useI18n();
  const { state: obdState, monitors: rawMonitors, monitorsLoading, fetchMonitors, isConnected, connectBt, connectUsb, connectWifi } = useObd();
  const [selected, setSelected] = useState<(MonitorDef & { status: MStatus }) | null>(null);
  const [wifiHost, setWifiHost] = useState("192.168.0.10");
  const [wifiPort, setWifiPort] = useState(35000);
  const [showWifi, setShowWifi] = useState(false);

  const monitors = buildMonitors(rawMonitors);
  const continuous = monitors.filter(m => m.category === "continuous");
  const nonContinuous = monitors.filter(m => m.category === "non-continuous");
  const readyCount = monitors.filter(m => m.status === "complete").length;
  const notReadyCount = monitors.filter(m => m.status === "incomplete").length;
  const naCount = monitors.filter(m => m.status === "na").length;
  const inspectionPass = notReadyCount === 0 && rawMonitors !== null;
  const isReal = rawMonitors !== null;

  useEffect(() => {
    if (isConnected && !rawMonitors) {
      fetchMonitors();
    }
  }, [isConnected]);

  const handleScan = () => {
    if (!isConnected) return;
    fetchMonitors();
  };

  const MonitorRow = ({ m }: { m: MonitorDef & { status: MStatus } }) => {
    const Icon = m.icon;
    return (
      <button
        onClick={() => setSelected(m)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
          selected?.id === m.id
            ? "bg-blue-500/10 border-blue-500/30"
            : m.status === "na"
            ? "bg-white/[0.01] border-white/[0.04] opacity-50"
            : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-semibold text-white">{lang === "ar" ? m.nameAr : m.nameEn}</div>
          <div className="text-[10px] text-slate-500 truncate">{lang === "ar" ? m.descAr : m.descEn}</div>
        </div>
        <StatusBadge status={m.status} lang={lang} />
      </button>
    );
  };

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {lang === "ar" ? "مراقبات الجاهزية OBD-II" : "OBD-II Readiness Monitors"}
            </h1>
            {isReal && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                {lang === "ar" ? "⚡ بيانات حقيقية" : "⚡ LIVE DATA"}
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate-500 ml-10.5">
            {lang === "ar"
              ? "Mode 01 PID 01 — حالة مراقبات الانبعاثات مباشرةً من وحدة ECU"
              : "Mode 01 PID 01 — Emission monitor readiness read directly from ECU"}
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={monitorsLoading || !isConnected}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all",
            !isConnected
              ? "bg-white/[0.03] border border-white/[0.08] text-slate-600 cursor-not-allowed"
              : monitorsLoading
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse cursor-wait"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
          )}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", monitorsLoading && "animate-spin")} />
          {monitorsLoading
            ? (lang === "ar" ? "جارٍ القراءة..." : "Reading...")
            : (lang === "ar" ? "قراءة من السيارة" : "Read from Vehicle")}
        </button>
      </div>

      {/* NOT CONNECTED — connection panel */}
      {!isConnected && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 text-center space-y-4">
          <PlugZap className="w-10 h-10 text-blue-400 mx-auto" />
          <div>
            <div className="text-[15px] font-bold text-white mb-1">
              {lang === "ar" ? "وصّل محوّل OBD-II لقراءة البيانات الحقيقية" : "Connect OBD-II Adapter to Read Real Data"}
            </div>
            <p className="text-[12px] text-slate-500">
              {lang === "ar"
                ? "يتصل التطبيق مباشرةً بـ ECU سيارتك ويقرأ جاهزية كل مراقب بدقة 100%"
                : "The app connects directly to your vehicle's ECU and reads each monitor's readiness with 100% accuracy"}
            </p>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              onClick={connectBt}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 text-[12px] font-bold hover:bg-blue-600/30 transition-all"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              {lang === "ar" ? "بلوتوث" : "Bluetooth"}
            </button>
            <button
              onClick={connectUsb}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 text-[12px] font-bold hover:bg-purple-600/30 transition-all"
            >
              <Usb className="w-3.5 h-3.5" />
              {lang === "ar" ? "USB / Serial" : "USB / Serial"}
            </button>
            <button
              onClick={() => setShowWifi(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600/20 border border-green-500/40 text-green-400 text-[12px] font-bold hover:bg-green-600/30 transition-all"
            >
              <Wifi className="w-3.5 h-3.5" />
              {lang === "ar" ? "WiFi" : "WiFi"}
            </button>
          </div>
          {showWifi && (
            <div className="flex justify-center gap-2 flex-wrap items-center">
              <input
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[12px] text-white w-40 font-mono"
                value={wifiHost}
                onChange={e => setWifiHost(e.target.value)}
                placeholder="192.168.0.10"
              />
              <input
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[12px] text-white w-20 font-mono"
                type="number"
                value={wifiPort}
                onChange={e => setWifiPort(Number(e.target.value))}
                placeholder="35000"
              />
              <button
                onClick={() => connectWifi(wifiHost, wifiPort)}
                className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-[12px] font-bold hover:bg-green-500 transition-all"
              >
                {lang === "ar" ? "اتصال" : "Connect"}
              </button>
            </div>
          )}
          <p className="text-[10px] text-slate-600">
            {lang === "ar"
              ? "vLinker MC+/FS يدعم WiFi و Bluetooth — ELM327 USB يدعم Serial"
              : "vLinker MC+/FS supports WiFi & Bluetooth — ELM327 USB supports Serial"}
          </p>
        </div>
      )}

      {/* Summary cards — only when connected */}
      {isConnected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={cn(
            "p-4 rounded-xl border text-center",
            !rawMonitors
              ? "bg-slate-800/50 border-white/[0.06]"
              : inspectionPass
              ? "bg-emerald-500/8 border-emerald-500/25"
              : "bg-red-500/8 border-red-500/25"
          )}>
            <div className={cn(
              "text-2xl font-black mb-1",
              !rawMonitors ? "text-slate-600" : inspectionPass ? "text-emerald-400" : "text-red-400"
            )}>
              {!rawMonitors
                ? "—"
                : inspectionPass
                ? (lang === "ar" ? "ناجح" : "PASS")
                : (lang === "ar" ? "راسب" : "FAIL")}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {lang === "ar" ? "حالة الفحص" : "Inspection Status"}
            </div>
            {rawMonitors?.milOn && (
              <div className="mt-1 text-[9px] text-red-400 font-bold">MIL ON</div>
            )}
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-center">
            <div className="text-2xl font-black text-emerald-400 mb-1">{rawMonitors ? readyCount : "—"}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{lang === "ar" ? "جاهز" : "Ready"}</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/20 text-center">
            <div className="text-2xl font-black text-amber-400 mb-1">{rawMonitors ? notReadyCount : "—"}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{lang === "ar" ? "غير جاهز" : "Not Ready"}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-500/8 border border-slate-500/20 text-center">
            <div className="text-2xl font-black text-slate-500 mb-1">{rawMonitors ? naCount : "—"}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{lang === "ar" ? "غير مدعوم" : "N/A"}</div>
          </div>
        </div>
      )}

      {/* Monitor list + detail panel */}
      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Continuous */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 px-1">
                {lang === "ar" ? "المراقبات المستمرة (تعمل دائماً)" : "CONTINUOUS MONITORS (always running)"}
              </div>
              <div className="space-y-1.5">
                {continuous.map(m => <MonitorRow key={m.id} m={m} />)}
              </div>
            </div>
            {/* Non-continuous */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 px-1">
                {lang === "ar" ? "المراقبات غير المستمرة (تتطلب دورة قيادة)" : "NON-CONTINUOUS MONITORS (require drive cycle)"}
              </div>
              <div className="space-y-1.5">
                {nonContinuous.map(m => <MonitorRow key={m.id} m={m} />)}
              </div>
            </div>

            {/* MIL + DTC count (only when real data) */}
            {rawMonitors && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-[12px]",
                rawMonitors.milOn
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
              )}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-bold">
                  {rawMonitors.milOn
                    ? (lang === "ar" ? `⚠️ مصباح MIL مضيء — ${rawMonitors.confirmedDtcCount} أكواد مؤكدة` : `⚠️ MIL ON — ${rawMonitors.confirmedDtcCount} confirmed DTCs`)
                    : (lang === "ar" ? "✅ مصباح MIL مطفأ — لا أكواد أعطال مؤكدة" : "✅ MIL OFF — No confirmed DTCs")}
                </span>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="space-y-3">
            {selected ? (
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                    <selected.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-white">{lang === "ar" ? selected.nameAr : selected.nameEn}</div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {selected.category === "continuous"
                        ? (lang === "ar" ? "مراقبة مستمرة" : "Continuous Monitor")
                        : (lang === "ar" ? "مراقبة دورة القيادة" : "Drive Cycle Monitor")}
                    </div>
                  </div>
                </div>
                <StatusBadge status={selected.status} lang={lang} />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === "ar" ? selected.descAr : selected.descEn}
                </p>
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">OBD PID</div>
                  <div className="font-mono text-[12px] text-emerald-400">01 01 — Byte {selected.category === "continuous" ? "B" : "C/D"}</div>
                </div>
                {selected.status === "incomplete" && (
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-amber-400">
                        {lang === "ar" ? "كيف تُكمل هذا الاختبار؟" : "How to complete this monitor?"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {lang === "ar" ? selected.driveAr : selected.driveEn}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 min-h-48">
                <ShieldCheck className="w-10 h-10 text-slate-700" />
                <p className="text-[12px] text-slate-600">
                  {lang === "ar" ? "اختر مراقباً لعرض التفاصيل ودورة القيادة" : "Select a monitor to view details and drive cycle"}
                </p>
              </div>
            )}

            {/* Connection status */}
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl border text-[11px]",
              isConnected
                ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                : "bg-slate-800/50 border-white/[0.06] text-slate-500"
            )}>
              <PlugZap className="w-3.5 h-3.5 shrink-0" />
              {isConnected
                ? (lang === "ar" ? "✅ متصل — البيانات حقيقية من ECU" : "✅ Connected — Real ECU data")
                : (lang === "ar" ? "غير متصل بمحوّل OBD" : "No OBD adapter connected")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
