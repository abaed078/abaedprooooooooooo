import { useState, useEffect, useRef } from "react";
import { useListProgrammingSessions, useStartProgrammingSession, useListVehicles, getListProgrammingSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Cpu, Play, AlertTriangle, ChevronRight, Check, Loader2,
  Zap, Key, Shield, Settings2, Activity, Car, Server,
  CheckCircle2, XCircle, Binary, MemoryStick, Lock
} from "lucide-react";

const MODULES = [
  { code: "ECM",  label: "ECM",  desc: "Engine Control Module",         icon: <Cpu className="w-4 h-4" />,      addr: "0x7E0" },
  { code: "TCM",  label: "TCM",  desc: "Transmission Control Module",   icon: <Settings2 className="w-4 h-4" />, addr: "0x7E1" },
  { code: "BCM",  label: "BCM",  desc: "Body Control Module",           icon: <Car className="w-4 h-4" />,       addr: "0x726" },
  { code: "ABS",  label: "ABS",  desc: "Anti-lock Braking System",      icon: <Shield className="w-4 h-4" />,    addr: "0x760" },
  { code: "IPC",  label: "IPC",  desc: "Instrument Cluster",            icon: <Activity className="w-4 h-4" />,  addr: "0x720" },
  { code: "TPMS", label: "TPMS", desc: "Tire Pressure Monitoring",      icon: <Zap className="w-4 h-4" />,       addr: "0x744" },
  { code: "GW",   label: "GW",   desc: "CAN Gateway Module",            icon: <Server className="w-4 h-4" />,    addr: "0x714" },
  { code: "IMMO", label: "IMMO", desc: "Immobilizer / Transponder",     icon: <Key className="w-4 h-4" />,       addr: "0x733" },
];

const PROG_TYPES = [
  { value: "ecu_programming", label: "فلاش ECU", desc: "كتابة برنامج جديد على الوحدة" },
  { value: "ecu_coding",      label: "ترميز ECU", desc: "تعديل قيم الترميز والمتغيرات" },
  { value: "key_programming", label: "برمجة مفاتيح", desc: "إضافة مفتاح أو جهاز تحكم عن بعد" },
  { value: "immobilizer",     label: "تعطيل الإيموبلايزر", desc: "ضبط نظام منع التشغيل" },
  { value: "adaptation",      label: "مطابقة الوحدة", desc: "تهيئة وحدة بعد الاستبدال" },
];

type ProgType = "ecu_programming" | "ecu_coding" | "key_programming" | "immobilizer" | "adaptation";

function FlashLog({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);
  return (
    <div ref={ref} className="bg-black/80 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs border border-border space-y-0.5">
      <div className="text-muted-foreground/50 mb-1">$ autel_flash --module ECM --protocol UDS</div>
      {lines.map((l, i) => (
        <div key={i} className={l.startsWith("ERR") ? "text-red-400" : l.startsWith("OK") || l.includes("✓") ? "text-green-400" : l.startsWith("WARN") ? "text-yellow-400" : "text-foreground/70"}>
          <span className="text-muted-foreground/30 mr-1.5 select-none">{String(i).padStart(3, "0")}</span>{l}
        </div>
      ))}
    </div>
  );
}

