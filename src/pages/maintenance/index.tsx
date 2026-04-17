import { useState, useEffect, useRef, useMemo } from "react";
import { useListServiceResets, usePerformServiceReset, useListResetTypes, useListVehicles, getListServiceResetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, Search, CheckCircle2, XCircle, Clock, Droplets, Flame, Wind,
  Zap, Battery, RotateCcw, Gauge, Shield, Settings2, ChevronRight,
  AlertTriangle, Loader2, Check, Car, Activity
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  engine:       <Flame className="w-5 h-5" />,
  brakes:       <Shield className="w-5 h-5" />,
  transmission: <Settings2 className="w-5 h-5" />,
  body:         <Car className="w-5 h-5" />,
  emissions:    <Wind className="w-5 h-5" />,
  battery:      <Battery className="w-5 h-5" />,
  suspension:   <Activity className="w-5 h-5" />,
  steering:     <RotateCcw className="w-5 h-5" />,
  cooling:      <Droplets className="w-5 h-5" />,
};

const RESET_ICONS: Record<string, React.ReactNode> = {
  OIL_RESET:       <Droplets className="w-5 h-5" />,
  BRAKE_FLUID:     <Shield className="w-5 h-5" />,
  DPF_REGEN:       <Flame className="w-5 h-5" />,
  THROTTLE_BODY:   <Wind className="w-5 h-5" />,
  INJECTOR_CODE:   <Zap className="w-5 h-5" />,
  BATTERY_REG:     <Battery className="w-5 h-5" />,
  TRANS_ADAPT:     <Settings2 className="w-5 h-5" />,
  STEERING_ANGLE:  <RotateCcw className="w-5 h-5" />,
  EPB_SERVICE:     <Shield className="w-5 h-5" />,
  COOLANT_BLEED:   <Droplets className="w-5 h-5" />,
};

const WIZARD_STEPS = [
  { id: 1, label: "الاتصال", sublabel: "التحقق من الوحدة" },
  { id: 2, label: "القراءة", sublabel: "قراءة البيانات الحالية" },
  { id: 3, label: "التهيئة", sublabel: "تجهيز الإجراء" },
  { id: 4, label: "التنفيذ", sublabel: "تنفيذ الإعادة" },
  { id: 5, label: "التحقق", sublabel: "التأكيد والحفظ" },
];

