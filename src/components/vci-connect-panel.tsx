import { useState } from "react";
import { useObd } from "@/lib/obd/context";
import { PIDS } from "@/lib/obd/pids";
import { Button } from "@/components/ui/button";
import {
  Bluetooth, Usb, Wifi, X, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Trash2, Radio, Power
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  engine: "text-blue-400", fuel: "text-orange-400", temperature: "text-red-400",
  emissions: "text-green-400", electrical: "text-yellow-400", exhaust: "text-purple-400",
};

interface Props { onClose: () => void }

export default function VciConnectPanel({ onClose }: Props) {
  const {
    state, error, adapterInfo, supportedPids, livePids, dtcs, scanning,
    connectBt, connectUsb, disconnect, scanDtcs, clearAllDtcs, startLive, stopLive,
  } = useObd();

  const [activePidSel, setActivePidSel] = useState<Set<string>>(new Set());
  const [liveActive, setLiveActive] = useState(false);
  const [clearing, setClearing] = useState(false);

  const togglePid = (pid: string) => {
    setActivePidSel(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  const handleStartLive = () => {
    const pids = activePidSel.size > 0
      ? [...activePidSel]
      : [...supportedPids].filter(p => PIDS.find(d => d.pid === p)).slice(0, 12);
    startLive(pids);
    setLiveActive(true);
  };

  const handleStopLive = () => { stopLive(); setLiveActive(false); };

  const handleClear = async () => {
    setClearing(true);
    await clearAllDtcs();
    setClearing(false);
  };

  const statusColor = {
    disconnected: "text-gray-400", connecting: "text-blue-400 animate-pulse",
    initializing: "text-yellow-400 animate-pulse", connected: "text-green-400",
    error: "text-red-500",
  }[state];

  const statusLabel = {
    disconnected: "غير متصل", connecting: "جارٍ الاتصال...",
    initializing: "تهيئة الجهاز...", connected: "متصل", error: "خطأ",
  }[state];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${state === "connected" ? "bg-green-400 shadow-[0_0_8px_#4ade80]" : state === "error" ? "bg-red-500" : "bg-gray-500"} transition-all`} />
            <h2 className="text-lg font-bold tracking-tight">ربط مركبة حقيقية — OBD-II</h2>
            <span className={`text-sm ${statusColor}`}>{statusLabel}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">

          {/* Connection buttons */}
          {state === "disconnected" || state === "error" ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm text-center">اختر نوع الاتصال بجهاز OBD-II</p>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={connectBt}
                  className="flex flex-col items-center gap-3 p-6 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:border-blue-400 transition-all">
                    <Bluetooth className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">بلوتوث</div>
                    <div className="text-xs text-muted-foreground mt-1">ELM327 / OBDLink / vLinker BT</div>
                  </div>
                </button>

                <button
                  onClick={connectUsb}
                  className="flex flex-col items-center gap-3 p-6 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center group-hover:border-green-400 transition-all">
                    <Usb className="w-7 h-7 text-green-400" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">USB / Serial</div>
                    <div className="text-xs text-muted-foreground mt-1">كابل OBD-II / محول USB</div>
                  </div>
                </button>

                <div className="flex flex-col items-center gap-3 p-6 bg-secondary/20 border border-dashed border-border/50 rounded-xl opacity-60 cursor-not-allowed">
                  <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                    <Wifi className="w-7 h-7 text-yellow-400" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">WiFi</div>
                    <div className="text-xs text-muted-foreground mt-1">قريباً — ELM327 WiFi</div>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">متطلبات الاتصال:</p>
                <p>• جهاز OBD-II متوافق مع بروتوكول ELM327</p>
                <p>• متصفح Chrome / Edge / Opera (يدعم WebBluetooth/WebSerial)</p>
                <p>• تشغيل محرك السيارة أو وضع الإضاءة (ACC/ON)</p>
              </div>
            </div>
          ) : state === "connecting" || state === "initializing" ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-lg">{statusLabel}</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {state === "connecting" ? "يرجى اختيار الجهاز من نافذة البلوتوث..." : "قراءة إعدادات الجهاز وبروتوكول المركبة..."}
                </p>
              </div>
            </div>
          ) : (
            /* CONNECTED STATE */
            <div className="space-y-6">

              {/* Adapter info bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "الجهاز", value: adapterInfo?.version || "ELM327" },
                  { label: "البروتوكول", value: adapterInfo?.protocol || "Auto" },
                  { label: "VIN", value: adapterInfo?.vin || "—" },
                  { label: "PIDs متوفرة", value: `${supportedPids.size}` },
                ].map(item => (
                  <div key={item.label} className="bg-secondary/50 rounded-lg px-4 py-3">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="font-mono text-sm font-bold truncate" title={item.value}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* DTC Scanner */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    أكواد الأعطال الحقيقية ({dtcs.length})
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={scanDtcs} disabled={scanning} className="gap-1.5">
                      {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      فحص
                    </Button>
                    {dtcs.length > 0 && (
                      <Button size="sm" variant="destructive" onClick={handleClear} disabled={clearing} className="gap-1.5">
                        {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        مسح
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  {dtcs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <p>{scanning ? "جارٍ الفحص..." : "لا أعطال — اضغط «فحص» لقراءة الأكواد"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dtcs.map(dtc => (
                        <div key={dtc.code} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-mono font-bold text-red-400 text-lg">{dtc.code}</span>
                            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-bold">ACTIVE</span>
                          </div>
                          {Object.keys(dtc.freezeFrame).length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Freeze Frame</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(dtc.freezeFrame).map(([name, data]) => (
                                  <div key={name} className="bg-background/60 rounded px-3 py-2">
                                    <div className="text-[10px] text-muted-foreground">{name}</div>
                                    <div className="font-mono text-sm font-bold">{data.value} <span className="text-xs text-primary/70">{data.unit}</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Live PID selector */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
                  <div className="flex items-center gap-2 font-semibold">
                    <Radio className="w-4 h-4 text-green-400" />
                    البث الحي من السيارة
                    {liveActive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                  </div>
                  <div className="flex gap-2">
                    {!liveActive ? (
                      <Button size="sm" onClick={handleStartLive} className="gap-1.5 bg-green-600 hover:bg-green-700">
                        <Radio className="w-3.5 h-3.5" />
                        بدء البث
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={handleStopLive} className="gap-1.5">
                        <Power className="w-3.5 h-3.5" />
                        إيقاف
                      </Button>
                    )}
                  </div>
                </div>

                {/* Live values */}
                {liveActive && Object.keys(livePids).length > 0 && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.values(livePids).map(p => {
                      const pct = ((p.value - p.min) / (p.max - p.min || 1)) * 100;
                      const isHigh = pct > 85;
                      return (
                        <div key={p.pid} className={`bg-secondary/40 rounded-xl p-3 border ${isHigh ? "border-red-500/30" : "border-border/50"}`}>
                          <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${CATEGORY_COLORS[p.category] || "text-muted-foreground"}`}>{p.category}</div>
                          <div className="text-xs text-muted-foreground mb-1 leading-tight">{p.nameAr}</div>
                          <div className={`font-mono text-xl font-bold ${isHigh ? "text-red-400" : "text-foreground"}`}>
                            {p.value.toFixed(p.value < 10 ? 2 : 1)}
                            <span className="text-xs text-muted-foreground ml-1">{p.unit}</span>
                          </div>
                          {/* mini progress */}
                          <div className="h-1 w-full bg-secondary rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${isHigh ? "bg-red-500" : "bg-primary"}`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                          {/* sparkline */}
                          {p.history.length > 2 && <MiniSparkline data={p.history} critical={isHigh} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PID selector */}
                <div className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    PIDs المتوفرة في مركبتك ({supportedPids.size}) — اختر ما تريد تتبعه:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...supportedPids]
                      .filter(p => PIDS.find(d => d.pid === p))
                      .map(pid => {
                        const def = PIDS.find(d => d.pid === pid)!;
                        const sel = activePidSel.has(pid);
                        return (
                          <button
                            key={pid}
                            onClick={() => togglePid(pid)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              sel ? "bg-primary/20 border-primary text-primary" : "border-border/50 text-muted-foreground hover:border-border"
                            }`}
                          >
                            {def.nameAr}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Disconnect */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={disconnect} className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10">
                  <Power className="w-4 h-4" />
                  قطع الاتصال
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ data, critical }: { data: number[]; critical: boolean }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 100, H = 24;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 3) - 2}`
  ).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-6 mt-1" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={critical ? "#ef4444" : "#3b82f6"} strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}