function ProgrammingWizard({
  open, onClose, vehicles
}: { open: boolean; onClose: () => void; vehicles: any[] }) {
  const [step, setStep] = useState(1);
  const [vehicleId, setVehicleId] = useState("");
  const [progType, setProgType] = useState<ProgType>("ecu_coding");
  const [ecuModule, setEcuModule] = useState("ECM");
  const [progress, setProgress] = useState(0);
  const [blocksDone, setBlocksDone] = useState(0);
  const [totalBlocks] = useState(1024);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startSession = useStartProgrammingSession();

  const moduleInfo = MODULES.find(m => m.code === ecuModule);
  const typeInfo = PROG_TYPES.find(t => t.value === progType);

  useEffect(() => {
    if (!open) { setStep(1); setVehicleId(""); setProgress(0); setBlocksDone(0); setLog([]); setDone(false); setFailed(false); }
  }, [open]);

  const startFlashing = async () => {
    if (!vehicleId) { toast({ title: "اختر المركبة", variant: "destructive" }); return; }
    setStep(3);
    let cancelled = false;
    let blocks = 0;
    let p = 0;

    const addLog = (msg: string) => setLog(l => [...l, msg]);

    addLog(`>>> اتصال بـ ${moduleInfo?.addr} عبر CAN ISO 14229...`);
    await delay(500);
    addLog("OK DiagnosticSessionControl → ExtendedDiagnosticSession");
    await delay(300);
    addLog(">>> SecurityAccess سيد 0x27 0x01...");
    await delay(400);
    addLog(`OK Seed: 0x${Math.random().toString(16).slice(2, 10).toUpperCase()}`);
    await delay(300);
    addLog(`OK Key:  0x${Math.random().toString(16).slice(2, 10).toUpperCase()} — وصول مُمنح ✓`);
    await delay(400);

    if (progType === "ecu_programming") {
      addLog(">>> RequestDownload — حجم: 4194304 byte");
      await delay(300);
      addLog("OK maxBlockSize: 4096 byte");
      await delay(200);
      addLog(">>> TransferData — بدء نقل البيانات...");

      const interval = setInterval(async () => {
        if (cancelled) { clearInterval(interval); return; }
        blocks = Math.min(totalBlocks, blocks + Math.floor(Math.random() * 18) + 8);
        p = Math.round((blocks / totalBlocks) * 100);
        setBlocksDone(blocks);
        setProgress(p);
        setLog(l => {
          const last = l[l.length - 1];
          if (last?.startsWith("  Block")) return [...l.slice(0, -1), `  Block [${blocks}/${totalBlocks}] — ${(blocks * 4).toLocaleString()} bytes written`];
          return [...l, `  Block [${blocks}/${totalBlocks}] — ${(blocks * 4).toLocaleString()} bytes written`];
        });
        if (blocks >= totalBlocks) {
          clearInterval(interval);
          await delay(300);
          setLog(l => [...l, "OK RequestTransferExit — نقل مكتمل ✓"]);
          await delay(300);
          setLog(l => [...l, ">>> CheckProgrammingDependencies..."]);
          await delay(400);
          setLog(l => [...l, "OK CRC32: 0x4A2F9C1B — تحقق ✓"]);
          await delay(300);
          setLog(l => [...l, ">>> EcuReset — إعادة تشغيل الوحدة..."]);
          await delay(500);
          setLog(l => [...l, "OK اكتملت عملية البرمجة بنجاح ✓"]);
          setProgress(100);
          setDone(true);
          setStep(4);
          startSession.mutate({ data: { vehicleId: parseInt(vehicleId), type: progType, ecuModule } }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProgrammingSessionsQueryKey() })
          });
        }
      }, 150);
      cancelled = false;
    } else {
      const steps_log = [
        ">>> RequestDownload — ترميز الوحدة...",
        ">>> WriteDataByIdentifier 0xF186...",
        "OK بيانات الترميز محددة",
        ">>> WriteDataByIdentifier 0xF18C...",
        "OK رقم الجزء: " + Math.floor(Math.random() * 900000 + 100000),
        ">>> ControlDTCSetting — إيقاف تتبع الأعطال...",
        "OK DTC مُوقف مؤقتاً",
        ">>> EcuReset...",
        "OK اكتمل الترميز ✓",
      ];
      for (const msg of steps_log) {
        if (cancelled) break;
        await delay(500 + Math.random() * 400);
        addLog(msg);
        p = Math.min(100, p + Math.round(100 / steps_log.length));
        setProgress(p);
      }
      setProgress(100);
      setDone(true);
      setStep(4);
      startSession.mutate({ data: { vehicleId: parseInt(vehicleId), type: progType, ecuModule } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProgrammingSessionsQueryKey() })
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && (done || step === 1)) onClose(); }}>
      <DialogContent className="max-w-2xl bg-[#07101e] border-border p-0 overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-red-500/10 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">برمجة / ترميز ECU</h2>
              <p className="text-xs text-muted-foreground">بروتوكول ISO 14229 UDS | CAN Bus</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {[1, 2, 3, 4].map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                    step > s ? "bg-green-500 border-green-500 text-white" :
                    step === s ? "bg-red-500 border-red-500 text-white" :
                    "border-border text-muted-foreground"
                  }`}>
                    {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  {i < 3 && <div className={`w-4 h-px ${step > s ? "bg-green-500" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">تحذير: تأكد من توصيل شاحن البطارية. لا تفصل كابل VCI أثناء البرمجة.</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">المركبة</label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger className="bg-card border-border" data-testid="select-vehicle-prog">
                    <SelectValue placeholder="اختر المركبة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.year} {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">نوع العملية</label>
                <div className="grid grid-cols-1 gap-2">
                  {PROG_TYPES.map(pt => (
                    <button
                      key={pt.value}
                      onClick={() => setProgType(pt.value as ProgType)}
                      className={`text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                        progType === pt.value ? "border-red-500/50 bg-red-500/10" : "border-border bg-card hover:border-red-500/30"
                      }`}
                      data-testid="select-type-prog"
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${progType === pt.value ? "bg-red-500/20 text-red-400" : "bg-card text-muted-foreground"}`}>
                        {pt.value === "ecu_programming" ? <Binary className="w-4 h-4" /> :
                         pt.value === "ecu_coding" ? <MemoryStick className="w-4 h-4" /> :
                         pt.value === "key_programming" ? <Key className="w-4 h-4" /> :
                         pt.value === "immobilizer" ? <Lock className="w-4 h-4" /> :
                         <Settings2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{pt.label}</div>
                        <div className="text-xs text-muted-foreground">{pt.desc}</div>
                      </div>
                      {progType === pt.value && <Check className="w-4 h-4 text-red-400 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={() => setStep(2)} disabled={!vehicleId} className="w-full">
                التالي — اختيار الوحدة <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">اختيار الوحدة الإلكترونية</h3>
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map(mod => (
                  <button
                    key={mod.code}
                    onClick={() => setEcuModule(mod.code)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      ecuModule === mod.code ? "border-red-500/50 bg-red-500/10" : "border-border bg-card hover:border-red-500/30"
                    }`}
                    data-testid="select-module-prog"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`${ecuModule === mod.code ? "text-red-400" : "text-muted-foreground"}`}>{mod.icon}</div>
                      <span className="font-bold text-sm">{mod.label}</span>
                      {ecuModule === mod.code && <Check className="w-3.5 h-3.5 text-red-400 ml-auto" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{mod.desc}</div>
                    <div className="text-[10px] font-mono text-muted-foreground/50 mt-1">{mod.addr}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">رجوع</Button>
                <Button
                  onClick={startFlashing}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  data-testid="button-execute-prog"
                >
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  بدء {typeInfo?.label}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{typeInfo?.label} — {moduleInfo?.label} ({moduleInfo?.addr})</h3>
                <div className="flex items-center gap-1.5 text-xs text-red-400 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  جارٍ...
                </div>
              </div>

              {progType === "ecu_programming" && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "الكتل", value: `${blocksDone}/${totalBlocks}`, sub: "4 KB / كتلة" },
                    { label: "البيانات", value: `${(blocksDone * 4).toLocaleString()}`, sub: "bytes مكتوبة" },
                    { label: "التقدم", value: `${progress}%`, sub: "اكتمال الفلاش" },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 rounded-lg bg-card border border-border text-center">
                      <div className="text-lg font-bold font-mono text-foreground">{stat.value}</div>
                      <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                      <div className="text-[9px] text-muted-foreground/50">{stat.sub}</div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-red-400 animate-pulse">
                    {progType === "ecu_programming" ? `فلاش — كتلة ${blocksDone}/${totalBlocks}` : typeInfo?.label}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <FlashLog lines={log} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${done && !failed ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10"}`}>
                {done && !failed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                )}
                <div>
                  <p className={`font-bold text-lg ${done && !failed ? "text-green-400" : "text-red-400"}`}>
                    {done && !failed ? "العملية اكتملت بنجاح ✓" : "فشلت العملية ✗"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {typeInfo?.label} — {moduleInfo?.label} ({moduleInfo?.addr})
                  </p>
                </div>
              </div>
              <FlashLog lines={log} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setStep(1); setLog([]); setProgress(0); setBlocksDone(0); setDone(false); }}>
                  عملية جديدة
                </Button>
                <Button className="flex-1" onClick={onClose}>إغلاق</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function Programming() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: sessions, isLoading: loadingSessions } = useListProgrammingSessions();
  const { data: vehicles } = useListVehicles();

  const stats = {
    total: sessions?.length ?? 0,
    completed: sessions?.filter(s => s.status === "completed").length ?? 0,
    failed: sessions?.filter(s => s.status === "failed").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <ProgrammingWizard open={wizardOpen} onClose={() => setWizardOpen(false)} vehicles={vehicles ?? []} />

      <div className="px-6 py-5 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold">برمجة وترميز ECU</h1>
            </div>
            <p className="text-muted-foreground text-sm">فلاش، ترميز، مفاتيح، إيموبلايزر، مطابقة الوحدات — بروتوكول UDS/CAN</p>
          </div>
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setWizardOpen(true)}
            data-testid="button-start-programming"
          >
            <Play className="w-5 h-5 mr-2" fill="currentColor" />
            بدء جلسة جديدة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
        {[
          { label: "إجمالي الجلسات", value: stats.total, color: "text-blue-400" },
          { label: "مكتملة", value: stats.completed, color: "text-green-400" },
          { label: "فاشلة", value: stats.failed, color: "text-red-400" },
          { label: "الوحدات المدعومة", value: MODULES.length, color: "text-primary" },
        ].map((stat, i) => (
          <div key={i} className="bg-card/50 px-5 py-3">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {MODULES.map(mod => (
            <div key={mod.code} className="p-3 rounded-xl border border-border bg-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">{mod.icon}</div>
                <span className="text-[10px] font-mono text-muted-foreground/50">{mod.addr}</span>
              </div>
              <div>
                <div className="font-bold text-sm">{mod.label}</div>
                <div className="text-[11px] text-muted-foreground">{mod.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <span className="font-semibold">سجل جلسات البرمجة</span>
          </div>
          <div className="p-4">
            {loadingSessions ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse bg-secondary rounded-lg" />)}
              </div>
            ) : (sessions?.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>لا توجد جلسات برمجة مسجلة بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions?.map(session => {
                  const modInfo = MODULES.find(m => m.code === session.ecuModule);
                  const typeInfo = PROG_TYPES.find(t => t.value === session.type);
                  return (
                    <div key={session.id} className="p-4 rounded-lg border border-border bg-background" data-testid={`prog-row-${session.id}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{typeInfo?.label ?? session.type.replace("_", " ").toUpperCase()}</span>
                            <span className="text-muted-foreground text-sm">—</span>
                            <span className="font-mono text-sm text-primary">{session.ecuModule}</span>
                            {modInfo && <span className="text-[10px] font-mono text-muted-foreground/50">{modInfo.addr}</span>}
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              session.status === "completed" ? "bg-green-500/20 text-green-400" :
                              session.status === "failed" ? "bg-red-500/20 text-red-400" :
                              session.status === "cancelled" ? "bg-gray-500/20 text-gray-400" :
                              "bg-blue-500/20 text-blue-400 animate-pulse"
                            }`}>
                              {session.status === "completed" ? "مكتمل" : session.status === "failed" ? "فشل" : session.status === "cancelled" ? "ملغى" : "جارٍ"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {session.vehicleName} · {new Date(session.startedAt).toLocaleString("ar")}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className={session.status === "completed" ? "text-green-400" : "text-muted-foreground"}>
                            {session.status === "completed" ? "✓ اكتمل بنجاح" : session.status === "failed" ? "✗ فشل" : "⟳ جارٍ"}
                          </span>
                          <span>{session.progressPercent ?? 100}%</span>
                        </div>
                        <Progress value={session.progressPercent ?? 100} className="h-1.5 bg-secondary" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
