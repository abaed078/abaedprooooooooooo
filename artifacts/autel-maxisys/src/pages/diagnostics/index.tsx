import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  useListDiagnosticSessions, useStartDiagnosticSession,
  useListVehicles, getListDiagnosticSessionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Activity, Play, AlertTriangle, CheckCircle2, Clock, ChevronRight,
  Gauge, Settings2, ShieldAlert, ShieldCheck, Cpu, Radio, Fuel,
  Thermometer, Zap, Battery, Wifi, BarChart2, LayoutGrid, Search,
  Filter, SortDesc, Car
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";

/* ─── ECU system definitions (same as dashboard) ─────────────────────── */
const SYSTEMS = [
  { id: "ecm",   name: "ECM",             nameAr: "محرك ECM",       icon: Gauge,      cat: "Powertrain" },
  { id: "tcm",   name: "TCM",             nameAr: "ناقل TCM",       icon: Settings2,  cat: "Powertrain" },
  { id: "abs",   name: "ABS",             nameAr: "ABS",            icon: Activity,   cat: "Safety"     },
  { id: "srs",   name: "SRS",             nameAr: "وسائد SRS",      icon: ShieldAlert,cat: "Safety"     },
  { id: "bcm",   name: "BCM",             nameAr: "هيكل BCM",       icon: Cpu,        cat: "Body"       },
  { id: "tpms",  name: "TPMS",            nameAr: "إطارات TPMS",    icon: Gauge,      cat: "Safety"     },
  { id: "eps",   name: "EPS",             nameAr: "توجيه EPS",      icon: Settings2,  cat: "Chassis"    },
  { id: "hvac",  name: "HVAC",            nameAr: "تكييف HVAC",     icon: Thermometer,cat: "Body"       },
  { id: "immo",  name: "Immobilizer",     nameAr: "مانع سرقة",      icon: ShieldCheck,cat: "Security"   },
  { id: "ic",    name: "Cluster",         nameAr: "عدادات",         icon: LayoutGrid, cat: "Body"       },
  { id: "fuel",  name: "Fuel System",     nameAr: "وقود",           icon: Fuel,       cat: "Powertrain" },
  { id: "ign",   name: "Ignition",        nameAr: "إشعال",          icon: Zap,        cat: "Powertrain" },
  { id: "dpf",   name: "DPF",             nameAr: "جسيمات DPF",     icon: Activity,   cat: "Emissions"  },
  { id: "vvt",   name: "VVT",             nameAr: "صمامات VVT",     icon: Settings2,  cat: "Engine"     },
  { id: "turbo", name: "Turbo",           nameAr: "تيربو",          icon: Gauge,      cat: "Engine"     },
  { id: "bms",   name: "BMS",             nameAr: "بطارية BMS",     icon: Battery,    cat: "Electrical" },
  { id: "4wd",   name: "4WD",             nameAr: "دفع 4WD",        icon: Settings2,  cat: "Drivetrain" },
  { id: "susp",  name: "Suspension",      nameAr: "تعليق",          icon: Activity,   cat: "Chassis"    },
  { id: "ldw",   name: "LDW",             nameAr: "حارة LDW",       icon: ShieldCheck,cat: "ADAS"       },
  { id: "acc2",  name: "ACC Cruise",      nameAr: "مثبت ACC",       icon: Gauge,      cat: "ADAS"       },
  { id: "pdc",   name: "PDC",             nameAr: "حساسات PDC",     icon: Radio,      cat: "ADAS"       },
  { id: "cam",   name: "Camera",          nameAr: "كاميرات",        icon: Cpu,        cat: "ADAS"       },
  { id: "gw",    name: "Gateway",         nameAr: "بوابة GW",       icon: Wifi,       cat: "Network"    },
  { id: "door",  name: "Door Ctrl",       nameAr: "أبواب",          icon: Settings2,  cat: "Body"       },
  { id: "alt",   name: "Alternator",      nameAr: "مولّد",          icon: Zap,        cat: "Electrical" },
  { id: "tel",   name: "Telematics",      nameAr: "اتصالات",        icon: Wifi,       cat: "Network"    },
  { id: "seat",  name: "Seat Module",     nameAr: "مقعد",           icon: Settings2,  cat: "Body"       },
  { id: "light", name: "Lighting",        nameAr: "إضاءة",          icon: Zap,        cat: "Body"       },
  { id: "diff",  name: "Differential",    nameAr: "فارق",           icon: Settings2,  cat: "Drivetrain" },
  { id: "ecu2",  name: "Secondary ECU",   nameAr: "ECU ثانوي",      icon: Cpu,        cat: "Powertrain" },
];

