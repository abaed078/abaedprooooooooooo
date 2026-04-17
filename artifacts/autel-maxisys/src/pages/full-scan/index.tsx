import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Radar, CheckCircle2, AlertTriangle, XCircle, Loader2, Play,
  RotateCcw, Zap, Shield, Car, Cpu, Network,
  Settings2, Thermometer, Radio, Eye, Volume2, Wind, Fuel,
  BatteryCharging, Wifi, Camera, Lock, Activity, FileText, PlugZap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OEM_DTC_DATABASE } from "@/data/oem-dtc-database";
import { useObd } from "@/lib/obd/context";
import { DTC_DATABASE } from "@/data/dtc-database";

/* ─────────────────────────────────────────────
   ECU System definitions
───────────────────────────────────────────── */
type SysStatus = "ok" | "fault" | "no_comm" | "scanning" | "pending";

interface EcuSystem {
  id: string;
  nameEn: string;
  nameAr: string;
  abbr: string;
  protocol: string;
  icon: any;
  dtcs: number;
  fwVersion: string;
  status: SysStatus;
  scanMs: number;
}

const ECU_SYSTEMS: EcuSystem[] = [
  { id: "ecm",  nameEn: "Engine Control Module",           nameAr: "وحدة التحكم في المحرك",        abbr: "ECM",  protocol: "ISO 15765-4 CAN",  icon: Cpu,          dtcs: 2, fwVersion: "2.4.7.1",  status: "fault",   scanMs: 900  },
  { id: "tcm",  nameEn: "Transmission Control Module",     nameAr: "وحدة ناقل الحركة",             abbr: "TCM",  protocol: "ISO 15765-4 CAN",  icon: Settings2,    dtcs: 0, fwVersion: "1.9.2.0",  status: "ok",      scanMs: 750  },
  { id: "abs",  nameEn: "ABS / ESP Control Unit",          nameAr: "وحدة ABS / ESP",               abbr: "ABS",  protocol: "ISO 15765-4 CAN",  icon: Shield,       dtcs: 0, fwVersion: "3.1.0.4",  status: "ok",      scanMs: 820  },
  { id: "srs",  nameEn: "Airbag SRS Module",               nameAr: "وحدة الوسائد الهوائية SRS",   abbr: "SRS",  protocol: "ISO 15765-4 CAN",  icon: Shield,       dtcs: 1, fwVersion: "5.0.1.2",  status: "fault",   scanMs: 680  },
  { id: "bcm",  nameEn: "Body Control Module",             nameAr: "وحدة التحكم في الجسم",        abbr: "BCM",  protocol: "LIN / K-Line",     icon: Car,          dtcs: 0, fwVersion: "2.2.3.8",  status: "ok",      scanMs: 610  },
  { id: "ic",   nameEn: "Instrument Cluster",              nameAr: "لوحة العدادات",                abbr: "IC",   protocol: "CAN B",            icon: Activity,     dtcs: 0, fwVersion: "4.0.0.1",  status: "ok",      scanMs: 540  },
  { id: "eps",  nameEn: "Electric Power Steering",         nameAr: "نظام التوجيه الكهربائي",      abbr: "EPS",  protocol: "ISO 15765-4 CAN",  icon: Radio,        dtcs: 0, fwVersion: "1.5.4.0",  status: "ok",      scanMs: 770  },
  { id: "hvac", nameEn: "HVAC Climate Control",            nameAr: "نظام التكييف والتدفئة",       abbr: "HVAC", protocol: "LIN Bus",          icon: Thermometer,  dtcs: 0, fwVersion: "3.3.1.0",  status: "ok",      scanMs: 590  },
  { id: "pdc",  nameEn: "Parking Distance Control",        nameAr: "حساسات الإيقاف",              abbr: "PDC",  protocol: "LIN Bus",          icon: Eye,          dtcs: 1, fwVersion: "2.0.7.3",  status: "fault",   scanMs: 650  },
  { id: "cam",  nameEn: "360° Camera System",              nameAr: "نظام الكاميرات 360°",         abbr: "CAM",  protocol: "MOST / Ethernet",  icon: Camera,       dtcs: 0, fwVersion: "1.2.0.9",  status: "ok",      scanMs: 710  },
  { id: "bms",  nameEn: "Battery Management System",       nameAr: "وحدة إدارة البطارية",         abbr: "BMS",  protocol: "ISO 15765-4 CAN",  icon: BatteryCharging, dtcs: 0, fwVersion: "6.1.2.0", status: "ok",    scanMs: 830  },
  { id: "ems",  nameEn: "Emission Control System",         nameAr: "نظام التحكم في الانبعاثات",   abbr: "EMS",  protocol: "ISO 15765-4 CAN",  icon: Wind,         dtcs: 0, fwVersion: "2.8.0.4",  status: "ok",      scanMs: 700  },
  { id: "fuel", nameEn: "Fuel Injection System",           nameAr: "نظام حقن الوقود",             abbr: "FUEL", protocol: "CAN-FD",           icon: Fuel,         dtcs: 0, fwVersion: "3.0.5.1",  status: "ok",      scanMs: 760  },
  { id: "tecu", nameEn: "Telematics & Connectivity",       nameAr: "الاتصالات والتتبع",           abbr: "TCU",  protocol: "Ethernet / 4G",    icon: Wifi,         dtcs: 0, fwVersion: "4.5.0.2",  status: "ok",      scanMs: 580  },
  { id: "asc",  nameEn: "Active Suspension Control",       nameAr: "نظام التعليق الإلكتروني",     abbr: "ASC",  protocol: "CAN",              icon: Activity,     dtcs: 0, fwVersion: "1.1.8.0",  status: "no_comm", scanMs: 620  },
  { id: "immo", nameEn: "Immobilizer / Smart Key",         nameAr: "نظام الإيموبيلايزر",         abbr: "IMMO", protocol: "LF / UHF",         icon: Lock,         dtcs: 0, fwVersion: "7.2.1.0",  status: "ok",      scanMs: 530  },
  { id: "aud",  nameEn: "Audio / Infotainment",            nameAr: "نظام الصوت والشاشة",          abbr: "AUD",  protocol: "MOST Bus",         icon: Volume2,      dtcs: 0, fwVersion: "9.0.4.3",  status: "ok",      scanMs: 560  },
  { id: "net",  nameEn: "Gateway / Network Module",        nameAr: "بوابة الشبكة",                abbr: "GW",   protocol: "CAN Gateway",      icon: Network,      dtcs: 0, fwVersion: "2.7.3.1",  status: "ok",      scanMs: 490  },
];

