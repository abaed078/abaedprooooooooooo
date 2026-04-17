import { useState, useEffect, useRef } from "react";
import { useObd } from "@/lib/obd/context";
import { PIDS } from "@/lib/obd/pids";
import { useI18n } from "@/lib/i18n";
import {
  Bluetooth, Plug, Radio, AlertCircle, CheckCircle2, Loader2,
  RefreshCw, Trash2, Power, Activity, Cpu, Gauge, Thermometer,
  Zap, Fuel, BarChart3, Info, Download, Usb, Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { exportLiveDataToExcel } from "@/lib/excel-export";
import AutoReportBanner from "@/components/auto-report-banner";
import { useActiveVehicle } from "@/lib/vehicle-context";

const hasWebSerial = typeof navigator !== "undefined" && "serial" in navigator;

const CATEGORY_ICONS: Record<string, any> = {
  engine: Gauge, fuel: Fuel, temperature: Thermometer,
  emissions: Activity, electrical: Zap, exhaust: BarChart3,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  engine:      { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30"   },
  fuel:        { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  temperature: { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30"    },
  emissions:   { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/30"  },
  electrical:  { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  exhaust:     { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
};


function Sparkline({ data, critical }: { data: number[]; critical?: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 120, H = 28;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 3) - 2}`
  ).join(" ");
  const lineColor = critical ? "#ef4444" : "#3b82f6";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${critical}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#grad-${critical})`} />
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function PidCard({ p }: { p: ReturnType<typeof useObd>["livePids"][string] }) {
  const pct = Math.max(0, Math.min(100, ((p.value - p.min) / (p.max - p.min || 1)) * 100));
  const isHigh = pct > 85;
  const isWarn = pct > 70 && !isHigh;
  const colors = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.engine;
  const Icon = CATEGORY_ICONS[p.category] || Gauge;

  return (
    <Card className={`border ${isHigh ? "border-red-500/40 bg-red-500/5" : isWarn ? "border-yellow-500/30 bg-yellow-500/5" : `${colors.border} ${colors.bg}`} shadow-none`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isHigh ? "text-red-400" : colors.text}`}>
              <Icon className="w-3 h-3" />{p.category}
            </div>
            <div className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{p.nameAr}</div>
          </div>
          <div className={`font-mono text-2xl font-bold leading-none ${isHigh ? "text-red-400" : isWarn ? "text-yellow-400" : "text-foreground"}`}>
            {p.value < 1 ? p.value.toFixed(2) : p.value < 100 ? p.value.toFixed(1) : Math.round(p.value)}
            <span className={`text-xs ml-1 font-normal ${isHigh ? "text-red-400/70" : "text-muted-foreground"}`}>{p.unit}</span>
          </div>
        </div>
        <div className="bg-black/20 rounded overflow-hidden">
          <Sparkline data={p.history} critical={isHigh} />
        </div>
        <div className="space-y-0.5">
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${isHigh ? "bg-red-500" : isWarn ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{p.min}</span><span className="opacity-60">{Math.round(pct)}%</span><span>{p.max} {p.unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function LiveScan() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { activeVehicle } = useActiveVehicle();
  const {
    state, adapterInfo, supportedPids, livePids, dtcs, scanning,
    connectBt, connectUsb, connectWifi, scanDtcs, clearAllDtcs, startLive, stopLive,
  } = useObd();

  const [wifiDialog, setWifiDialog] = useState(false);
  const [wifiHost, setWifiHost] = useState("192.168.0.10");
  const [wifiPort, setWifiPort] = useState("35000");

  const [liveActive, setLiveActive] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [tab, setTab] = useState<"live" | "dtc" | "info">("live");

  useEffect(() => () => stopLive(), []);

  const handleStartLive = () => {
    const pids = [...supportedPids].filter(p => PIDS.find(d => d.pid === p)).slice(0, 20);
    startLive(pids);
    setLiveActive(true);
  };
  const handleStop = () => { stopLive(); setLiveActive(false); };
  const handleClear = async () => {
    setClearing(true);
    await clearAllDtcs();
    setClearing(false);
  };

  const liveValues = Object.values(livePids);

  /* ── Disconnected / Error state ─────────────────────── */
  if (state === "disconnected" || state === "error") {
    return (
      <div className="h-full overflow-auto">
        {/* Hero banner */}
        <div className="relative p-8 flex flex-col items-center justify-center gap-6 border-b border-border/50 overflow-hidden">
          {/* Background atmosphere */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20"
              style={{ background: "radial-gradient(ellipse at 50% 0%, #3b82f6, transparent 70%)" }} />
          </div>

          {/* Animated plug icon */}
          <div className="relative">
            {/* Concentric rings */}
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute -inset-3 rounded-full border border-primary/10" />
            <div className="absolute -inset-6 rounded-full border border-primary/5" />
            <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.35)", boxShadow: "0 0 40px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
              <Plug className="w-9 h-9 text-primary" />
            </div>
          </div>

          <div className="relative text-center max-w-lg">
            <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
              {isAr ? "الفحص الحي للمركبة الحقيقية" : "Real Vehicle Live Scanner"}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isAr
                ? "اربط جهاز OBD-II بمركبتك لقراءة البيانات الحية والأعطال وبيانات Freeze Frame مباشرة من وحدة التحكم."
                : "Connect an OBD-II adapter to read live sensor data, real DTCs, and Freeze Frame data directly from the ECU."}
            </p>
          </div>

          {state === "error" && (
            <div className="relative flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm max-w-md text-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {isAr
                ? "فشل الاتصال. تأكد من إدخال القطعة في السيارة وتشغيل المحرك أو وضع الإشعال ON."
                : "Connection failed. Ensure adapter is plugged into OBD port and ignition is ON."}
            </div>
          )}

          {!hasWebSerial && (
            <div className="relative flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs max-w-md text-center">
              <Monitor className="w-4 h-4 shrink-0" />
              {isAr
                ? "اتصال USB يتطلب متصفح Chrome أو Edge — Firefox وSafari غير مدعومان"
                : "USB Connection requires Chrome or Edge browser — Firefox & Safari are not supported"}
            </div>
          )}

          <div className="relative flex gap-3 flex-wrap justify-center">
            <Button onClick={connectBt} size="lg" className="gap-2 px-8 font-bold shadow-lg" style={{ boxShadow: "0 0 20px rgba(59,130,246,0.25)" }}>
              <Bluetooth className="w-4 h-4" />
              {isAr ? "بلوتوث" : "Bluetooth"}
            </Button>
            <Button
              onClick={hasWebSerial ? connectUsb : () => alert(isAr ? "يرجى استخدام متصفح Chrome أو Edge لاتصال USB" : "Please use Chrome or Edge for USB")}
              size="lg" variant="outline"
              className={`gap-2 px-6 font-bold border-white/15 hover:border-white/30 hover:bg-white/5 ${!hasWebSerial ? "opacity-60" : ""}`}
            >
              <Usb className="w-4 h-4" />
              {isAr ? "USB" : "USB"}
              {!hasWebSerial && <span className="text-[9px] text-amber-400 ml-1">Chrome فقط</span>}
            </Button>
            <Button
              onClick={() => setWifiDialog(true)}
              size="lg" variant="outline"
              className="gap-2 px-6 font-bold border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10"
            >
              <Radio className="w-4 h-4" />
              {isAr ? "WiFi" : "WiFi"}
            </Button>
          </div>

          {/* WiFi connection dialog */}
          {wifiDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">{isAr ? "اتصال WiFi — ELM327" : "WiFi Connection — ELM327"}</h2>
                    <p className="text-[10px] text-muted-foreground">{isAr ? "أدخل عنوان IP ومنفذ الجهاز" : "Enter adapter IP address and port"}</p>
                  </div>
                  <button onClick={() => setWifiDialog(false)} className="mr-auto text-muted-foreground hover:text-foreground text-lg">✕</button>
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                      {isAr ? "عنوان IP" : "IP Address"}
                    </label>
                    <input
                      type="text" value={wifiHost} onChange={e => setWifiHost(e.target.value)}
                      placeholder="192.168.0.10"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50 text-left"
                      dir="ltr"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isAr ? "vLinker MC+: 192.168.0.10 | ELM327 WiFi: 192.168.4.1" : "vLinker MC+: 192.168.0.10 | ELM327 WiFi: 192.168.4.1"}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                      {isAr ? "المنفذ" : "Port"}
                    </label>
                    <input
                      type="number" value={wifiPort} onChange={e => setWifiPort(e.target.value)}
                      placeholder="35000"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50 text-left"
                      dir="ltr"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isAr ? "vLinker: 35000 | OBDLink: 35000 | ELM327 clone: 35000 أو 23" : "vLinker: 35000 | OBDLink: 35000 | ELM327 clone: 35000 or 23"}
                    </p>
                  </div>

                  {/* Quick presets */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{isAr ? "إعدادات جاهزة" : "Quick Presets"}</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "vLinker MC+", host: "192.168.0.10", port: "35000" },
                        { label: "ELM327 WiFi", host: "192.168.4.1",  port: "35000" },
                        { label: "OBDLink WiFi", host: "192.168.0.10", port: "35000" },
                      ].map(p => (
                        <button key={p.label}
                          onClick={() => { setWifiHost(p.host); setWifiPort(p.port); }}
                          className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors font-mono"
                        >{p.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setWifiDialog(false)}>
                    {isAr ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button className="flex-1 gap-2 bg-cyan-600 hover:bg-cyan-500" onClick={() => {
                    setWifiDialog(false);
                    connectWifi(wifiHost, parseInt(wifiPort, 10));
                  }}>
                    <Radio className="w-4 h-4" />
                    {isAr ? "اتصال" : "Connect"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Adapter compatibility cards */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
            {[
              {
                icon: Bluetooth, color: "blue",
                title: "Bluetooth ELM327",
                badge: isAr ? "متوافق ✓" : "Supported ✓",
                badgeColor: "green",
                specs: ["BLE / Classic BT", "SPP Profile", "ELM327 v1.5+"],
                note: isAr ? "وصّل الجهاز بالـ OBD-II ثم اضغط بلوتوث" : "Pair device then press Bluetooth",
              },
              {
                icon: Usb, color: "cyan",
                title: "vLinker FS USB",
                badge: isAr ? "متوافق ✓" : "Supported ✓",
                badgeColor: "green",
                specs: ["115200 baud (auto)", "ELM327 v2.x", "Chrome / Edge فقط"],
                note: isAr ? "يتطلب Chrome أو Edge — Firefox غير مدعوم" : "Requires Chrome or Edge browser",
              },
              {
                icon: Radio, color: "cyan",
                title: "ELM327 WiFi",
                badge: isAr ? "متوافق ✓" : "Supported ✓",
                badgeColor: "green",
                specs: ["TCP → WebSocket proxy", "192.168.0.10:35000", "vLinker MC+ / OBDLink"],
                note: isAr ? "وصّل الـ WiFi للشبكة ثم اضغط WiFi" : "Connect to adapter hotspot then press WiFi",
              },
            ].map(card => {
              const Icon = card.icon;
              const colorMap: Record<string, string> = {
                blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
                cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
              };
              const badgeMap: Record<string, string> = {
                green: "bg-green-500/20 border-green-500/30 text-green-400",
              };
              return (
                <div key={card.title} className={`rounded-xl border p-3 ${colorMap[card.color]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-black">{card.title}</span>
                    <span className={`mr-auto text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${badgeMap[card.badgeColor]}`}>{card.badge}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {card.specs.map(s => (
                      <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-slate-400">{s}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{card.note}</p>
                </div>
              );
            })}
          </div>

          {/* Protocol badges */}
          <div className="relative grid grid-cols-3 gap-3 max-w-2xl w-full">
            {[
              { label: "CAN Bus",       desc: isAr ? "معظم السيارات 2008+" : "Most 2008+ vehicles",    color: "#3b82f6", border: "rgba(59,130,246,0.25)", bg: "rgba(59,130,246,0.07)" },
              { label: "ISO 9141-2",    desc: isAr ? "أوروبي 1996-2007"    : "European 1996–2007",      color: "#22c55e", border: "rgba(34,197,94,0.25)",   bg: "rgba(34,197,94,0.07)"  },
              { label: "J1850 PWM/VPW", desc: isAr ? "فورد / GM القديمة"   : "Legacy Ford / GM",        color: "#eab308", border: "rgba(234,179,8,0.25)",   bg: "rgba(234,179,8,0.07)"  },
              { label: "CAN FD",        desc: isAr ? "CAN عالي السرعة 2020+" : "High-speed CAN 2020+",  color: "#a855f7", border: "rgba(168,85,247,0.25)", bg: "rgba(168,85,247,0.07)", badge: "NEW" },
              { label: "DoIP / UDS",    desc: isAr ? "Ethernet تشخيصي OEM"  : "Diagnostic Ethernet OEM", color: "#f97316", border: "rgba(249,115,22,0.25)", bg: "rgba(249,115,22,0.07)", badge: "NEW" },
              { label: "J2534 / RP1210",desc: isAr ? "واجهة OEM الاحترافية" : "Professional OEM Interface", color: "#06b6d4", border: "rgba(6,182,212,0.25)", bg: "rgba(6,182,212,0.07)", badge: "PRO" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3 text-center transition-transform hover:scale-[1.03] relative"
                style={{ background: (item as any).bg, border: `1px solid ${(item as any).border}` }}>
                {(item as any).badge && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: (item as any).color, color: "#000" }}>{(item as any).badge}</span>
                )}
                <div className="font-mono font-black text-xs mb-0.5" style={{ color: (item as any).color }}>{item.label}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor categories preview */}
        <div className="p-6 space-y-4">
          <h2 className="font-bold text-sm text-muted-foreground">
            {isAr ? "أنواع البيانات المتوفرة عند الاتصال" : "Data Available Upon Connection"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: Gauge,       label: isAr ? "سرعة المحرك"     : "Engine RPM",       unit: "RPM",  color: "blue"   },
              { icon: Thermometer, label: isAr ? "حرارة المبرد"    : "Coolant Temp",     unit: "°C",   color: "red"    },
              { icon: Fuel,        label: isAr ? "موضع الخانق"     : "Throttle Pos",     unit: "%",    color: "orange" },
              { icon: Zap,         label: isAr ? "جهد البطارية"    : "Battery Voltage",  unit: "V",    color: "yellow" },
              { icon: Activity,    label: isAr ? "حمل المحرك"      : "Engine Load",      unit: "%",    color: "green"  },
              { icon: BarChart3,   label: isAr ? "تدفق الهواء MAF" : "MAF Air Flow",     unit: "g/s",  color: "purple" },
              { icon: Gauge,       label: isAr ? "سرعة المركبة"    : "Vehicle Speed",    unit: "km/h", color: "blue"   },
              { icon: Thermometer, label: isAr ? "حرارة هواء المحرك": "Intake Air Temp", unit: "°C",   color: "red"    },
              { icon: Activity,    label: isAr ? "ضغط منفستو"      : "MAP Pressure",     unit: "kPa",  color: "green"  },
              { icon: Zap,         label: isAr ? "توقيت الاشتعال"  : "Ignition Timing",  unit: "°",    color: "yellow" },
              { icon: Fuel,        label: isAr ? "مستوى الوقود"    : "Fuel Level",       unit: "%",    color: "orange" },
              { icon: BarChart3,   label: isAr ? "احتراق المحرك"   : "Combustion Load",  unit: "%",    color: "purple" },
            ].map((s, i) => {
              const Icon = s.icon;
              const colorMap: Record<string, string> = {
                blue: "border-blue-500/20 text-blue-400", red: "border-red-500/20 text-red-400",
                orange: "border-orange-500/20 text-orange-400", yellow: "border-yellow-500/20 text-yellow-400",
                green: "border-green-500/20 text-green-400", purple: "border-purple-500/20 text-purple-400",
              };
              return (
                <div key={i} className={`rounded-xl border ${colorMap[s.color]} bg-black/20 p-3 flex flex-col gap-2 opacity-40`}>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${colorMap[s.color].split(" ")[1]}`} />
                    <span className="text-[10px] font-bold text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="font-mono text-xl font-black text-foreground/30">— <span className="text-xs font-normal">{s.unit}</span></div>
                  <div className="h-1 w-full bg-secondary/30 rounded-full" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── Connecting / Initializing state ────────────────── */
  if (state === "connecting" || state === "initializing") {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Bluetooth className="w-12 h-12 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full border-2 border-primary flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">
            {state === "connecting"
              ? (isAr ? "جارٍ الاتصال بالجهاز..." : "Connecting to adapter...")
              : (isAr ? "تهيئة بروتوكول المركبة..." : "Initializing vehicle protocol...")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {state === "connecting"
              ? (isAr ? "اختر الجهاز من قائمة البلوتوث" : "Select the adapter from Bluetooth list")
              : (isAr ? "قراءة PIDs المتوفرة وتحديد البروتوكول..." : "Reading supported PIDs and detecting protocol...")}
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground max-w-xs w-full">
          {["ATZ — إعادة تهيئة الجهاز", "ATE0 — إيقاف الصدى", "ATSP0 — اكتشاف البروتوكول", "01 00 — قراءة PIDs المتوفرة"].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${state === "initializing" ? "bg-primary/20 text-primary animate-pulse" : "bg-secondary text-muted-foreground"}`}>
                {i + 1}
              </div>
              <span className="font-mono text-xs">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Connected state ─────────────────────────────────── */
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80] animate-pulse" />
              <span className="font-bold text-lg">{isAr ? "متصل بالمركبة" : "Vehicle Connected"}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex gap-4 text-sm">
              {[
                { k: isAr ? "الجهاز" : "Adapter",    v: adapterInfo?.version || "ELM327" },
                { k: isAr ? "البروتوكول" : "Protocol", v: adapterInfo?.protocol || "Auto" },
                { k: "VIN", v: adapterInfo?.vin || "—" },
                { k: "PIDs", v: `${supportedPids.size} ${isAr ? "متوفر" : "available"}` },
              ].map(item => (
                <div key={item.k} className="text-center">
                  <div className="text-[10px] text-muted-foreground">{item.k}</div>
                  <div className="font-mono text-xs font-bold">{item.v.length > 18 ? item.v.slice(0, 18) + "…" : item.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {!liveActive ? (
              <Button onClick={handleStartLive} size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                <Radio className="w-3.5 h-3.5" />{isAr ? "بدء البث الحي" : "Start Live Stream"}
              </Button>
            ) : (
              <Button onClick={handleStop} size="sm" variant="destructive" className="gap-1.5">
                <Power className="w-3.5 h-3.5" />{isAr ? "إيقاف" : "Stop"}
              </Button>
            )}
            <Button onClick={scanDtcs} size="sm" variant="outline" disabled={scanning} className="gap-1.5">
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isAr ? "فحص الأعطال" : "Scan DTCs"}
            </Button>
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          {([
            { key: "live", icon: Radio,        label: isAr ? "البيانات الحية" : "Live Data", count: liveValues.length },
            { key: "dtc",  icon: AlertCircle,  label: isAr ? "الأعطال" : "DTCs", count: dtcs.length },
            { key: "info", icon: Info,         label: isAr ? "المعلومات" : "Info" },
          ] as const).map(t2 => (
            <button key={t2.key} onClick={() => setTab(t2.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t2.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              <t2.icon className="w-4 h-4" />{t2.label}
              {"count" in t2 && t2.count !== undefined && t2.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${t2.key === "dtc" ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"}`}>{t2.count}</span>
              )}
              {t2.key === "live" && liveActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === "live" && (
          liveValues.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <Radio className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {`${supportedPids.size} PID ${isAr ? "متوفر — اضغط «بدء البث الحي» لتشغيل قراءة البيانات" : "PIDs available — press \"Start Live Stream\" to begin reading"}`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {liveValues.map(p => <PidCard key={p.pid} p={p} />)}
            </div>
          )
        )}

        {tab === "dtc" && (
          dtcs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <p className="text-muted-foreground font-medium">
                {scanning
                  ? (isAr ? "جارٍ الفحص..." : "Scanning...")
                  : (isAr ? "لا أعطال — اضغط «فحص الأعطال» للقراءة من السيارة" : "No faults — press Scan DTCs to read from vehicle")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-red-400">{dtcs.length} {isAr ? "كود عطل نشط" : "Active Fault Code(s)"}</h3>
                <Button variant="destructive" size="sm" onClick={handleClear} disabled={clearing} className="gap-1.5">
                  {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {isAr ? "مسح جميع الأعطال" : "Clear All DTCs"}
                </Button>
              </div>
              <div className="grid gap-4">
                {dtcs.map(dtc => (
                  <Card key={dtc.code} className="border-l-4 border-l-red-500 border-red-500/20 bg-red-500/5 shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="font-mono text-xl font-bold text-red-400">{dtc.code}</span>
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-bold uppercase">{isAr ? "نشط" : "ACTIVE"}</span>
                      </div>
                      {Object.keys(dtc.freezeFrame).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Freeze Frame — {isAr ? "لحظة ظهور العطل" : "Snapshot at fault time"}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {Object.entries(dtc.freezeFrame).map(([name, data]) => (
                              <div key={name} className="bg-background/70 rounded-lg p-3 text-center border border-border/30">
                                <div className="text-[10px] text-muted-foreground leading-tight mb-1">{name}</div>
                                <div className="font-mono font-bold text-sm">{data.value}</div>
                                <div className="text-[10px] text-primary/70 font-mono">{data.unit}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {tab === "info" && (
          <div className="max-w-2xl space-y-6">
            <Card className="shadow-none">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  {isAr ? "معلومات الجهاز والمركبة" : "Adapter & Vehicle Info"}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { k: isAr ? "إصدار الجهاز" : "Adapter Version",  v: adapterInfo?.version || "—" },
                    { k: isAr ? "بروتوكول الاتصال" : "OBD Protocol",  v: adapterInfo?.protocol || "—" },
                    { k: "VIN",                                         v: adapterInfo?.vin || (isAr ? "غير مقروء" : "Unreadable") },
                    { k: isAr ? "PIDs المدعومة" : "Supported PIDs",   v: `${supportedPids.size} PID` },
                    { k: isAr ? "PIDs حية الآن" : "Live PIDs",        v: `${liveValues.length}` },
                    { k: isAr ? "أكواد الأعطال" : "Active DTCs",      v: `${dtcs.length}` },
                  ].map(item => (
                    <div key={item.k} className="bg-secondary/40 rounded-lg px-4 py-3">
                      <div className="text-xs text-muted-foreground">{item.k}</div>
                      <div className="font-mono text-sm font-bold mt-0.5 break-all">{item.v}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