type SysState = "idle" | "scanning" | "ok" | "warn" | "fault" | "offline";
const STATUS_CFG: Record<SysState, { dot: string; text: string; bg: string; border: string; label: string; labelAr: string }> = {
  idle:     { dot: "bg-gray-600",   text: "text-gray-500",   bg: "bg-secondary/20",  border: "border-border/30",    label: "Idle",     labelAr: "انتظار"    },
  scanning: { dot: "bg-blue-400",   text: "text-blue-400",   bg: "bg-blue-500/5",    border: "border-blue-500/20",  label: "Scanning", labelAr: "فحص..."    },
  ok:       { dot: "bg-green-400",  text: "text-green-400",  bg: "bg-green-500/5",   border: "border-green-500/20", label: "OK",       labelAr: "سليم"      },
  warn:     { dot: "bg-yellow-400", text: "text-yellow-400", bg: "bg-yellow-500/5",  border: "border-yellow-500/20",label: "Warning",  labelAr: "تحذير"     },
  fault:    { dot: "bg-red-500",    text: "text-red-400",    bg: "bg-red-500/5",     border: "border-red-500/25",   label: "Fault",    labelAr: "عطل"       },
  offline:  { dot: "bg-gray-600",   text: "text-gray-500",   bg: "bg-secondary/20",  border: "border-border/30",    label: "N/A",      labelAr: "غير متوفر" },
};