const STATUS_CONFIG = {
  ok:       { color: "#22c55e", bg: "#22c55e12", border: "#22c55e25", icon: CheckCircle2, labelAr: "سليم",         labelEn: "OK" },
  fault:    { color: "#ef4444", bg: "#ef444412", border: "#ef444425", icon: AlertTriangle, labelAr: "عطل",         labelEn: "FAULT" },
  no_comm:  { color: "#f97316", bg: "#f9731612", border: "#f9731625", icon: XCircle,       labelAr: "لا اتصال",   labelEn: "NO COMM" },
  scanning: { color: "#3b82f6", bg: "#3b82f612", border: "#3b82f625", icon: Loader2,       labelAr: "جارٍ الفحص", labelEn: "SCANNING" },
  pending:  { color: "#475569", bg: "#47556912", border: "#47556925", icon: Loader2,       labelAr: "انتظار",     labelEn: "PENDING" },
};

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
type ScanPhase = "idle" | "scanning" | "complete";

export default function FullScan() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { isConnected, dtcs, scanDtcs, scanning: obdScanning, adapterInfo } = useObd();

  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [systems, setSystems] = useState<EcuSystem[]>(ECU_SYSTEMS.map(s => ({ ...s, status: "pending" as SysStatus })));
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [selectedSystem, setSelectedSystem] = useState<EcuSystem | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const totalDtcs = systems.filter(s => s.status === "fault").reduce((acc, s) => acc + s.dtcs, 0);
  const okCount = systems.filter(s => s.status === "ok").length;
  const faultCount = systems.filter(s => s.status === "fault").length;
  const noCommCount = systems.filter(s => s.status === "no_comm").length;

  const startScan = useCallback(() => {
    setSystems(ECU_SYSTEMS.map(s => ({ ...s, status: "pending" as SysStatus })));
    setCurrentIdx(-1);
    setElapsedMs(0);
    setSelectedSystem(null);
    setPhase("scanning");
    startTimeRef.current = Date.now();

    // If OBD connected, read real Mode 03 DTCs in parallel
    if (isConnected) {
      scanDtcs().catch(() => {});
    }

    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);

    let delay = 200;
    ECU_SYSTEMS.forEach((sys, idx) => {
      setTimeout(() => {
        setCurrentIdx(idx);
        setSystems(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: "scanning" };
          return next;
        });
        setTimeout(() => {
          setSystems(prev => {
            const next = [...prev];
            // When OBD connected, ECM status based on real DTCs
            if (isConnected && sys.id === "ecm") {
              next[idx] = { ...next[idx], status: "scanning" };
            } else {
              next[idx] = { ...next[idx], status: sys.status === "pending" ? "ok" : sys.status };
            }
            return next;
          });
          if (idx === ECU_SYSTEMS.length - 1) {
            setTimeout(() => {
              setPhase("complete");
              clearInterval(timerRef.current!);
            }, 400);
          }
        }, sys.scanMs);
      }, delay);
      delay += sys.scanMs + 120;
    });
  }, [isConnected, scanDtcs]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // When real OBD DTCs arrive, update the ECM status accordingly
  useEffect(() => {
    if (!isConnected || phase !== "complete") return;
    setSystems(prev => prev.map(sys => {
      if (sys.id !== "ecm") return sys;
      const hasFault = dtcs.length > 0;
      return { ...sys, status: hasFault ? "fault" : "ok", dtcs: dtcs.length };
    }));
  }, [dtcs, isConnected, phase]);

  const progress = phase === "complete" ? 100 : Math.round(((currentIdx + 1) / ECU_SYSTEMS.length) * 100);
  const realDtcCodes = dtcs.map(d => {
    const known = [...DTC_DATABASE, ...OEM_DTC_DATABASE].find(k => k.code === d.code);
    return { ...d, description: known?.description || "—", known };
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#080b12]">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-blue-400" />
          <Radar className="w-5 h-5 text-blue-400" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white leading-none">
                {isAr ? "فحص شامل — جميع أنظمة السيارة" : "Full System Scan — All ECUs"}
              </h1>
              {isConnected ? (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <PlugZap className="w-2.5 h-2.5" />
                  {isAr ? "ECM حقيقي" : "LIVE ECM"}
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700/50 border border-white/10 text-slate-500">
                  {isAr ? "محاكاة" : "DEMO"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isConnected
                ? (isAr ? "ECM: بيانات حقيقية Mode 03 — باقي الوحدات: محاكاة" : "ECM: Real Mode 03 data — Other ECUs: simulated")
                : (isAr ? `${ECU_SYSTEMS.length} وحدة تحكم إلكترونية — وصّل OBD لبيانات حقيقية` : `${ECU_SYSTEMS.length} ECUs — Connect OBD for real data`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {phase !== "idle" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] text-slate-600">{isAr ? "الوقت:" : "Time:"}</span>
              <span className="font-mono text-xs font-bold text-slate-300">{(elapsedMs / 1000).toFixed(1)}s</span>
            </div>
          )}
          {phase === "scanning" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400">
                {isAr ? `جارٍ الفحص — ${currentIdx + 1} / ${ECU_SYSTEMS.length}` : `Scanning — ${currentIdx + 1} / ${ECU_SYSTEMS.length}`}
              </span>
            </div>
          )}
          {phase === "complete" && (
            <button onClick={startScan} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] text-xs transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
              {isAr ? "إعادة الفحص" : "Re-scan"}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {phase !== "idle" && (
        <div className="shrink-0 h-0.5 bg-white/[0.04]">
          <div
            className="h-full bg-blue-400 transition-all duration-300"
            style={{ width: `${progress}%`, boxShadow: "0 0 8px #3b82f6" }}
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">

        {/* Left: system grid */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Idle state */}
          {phase === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border border-blue-500/30 flex items-center justify-center">
                    <Radar className="w-10 h-10 text-blue-400/60" />
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border border-blue-400/10 animate-ping" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-black text-white mb-1">
                  {isAr ? "فحص شامل لجميع وحدات التحكم" : "Full ECU System Scan"}
                </h2>
                <p className="text-sm text-slate-500">
                  {isAr ? `يفحص ${ECU_SYSTEMS.length} نظاماً إلكترونياً كاملاً في السيارة` : `Scans all ${ECU_SYSTEMS.length} electronic systems in the vehicle`}
                </p>
              </div>
              <button
                onClick={startScan}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm transition-all shadow-lg shadow-blue-500/30"
              >
                <Play className="w-4 h-4" />
                {isAr ? "ابدأ الفحص الشامل" : "Start Full System Scan"}
              </button>
              <div className="grid grid-cols-3 gap-4 text-center mt-2">
                {[
                  { v: ECU_SYSTEMS.length, l: isAr ? "نظام للفحص" : "Systems" },
                  { v: "CAN+LIN+MOST", l: isAr ? "بروتوكولات" : "Protocols" },
                  { v: isAr ? "~45 ثانية" : "~45 sec", l: isAr ? "وقت الفحص" : "Scan Time" },
                ].map(s => (
                  <div key={s.l} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-sm font-black text-blue-400">{s.v}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scanning / Complete: system cards grid */}
          {phase !== "idle" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2.5">
                {systems.map((sys, i) => {
                  const cfg = STATUS_CONFIG[sys.status];
                  const Icon = sys.icon;
                  const StatusIcon = cfg.icon;
                  const isScanning = sys.status === "scanning";
                  const isPending = sys.status === "pending";

                  return (
                    <button
                      key={sys.id}
                      onClick={() => sys.status !== "pending" && sys.status !== "scanning" && setSelectedSystem(sys)}
                      disabled={isPending || isScanning}
                      className={cn(
                        "text-left p-3 rounded-xl border transition-all duration-300",
                        isPending ? "opacity-30" : "opacity-100",
                        isScanning ? "opacity-100" : "",
                        !isPending && !isScanning && selectedSystem?.id === sys.id
                          ? "ring-1 ring-blue-500/40"
                          : "",
                        "cursor-pointer hover:bg-white/[0.04] disabled:cursor-not-allowed"
                      )}
                      style={{
                        backgroundColor: isPending ? "rgba(255,255,255,0.01)" : cfg.bg,
                        borderColor: isPending ? "rgba(255,255,255,0.04)" : cfg.border,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: isPending ? "#475569" : cfg.color }} />
                          <span className="text-[9px] font-black font-mono" style={{ color: isPending ? "#475569" : cfg.color }}>
                            {sys.abbr}
                          </span>
                        </div>
                        <StatusIcon
                          className={cn("w-3.5 h-3.5 shrink-0", isScanning && "animate-spin")}
                          style={{ color: isPending ? "#1e293b" : cfg.color }}
                        />
                      </div>
                      <div className="text-[10px] font-medium text-white leading-tight mb-1">
                        {isAr ? sys.nameAr : sys.nameEn}
                      </div>
                      <div className="text-[9px] text-slate-600 font-mono">{sys.protocol}</div>
                      {!isPending && !isScanning && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] font-bold" style={{ color: cfg.color }}>
                            {isAr ? cfg.labelAr : cfg.labelEn}
                          </span>
                          {sys.dtcs > 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400">
                              {sys.dtcs} DTC
                            </span>
                          )}
                        </div>
                      )}
                      {isScanning && (
                        <div className="mt-2 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <div className="h-full bg-blue-400 animate-pulse rounded-full w-2/3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Complete summary */}
              {phase === "complete" && (
                <div className="mt-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-black text-white">
                      {isAr ? "ملخص نتائج الفحص الشامل" : "Full Scan Summary Report"}
                    </h3>
                    <span className="text-[9px] text-slate-600 ml-auto font-mono">
                      {(elapsedMs / 1000).toFixed(1)}s total
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { v: ECU_SYSTEMS.length, l: isAr ? "إجمالي الأنظمة" : "Total Systems", c: "#94a3b8" },
                      { v: okCount, l: isAr ? "سليمة" : "OK", c: "#22c55e" },
                      { v: faultCount, l: isAr ? "بها عطل" : "Faults", c: "#ef4444" },
                      { v: noCommCount, l: isAr ? "لا اتصال" : "No Comm", c: "#f97316" },
                    ].map(s => (
                      <div key={s.l} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                        <div className="text-xl font-black" style={{ color: s.c }}>{s.v}</div>
                        <div className="text-[9px] text-slate-600 mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {faultCount > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[10px] font-bold text-red-400">
                          {isAr ? `تم العثور على ${totalDtcs} كود عطل في ${faultCount} أنظمة` : `Found ${totalDtcs} DTCs across ${faultCount} systems`}
                        </span>
                      </div>
                      <p className="text-[9px] text-red-400/60 leading-relaxed">
                        {isAr ? "يُوصى بمراجعة كل نظام لقراءة الأكواد التفصيلية وإصلاحها" : "Recommend reviewing each system for detailed codes and repair procedures"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-[280px] shrink-0 border-l border-white/[0.05] flex flex-col overflow-y-auto bg-[#070a10]">
          {selectedSystem ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setSelectedSystem(null)} className="text-slate-600 hover:text-slate-400 text-xs">←</button>
                <h3 className="text-sm font-black text-white">{isAr ? selectedSystem.nameAr : selectedSystem.nameEn}</h3>
              </div>

              {/* Status */}
              {(() => {
                const cfg = STATUS_CONFIG[selectedSystem.status];
                const StatusIcon = cfg.icon;
                return (
                  <div className="p-3 rounded-xl border mb-3"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4" style={{ color: cfg.color }} />
                      <span className="text-sm font-black" style={{ color: cfg.color }}>
                        {isAr ? cfg.labelAr : cfg.labelEn}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Details */}
              <div className="space-y-2">
                {[
                  { k: isAr ? "الاختصار" : "Abbr", v: selectedSystem.abbr },
                  { k: isAr ? "البروتوكول" : "Protocol", v: selectedSystem.protocol },
                  { k: isAr ? "إصدار البرنامج" : "FW Version", v: selectedSystem.fwVersion },
                  { k: isAr ? "أكواد العطل" : "DTCs Found", v: selectedSystem.dtcs === 0 ? (isAr ? "لا أعطال" : "No DTCs") : `${selectedSystem.dtcs} ${isAr ? "كود" : "code(s)"}` },
                ].map(d => (
                  <div key={d.k} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-[10px] text-slate-600">{d.k}</span>
                    <span className="text-[10px] font-mono text-slate-300">{d.v}</span>
                  </div>
                ))}
              </div>

              {/* Real OBD DTCs for ECM when connected */}
              {selectedSystem.id === "ecm" && isConnected && realDtcCodes.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20">
                  <div className="text-[9px] font-bold text-emerald-400 mb-2 flex items-center gap-1">
                    <PlugZap className="w-3 h-3" />
                    {isAr ? `أكواد حقيقية من ECU — Mode 03 (${realDtcCodes.length})` : `Real ECU codes — Mode 03 (${realDtcCodes.length})`}
                  </div>
                  {realDtcCodes.map(d => (
                    <div key={d.code} className="py-2 border-b border-emerald-500/10 last:border-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-black text-emerald-400">{d.code}</span>
                        <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">LIVE</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-tight line-clamp-2">{d.description}</p>
                      {Object.keys(d.freezeFrame).length > 0 && (
                        <div className="mt-1 grid grid-cols-2 gap-1">
                          {Object.entries(d.freezeFrame).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="text-[8px] text-slate-600 font-mono">{k}: <span className="text-slate-400">{v.value} {v.unit}</span></div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedSystem.id === "ecm" && isConnected && realDtcCodes.length === 0 && phase === "complete" && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20">
                  <div className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                    <PlugZap className="w-3 h-3" />
                    {isAr ? "✅ لا أكواد عطل في المحرك — بيانات حقيقية من ECU" : "✅ No DTCs in ECM — Real ECU data confirmed"}
                  </div>
                </div>
              )}

              {selectedSystem.dtcs > 0 && selectedSystem.id !== "ecm" && (() => {
                const moduleKey = selectedSystem.abbr.toUpperCase();
                const matchingAliases: Record<string, string[]> = {
                  ECM:  ["ECM","DME","CDI/ECM","PCM"],
                  TCM:  ["TCM","EGS","ETC"],
                  ABS:  ["ABS","DSC","EBCM","ESP"],
                  SRS:  ["SRS","SDM"],
                  BCM:  ["BCM","SAM","Gateway"],
                  IMMO: ["IMMO"],
                };
                const aliases = matchingAliases[moduleKey] ?? [moduleKey];
                const moduleCodes = OEM_DTC_DATABASE.filter(d =>
                  d.module && aliases.includes(d.module)
                );
                /* stable shuffle using system id as seed */
                const seed = selectedSystem.id.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
                const shuffled = [...moduleCodes].sort((a,b)=>
                  ((a.code.charCodeAt(0)*seed) % 97) - ((b.code.charCodeAt(0)*seed) % 97)
                );
                const shown = shuffled.slice(0, selectedSystem.dtcs);

                /* fallback generic codes if OEM list is too small */
                const fallbackCodes: Record<string,(i:number)=>{code:string;desc:string}> = {
                  ecm:  (i) => i===0 ? {code:"P0234",desc:"Turbo Over-Boost"} : {code:"P0101",desc:"MAF Range/Performance"},
                  srs:  (_) => ({code:"B0100",desc:"Driver Airbag Squib Open"}),
                  pdc:  (_) => ({code:"U0155",desc:"Lost Comm w/ Cluster"}),
                };
                return (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20">
                    <div className="text-[9px] font-bold text-red-400 mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {isAr ? "أكواد العطل المكتشفة" : "Detected Fault Codes"}
                    </div>
                    {Array.from({ length: selectedSystem.dtcs }, (_, i) => {
                      const oem = shown[i];
                      const fb = fallbackCodes[selectedSystem.id];
                      const code = oem?.code ?? (fb?.(i)?.code ?? `${selectedSystem.abbr[0]}${2000+i}`);
                      const desc = oem?.description ?? (fb?.(i)?.desc ?? "System Fault Detected");
                      const mfr  = oem?.manufacturer;
                      const sev  = oem?.severity ?? "warning";
                      const sevColor = sev === "critical" ? "#ef4444" : sev === "warning" ? "#eab308" : "#3b82f6";
                      return (
                        <div key={i} className="py-2 border-b border-red-500/10 last:border-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono font-black" style={{color:sevColor}}>{code}</span>
                            {mfr && (
                              <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 font-medium">
                                {mfr}
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500 leading-tight line-clamp-2">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-4">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
                {isAr ? "ملخص الأنظمة" : "Systems Overview"}
              </div>
              {phase === "idle" ? (
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  {isAr ? "اضغط 'ابدأ الفحص' لفحص جميع وحدات التحكم الإلكترونية في السيارة." : "Press 'Start Scan' to scan all vehicle ECUs and control modules."}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 mb-4">
                    {[
                      { l: isAr ? "سليمة" : "OK", v: okCount, c: "#22c55e" },
                      { l: isAr ? "عطل" : "Fault", v: faultCount, c: "#ef4444" },
                      { l: isAr ? "لا اتصال" : "No Comm", v: noCommCount, c: "#f97316" },
                      { l: isAr ? "باقية" : "Pending", v: systems.filter(s => s.status === "pending").length, c: "#475569" },
                    ].map(s => (
                      <div key={s.l} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c }} />
                          <span className="text-[10px] text-slate-500">{s.l}</span>
                        </div>
                        <span className="text-[10px] font-black" style={{ color: s.c }}>{s.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress circle */}
                  <div className="flex justify-center my-4">
                    <div className="relative w-24 h-24">
                      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <circle cx="48" cy="48" r="40" fill="none" stroke="#3b82f6"
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - progress / 100)}
                          style={{ transition: "stroke-dashoffset 0.3s ease", filter: "drop-shadow(0 0 4px #3b82f6)" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-blue-400">{progress}%</span>
                        <span className="text-[8px] text-slate-600">{isAr ? "مكتمل" : "done"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-600 text-center">
                    {isAr ? "انقر على أي نظام لعرض التفاصيل" : "Click any system for details"}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