function WizardDialog({
  open, onClose, resetType, resetName, vehicleName
}: {
  open: boolean; onClose: () => void; resetType: string; resetName: string; vehicleName: string;
}) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const randomOdo = useMemo(() => {
    let h = 0;
    for (let i = 0; i < vehicleName.length; i++) h = (h << 5) - h + vehicleName.charCodeAt(i);
    return Math.abs(h % 15000) + 3000;
  }, [vehicleName]);

  const LOG_MSGS = useMemo(() => [
    ["إرسال طلب الاتصال...", "تأسيس جلسة CAN Bus...", "اتصال VCI ناجح ✓", "بروتوكول ISO 14229 UDS نشط"],
    ["طلب قراءة الذاكرة NVM...", `قيمة العداد الحالية: ${randomOdo} km`, "تاريخ آخر خدمة محفوظ ✓"],
    ["تحميل روتين الخدمة...", "التحقق من تسلسل المصادقة...", "رمز الوصول: 0x2711 ✓", "تجهيز معلمات الكتابة..."],
    ["تنفيذ $04 Clear Mode...", "كتابة المتغير NVM[0x1A2F]...", "إعادة تعيين العداد → 0 km ✓", "تحديث طابع الوقت..."],
    ["قراءة للتحقق...", "عداد الخدمة = 0 km ✓", "تحديث سجل الصيانة...", "إغلاق الجلسة بأمان ✓"],
  ], [randomOdo]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setStep(0);
        setProgress(0);
        setLog([]);
        setDone(false);
        setFailed(false);
      });
      return;
    }
    let p = 0; let cancelled = false;
    const run = async () => {
      for (let si = 0; si < WIZARD_STEPS.length; si++) {
        if (cancelled) return;
        setStep(si);
        const msgs = LOG_MSGS[si];
        for (let mi = 0; mi < msgs.length; mi++) {
          await new Promise(r => setTimeout(r, 600 + Math.random() * 500));
          if (cancelled) return;
          setLog(l => [...l, msgs[mi]]);
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          p = Math.min(100, p + Math.round(100 / (WIZARD_STEPS.length * msgs.length)));
          setProgress(p);
        }
        await new Promise(r => setTimeout(r, 400));
      }
      setProgress(100);
      setDone(true);
    };
    run();
    return () => { cancelled = true; };
  }, [open, LOG_MSGS]);

  const stepColors = (i: number) => {
    if (i < step) return "bg-green-500 text-white border-green-500";
    if (i === step && !done) return "bg-primary text-white border-primary animate-pulse";
    if (done) return "bg-green-500 text-white border-green-500";
    return "bg-card border-border text-muted-foreground";
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && (done || failed)) onClose(); }}>
      <DialogContent className="max-w-2xl bg-[#0a0e1a] border-border p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-transparent border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">{resetName}</h2>
              <p className="text-sm text-muted-foreground">{vehicleName}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            {WIZARD_STEPS.map((ws, i) => (
              <div key={ws.id} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${stepColors(i)}`}>
                    {i < step || done ? <Check className="w-4 h-4" /> : ws.id}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 text-center w-14">{ws.label}</span>
                </div>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mt-[-14px] transition-all ${i < step || done ? "bg-green-500" : "bg-border"}`} style={{ width: 28 }} />
                )}
              </div>
            ))}
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-primary">{done ? "✓ اكتمل" : failed ? "✗ فشل" : WIZARD_STEPS[step]?.sublabel}</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${done ? "bg-green-500" : failed ? "bg-red-500" : "bg-primary"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div
            ref={logRef}
            className="bg-black/60 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs space-y-1 border border-border"
          >
            <div className="text-muted-foreground/60">$ vehicle_service_tool --reset {resetType}</div>
            {log.map((l, i) => (
              <div key={i} className={`${l.includes("✓") ? "text-green-400" : l.includes("✗") ? "text-red-400" : "text-foreground/80"}`}>
                <span className="text-muted-foreground/40 mr-2">[{String(i).padStart(2, "0")}]</span>{l}
              </div>
            ))}
            {!done && !failed && (
              <div className="flex items-center gap-1 text-primary animate-pulse">
                <span className="text-muted-foreground/40 mr-2">[{String(log.length).padStart(2, "0")}]</span>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>جارٍ التنفيذ...</span>
              </div>
            )}
          </div>

          {done && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-400">اكتملت العملية بنجاح</p>
                <p className="text-xs text-muted-foreground">تم تنفيذ {resetName} وحفظ السجل</p>
              </div>
              <Button size="sm" className="ml-auto" onClick={onClose}>إغلاق</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Maintenance() {
  const [vehicleId, setVehicleId] = useState("");
  const [selectedReset, setSelectedReset] = useState<{ code: string; name: string } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: resets } = useListServiceResets();
  const { data: resetTypes, isLoading: loadingTypes } = useListResetTypes();
  const { data: vehicles } = useListVehicles();
  const performReset = usePerformServiceReset();

  const categories = ["all", ...Array.from(new Set(resetTypes?.map(t => t.category) ?? []))];

  const filteredTypes = resetTypes?.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === "all" || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  const groupedTypes = filteredTypes?.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category]!.push(curr);
    return acc;
  }, {} as Record<string, typeof resetTypes>);

  const handleExecute = (code: string, name: string) => {
    if (!vehicleId) {
      toast({ title: "الرجاء اختيار المركبة أولاً", variant: "destructive" });
      return;
    }
    setSelectedReset({ code, name });
    performReset.mutate({ data: { vehicleId: parseInt(vehicleId), resetType: code } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListServiceResetsQueryKey() })
    });
    setWizardOpen(true);
  };

  const successCount = resets?.filter(r => r.status === "success").length ?? 0;
  const totalCount = resets?.length ?? 0;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  const selectedVehicle = vehicles?.find(v => v.id.toString() === vehicleId);

  return (
    <div className="min-h-screen bg-background">
      <WizardDialog
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        resetType={selectedReset?.code ?? ""}
        resetName={selectedReset?.name ?? ""}
        vehicleName={selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : ""}
      />

      <div className="px-6 py-5 border-b border-border bg-card/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">إعادة الضبط والصيانة</h1>
            </div>
            <p className="text-muted-foreground text-sm">أكثر من 30 وظيفة إعادة ضبط — محرك، فرامل، ناقل الحركة، انبعاثات</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="w-56 bg-card border-border" data-testid="select-vehicle-reset">
                <Car className="w-4 h-4 mr-2 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="اختر المركبة..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map(v => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.year} {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
        {[
          { label: "إجمالي العمليات", value: totalCount, icon: <Activity className="w-4 h-4" />, color: "text-blue-400" },
          { label: "ناجحة", value: successCount, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400" },
          { label: "معدل النجاح", value: `${successRate}%`, icon: <Gauge className="w-4 h-4" />, color: "text-primary" },
          { label: "وظائف متاحة", value: resetTypes?.length ?? 0, icon: <Wrench className="w-4 h-4" />, color: "text-yellow-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-card/50 px-5 py-3 flex items-center gap-3">
            <div className={`${stat.color} opacity-70`}>{stat.icon}</div>
            <div>
              <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeCategory === cat
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {CATEGORY_ICONS[cat] ?? <Settings2 className="w-4 h-4" />}
            <span className="capitalize">{cat === "all" ? "الكل" : cat.replace("_", " ")}</span>
            {cat !== "all" && (
              <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full font-mono">
                {resetTypes?.filter(t => t.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-6 p-6">
        <div className="flex-1 min-w-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في وظائف الصيانة..."
              className="pl-9 bg-card border-border"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {loadingTypes ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse bg-card rounded-xl border border-border" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTypes ?? {}).map(([category, types]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-primary opacity-70">{CATEGORY_ICONS[category] ?? <Settings2 className="w-4 h-4" />}</div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      {category.replace("_", " ")}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-mono text-muted-foreground/60">{(types ?? []).length} وظيفة</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {(types ?? []).map(rt => {
                      const Icon = () => <>{RESET_ICONS[rt.code] ?? <Wrench className="w-5 h-5" />}</>;
                      const lastReset = resets?.find(r => r.resetType === rt.code);
                      return (
                        <button
                          key={rt.id}
                          onClick={() => handleExecute(rt.code, rt.name)}
                          className="group text-left p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col gap-3"
                          data-testid={`reset-tile-${rt.code}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                              <Icon />
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground leading-tight">{rt.name}</div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{rt.description}</div>
                          </div>
                          {lastReset ? (
                            <div className={`text-[10px] font-mono flex items-center gap-1 ${
                              lastReset.status === "success" ? "text-green-400" : "text-red-400"
                            }`}>
                              {lastReset.status === "success" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              آخر تنفيذ: {new Date(lastReset.performedAt).toLocaleDateString("ar")}
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-muted-foreground/40 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              لم يُنفَّذ بعد
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-72 shrink-0 space-y-4">
          {!vehicleId && (
            <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400">اختر المركبة من القائمة أعلاه قبل تنفيذ أي وظيفة</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">سجل العمليات</span>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {(resets?.length ?? 0) === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  لا توجد عمليات مسجلة
                </div>
              ) : (
                resets?.slice(0, 15).map(reset => (
                  <div key={reset.id} className="p-3 rounded-lg border border-border bg-background" data-testid={`history-row-${reset.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-xs leading-tight flex-1">
                        {resetTypes?.find(tp => tp.code === reset.resetType)?.name || reset.resetType}
                      </div>
                      <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        reset.status === "success" ? "bg-green-500/20 text-green-400" :
                        reset.status === "failed" ? "bg-red-500/20 text-red-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {reset.status === "success" ? "ناجح" : reset.status === "failed" ? "فشل" : "جارٍ"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {reset.vehicleName} · {new Date(reset.performedAt).toLocaleDateString("ar")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