function ScanSystemGrid({ scanning, seed }: { scanning: boolean; seed: number }) {
  const { lang } = useI18n();
  const [states, setStates] = useState<Record<string, SysState>>(
    Object.fromEntries(SYSTEMS.map(s => [s.id, "idle"]))
  );
  const scanRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!scanning) {
      // show final results
      const finals: Record<string, SysState> = {};
      SYSTEMS.forEach(s => {
        const h = s.id.split("").reduce((a, c) => a + c.charCodeAt(0), seed);
        const v = h % 10;
        finals[s.id] = v < 6 ? "ok" : v < 8 ? "warn" : v < 9 ? "fault" : "offline";
      });
      setStates(finals);
      return;
    }
    setStates(Object.fromEntries(SYSTEMS.map(s => [s.id, "idle"])));
    let i = 0;
    const run = () => {
      if (i >= SYSTEMS.length) return;
      const id = SYSTEMS[i].id;
      setStates(prev => ({ ...prev, [id]: "scanning" }));
      scanRef.current = setTimeout(() => {
        const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), seed);
        const v = h % 10;
        const result: SysState = v < 6 ? "ok" : v < 8 ? "warn" : v < 9 ? "fault" : "offline";
        setStates(prev => ({ ...prev, [id]: result }));
        i++;
        scanRef.current = setTimeout(run, 80);
      }, 180);
    };
    run();
    return () => { if (scanRef.current) clearTimeout(scanRef.current); };
  }, [scanning, seed]);

  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
      {SYSTEMS.map(sys => {
        const st = states[sys.id];
        const cfg = STATUS_CFG[st];
        const Icon = sys.icon;
        return (
          <div key={sys.id} className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border ${cfg.border} ${cfg.bg} transition-all duration-300`}>
            <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${cfg.dot} ${st === "scanning" ? "animate-pulse" : st === "fault" ? "animate-pulse" : ""}`} />
            <Icon className={`w-4 h-4 ${cfg.text} mt-0.5 transition-colors`} />
            <span className="text-[9px] font-medium text-center leading-tight text-muted-foreground">
              {lang === "ar" ? sys.nameAr : sys.name}
            </span>
            <span className={`text-[8px] font-bold ${cfg.text}`}>
              {lang === "ar" ? cfg.labelAr : cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Session card ─────────────────────────────────────────────────────── */
function SessionCard({ session, lang }: { session: any; lang: string }) {
  const hasErrors = session.dtcCount > 0;
  const pct = session.systemsScanned / Math.max(1, session.totalSystems);
  return (
    <Link href={`/diagnostics/${session.id}`}>
      <div
        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background/50 hover:bg-secondary/30 hover:border-primary/30 transition-all cursor-pointer group"
        data-testid={`session-row-${session.id}`}
      >
        {/* Status dot */}
        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
          session.status === "running" ? "bg-blue-500/10 border border-blue-500/20" :
          hasErrors ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"
        }`}>
          {session.status === "running"
            ? <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
            : hasErrors
              ? <AlertTriangle className="w-5 h-5 text-red-400" />
              : <CheckCircle2 className="w-5 h-5 text-green-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {session.vehicleName || `Vehicle #${session.vehicleId}`}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
              session.status === "running"   ? "bg-blue-500/20 text-blue-400" :
              session.status === "completed" ? "bg-green-500/15 text-green-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              {session.status === "running" ? (lang === "ar" ? "جارٍ" : "Running") :
               session.status === "completed" ? (lang === "ar" ? "مكتمل" : "Done") : (lang === "ar" ? "فشل" : "Failed")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <Clock className="w-3 h-3 shrink-0" />
            {new Date(session.startedAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
            <span className="w-1 h-1 bg-border rounded-full" />
            <span className="font-mono">{session.systemsScanned}/{session.totalSystems} {lang === "ar" ? "نظام" : "sys"}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${session.status === "running" ? "bg-blue-400 animate-pulse" : "bg-primary"}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasErrors ? (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{lang === "ar" ? "أعطال" : "Faults"}</div>
              <div className="text-lg font-black text-red-400">{session.dtcCount}</div>
            </div>
          ) : session.status === "completed" ? (
            <div className="text-right">
              <div className="text-xs text-green-400 font-bold">{lang === "ar" ? "سليم" : "PASS"}</div>
            </div>
          ) : null}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────── */
export default function DiagnosticsHub() {
  const [vehicleId, setVehicleId] = useState<string>("");
  const [scanType, setScanType] = useState<"full_scan" | "quick_scan" | "system_scan">("full_scan");
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSeed, setScanSeed] = useState(42);
  const [searchQ, setSearchQ] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, lang } = useI18n();

  const { data: sessions, isLoading } = useListDiagnosticSessions();
  const { data: vehicles } = useListVehicles();
  const startSession = useStartDiagnosticSession();

  const filtered = sessions?.filter(s =>
    !searchQ || (s.vehicleName || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  const totalDtcs    = sessions?.reduce((a, s) => a + (s.dtcCount || 0), 0) || 0;
  const criticalCnt  = sessions?.filter(s => s.status === "completed" && (s.dtcCount ?? 0) > 0).length || 0;
  const passedCnt    = sessions?.filter(s => s.status === "completed" && !(s.dtcCount ?? 0)).length || 0;

  const handleStartScan = () => {
    if (!vehicleId) { toast({ title: t("diagChooseVehicle"), variant: "destructive" }); return; }
    startSession.mutate({ data: { vehicleId: parseInt(vehicleId), scanType } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListDiagnosticSessionsQueryKey() });
        setIsStartOpen(false);
        setLocation(`/diagnostics/${data.id}`);
        toast({ title: t("diagScanStarted") });
      }
    });
  };

  const runPreviewScan = () => {
    setIsScanning(true);
    setScanSeed(Math.floor(Math.random() * 1000));
    setTimeout(() => setIsScanning(false), SYSTEMS.length * 260 + 500);
  };

  return (
    <div className="p-6 space-y-5 relative z-10 min-h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <h1 className="text-2xl font-black tracking-tight">{t("diagTitle")}</h1>
          </div>
          <p className="text-xs text-muted-foreground ml-3.5">{t("diagSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={runPreviewScan}
            disabled={isScanning}
            className="gap-1.5"
          >
            <Activity className={`w-4 h-4 ${isScanning ? "animate-pulse text-blue-400" : ""}`} />
            {lang === "ar" ? "معاينة الفحص" : "Preview Scan"}
          </Button>
          <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-start-scan-dialog">
                <Play className="w-3.5 h-3.5" fill="currentColor" />
                {t("diagStartScan")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  {t("diagConfigTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t("diagSelectVehicle")}</label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger data-testid="select-vehicle" className="h-11">
                      <SelectValue placeholder={t("diagChooseVehicle")} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map(v => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            {v.year} {v.make} {v.model}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t("diagScanType")}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["full_scan", "quick_scan", "system_scan"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setScanType(type)}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          scanType === type ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        {type === "full_scan" ? (lang === "ar" ? "شامل" : "Full") :
                         type === "quick_scan" ? (lang === "ar" ? "سريع" : "Quick") :
                         (lang === "ar" ? "نظام" : "System")}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {scanType === "full_scan" ? (lang === "ar" ? "فحص كامل لجميع الأنظمة — 30 نظام ECU" : "Full scan of all systems — 30 ECU modules") :
                     scanType === "quick_scan" ? (lang === "ar" ? "الأنظمة الأساسية فقط — أسرع" : "Core systems only — faster") :
                     (lang === "ar" ? "نظام واحد محدد" : "Single specified system")}
                  </p>
                </div>
                <Button
                  onClick={handleStartScan}
                  disabled={!vehicleId || startSession.isPending}
                  className="w-full h-11 gap-2"
                  data-testid="button-execute-scan"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  {startSession.isPending ? t("diagStarting") : t("diagBeginDiagnosis")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* System Matrix Preview */}
      <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              {lang === "ar" ? "مصفوفة أنظمة ECU — 30 وحدة تحكم" : "ECU System Matrix — 30 Control Modules"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isScanning
                ? (lang === "ar" ? "جارٍ الفحص..." : "Scanning in progress...")
                : (lang === "ar" ? "اضغط «محاكاة فحص» لرؤية تسلسل الفحص الحقيقي" : "Press «Preview Scan» to see real scan sequence")}
            </p>
          </div>
          {isScanning && (
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold animate-pulse">
              <Activity className="w-4 h-4" />
              {lang === "ar" ? "فحص جارٍ..." : "Scanning..."}
            </div>
          )}
        </div>
        <ScanSystemGrid scanning={isScanning} seed={scanSeed} />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: lang === "ar" ? "الجلسات" : "Sessions", value: sessions?.length || 0, icon: Activity, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
          { label: lang === "ar" ? "إجمالي أعطال" : "Total DTCs", value: totalDtcs, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: lang === "ar" ? "مركبات سليمة" : "Clean Vehicles", value: passedCnt, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
          { label: lang === "ar" ? "بحاجة فحص" : "Need Attention", value: criticalCnt, icon: ShieldAlert, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
        ].map(stat => (
          <div key={stat.label} className={`flex items-center gap-3 rounded-xl border ${stat.border} ${stat.bg} px-4 py-3`}>
            <stat.icon className={`w-5 h-5 ${stat.color} shrink-0`} />
            <div>
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions List */}
      <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {t("diagRecentSessions")}
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={lang === "ar" ? "بحث..." : "Search..."}
                className="h-8 pl-8 pr-3 text-xs bg-secondary border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary w-36 transition-all"
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-secondary/40 animate-pulse rounded-xl" />)}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground gap-3">
            <Activity className="w-10 h-10 opacity-20" />
            <p className="text-sm">{searchQ ? (lang === "ar" ? "لا نتائج" : "No results") : t("diagNoSessions")}</p>
            {!searchQ && (
              <Button size="sm" onClick={() => setIsStartOpen(true)} className="gap-1.5">
                <Play className="w-3.5 h-3.5" fill="currentColor" />
                {lang === "ar" ? "ابدأ أول جلسة" : "Start First Session"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered?.map(session => <SessionCard key={session.id} session={session} lang={lang} />)}
          </div>
        )}
      </div>
    </div>
  );
}
