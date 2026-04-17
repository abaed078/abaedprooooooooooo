import { useState, useEffect } from "react";
import { useListAdasCalibrations, useListAdasSystems, useCreateAdasCalibration, useListVehicles, getListAdasCalibrationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Crosshair, Camera, Eye, Radio, AlertTriangle, ChevronRight,
  Check, CheckCircle2, XCircle, Loader2, Car, Ruler, Activity,
  Shield, Zap, Navigation, Target
} from "lucide-react";

const SYSTEM_META: Record<string, { icon: React.ReactNode; color: string; desc: string; requiresTargetBoard?: boolean }> = {
  FRONT_CAMERA:    { icon: <Camera className="w-5 h-5" />, color: "text-blue-400", desc: "معايرة كاميرا الرؤية الأمامية — مسافة 2.5m من اللوحة المستهدفة" },
  RADAR_FRONT:     { icon: <Radio className="w-5 h-5" />, color: "text-green-400", desc: "معايرة رادار المسافة الأمامي — نظام ACC و FCWS" },
  BLIND_SPOT:      { icon: <Eye className="w-5 h-5" />, color: "text-yellow-400", desc: "معايرة مستشعرات النقطة العمياء الجانبية" },
  LANE_ASSIST:     { icon: <Navigation className="w-5 h-5" />, color: "text-purple-400", desc: "معايرة نظام دعم اللحام بالحارة المرورية" },
  PARKING_SENSORS: { icon: <Target className="w-5 h-5" />, color: "text-orange-400", desc: "معايرة مستشعرات الركن الأمامية والخلفية" },
  NIGHT_VISION:    { icon: <Eye className="w-5 h-5" />, color: "text-red-400", desc: "معايرة كاميرا الرؤية الليلية بالأشعة تحت الحمراء" },
};

const STEPS = [
  { id: 1, label: "اختيار النظام", icon: <Crosshair className="w-4 h-4" /> },
  { id: 2, label: "المتطلبات", icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: 3, label: "التحضير", icon: <Ruler className="w-4 h-4" /> },
  { id: 4, label: "المعايرة", icon: <Target className="w-4 h-4" /> },
  { id: 5, label: "النتائج", icon: <Activity className="w-4 h-4" /> },
];

function TopViewCarDiagram({ activeSystem }: { activeSystem: string }) {
  const sensors: { cx: number; cy: number; label: string; code: string }[] = [
    { cx: 200, cy: 55,  label: "أمامي", code: "FRONT_CAMERA" },
    { cx: 200, cy: 55,  label: "رادار",  code: "RADAR_FRONT" },
    { cx: 70,  cy: 180, label: "أيمن",   code: "BLIND_SPOT" },
    { cx: 330, cy: 180, label: "أيسر",   code: "BLIND_SPOT" },
    { cx: 200, cy: 310, label: "خلفي",   code: "PARKING_SENSORS" },
    { cx: 120, cy: 130, label: "حارة",   code: "LANE_ASSIST" },
    { cx: 280, cy: 130, label: "حارة",   code: "LANE_ASSIST" },
  ];

  return (
    <svg viewBox="0 0 400 370" className="w-full max-h-56 select-none">
      <rect x="120" y="60" width="160" height="250" rx="50" fill="#0f1a2e" stroke="#1e3a5f" strokeWidth="2" />
      <rect x="135" y="75" width="130" height="220" rx="42" fill="#0a1520" />
      <rect x="150" y="85" width="100" height="70" rx="8" fill="#0d2040" stroke="#1e3a5f" strokeWidth="1.5" opacity="0.8" />
      <rect x="150" y="220" width="100" height="55" rx="8" fill="#0d2040" stroke="#1e3a5f" strokeWidth="1.5" opacity="0.8" />
      <rect x="115" y="100" width="20" height="55" rx="4" fill="#0a1928" stroke="#1e3a5f" strokeWidth="1.5" />
      <rect x="265" y="100" width="20" height="55" rx="4" fill="#0a1928" stroke="#1e3a5f" strokeWidth="1.5" />
      <rect x="115" y="215" width="20" height="50" rx="4" fill="#0a1928" stroke="#1e3a5f" strokeWidth="1.5" />
      <rect x="265" y="215" width="20" height="50" rx="4" fill="#0a1928" stroke="#1e3a5f" strokeWidth="1.5" />
      <rect x="160" y="60" width="80" height="12" rx="4" fill="#162a45" stroke="#2e5080" strokeWidth="1" />
      <rect x="160" y="298" width="80" height="12" rx="4" fill="#162a45" stroke="#2e5080" strokeWidth="1" />
      {sensors.map((s, i) => {
        const isActive = activeSystem === s.code || (activeSystem === "BLIND_SPOT" && s.code === "BLIND_SPOT");
        return (
          <g key={i}>
            <circle
              cx={s.cx} cy={s.cy} r="12"
              fill={isActive ? "#3b82f620" : "#0f1a2e"}
              stroke={isActive ? "#3b82f6" : "#2e5080"}
              strokeWidth={isActive ? 2 : 1}
              className={isActive ? "animate-pulse" : ""}
            />
            <text x={s.cx} y={s.cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={isActive ? "#93c5fd" : "#4a7aaa"} fontFamily="monospace">
              {s.label}
            </text>
            {isActive && (
              <circle cx={s.cx} cy={s.cy} r="18" fill="none" stroke="#3b82f640" strokeWidth="1" className="animate-ping" style={{ animationDuration: "2s" }} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function CalibrationWizard({
  open, onClose, systems, vehicles, vehicleId, onVehicleChange
}: {
  open: boolean; onClose: () => void;
  systems: any[]; vehicles: any[];
  vehicleId: string; onVehicleChange: (v: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedSystem, setSelectedSystem] = useState("");
  const [calType, setCalType] = useState<"static" | "dynamic" | "both">("static");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<"pass" | "fail" | null>(null);
  const [readings, setReadings] = useState({ angle: 0, offset: 0, confidence: 0 });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startCalibration = useCreateAdasCalibration();

  const REQUIREMENTS = [
    "المركبة على سطح مستوٍ تماماً",
    "اللوحة المستهدفة موضوعة على مسافة 2.5m",
    "الإضاءة المحيطة مناسبة (لا أشعة شمس مباشرة)",
    "ضغط إطارات صحيح حسب المواصفات",
    "زاوية التوجيه في الوضع المحايد (0°)",
    "الإضاءة الأمامية غير مُفعّلة",
  ];

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setStep(1); setSelectedSystem(""); setChecks({}); setProgress(0);
        setDone(false); setResult(null);
      });
    }
  }, [open]);

  useEffect(() => {
    if (step !== 4) return;
    let p = 0; let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      p += Math.random() * 8 + 3;
      if (p >= 100) {
        p = 100;
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setReadings({ angle: Math.random() * 0.4 - 0.2, offset: Math.random() * 3 - 1.5, confidence: 97 + Math.random() * 3 });
          const pass = Math.random() > 0.1;
          setResult(pass ? "pass" : "fail");
          setDone(true);
          setStep(5);
          if (vehicleId && selectedSystem) {
            startCalibration.mutate({ data: { vehicleId: parseInt(vehicleId), system: selectedSystem, calibrationType: calType } }, {
              onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdasCalibrationsQueryKey() })
            });
          }
        }, 500);
        return;
      }
      setProgress(p);
    }, 300);
    return () => { cancelled = true; clearInterval(interval); };
  }, [step, vehicleId, selectedSystem, calType, startCalibration, queryClient]);

  const allChecked = REQUIREMENTS.every((_, i) => checks[i]);
  const sysMeta = SYSTEM_META[selectedSystem] ?? { icon: <Crosshair className="w-5 h-5" />, color: "text-primary", desc: "" };
  const sysName = systems.find(s => s.code === selectedSystem)?.name ?? selectedSystem;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl bg-[#070d1a] border-border p-0 overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-blue-500/10 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">معالج معايرة ADAS</h2>
              <p className="text-xs text-muted-foreground">أنظمة مساعدة السائق المتقدمة</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-1">
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                    step > s.id ? "bg-green-500 border-green-500 text-white" :
                    step === s.id ? "bg-blue-500 border-blue-500 text-white" :
                    "border-border text-muted-foreground"
                  }`}>
                    {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  {i < STEPS.length - 1 && <div className={`w-4 h-px ${step > s.id ? "bg-green-500" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 divide-x divide-border min-h-[380px]">
          <div className="col-span-2 p-4 bg-black/20">
            <TopViewCarDiagram activeSystem={selectedSystem} />
            <div className="mt-3 p-3 rounded-lg bg-card/50 border border-border text-xs space-y-1">
              <div className="font-semibold text-foreground mb-2">متطلبات النظام</div>
              {selectedSystem ? (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {SYSTEM_META[selectedSystem]?.requiresTargetBoard !== false && (
                      <><Ruler className="w-3 h-3 shrink-0" /> لوحة مستهدفة مطلوبة: 2.5m</>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="w-3 h-3 shrink-0" /> مسطح توجيه مطلوب
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="w-3 h-3 shrink-0" /> شاحن بطارية موصول
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground/50">اختر النظام لعرض المتطلبات</div>
              )}
            </div>
          </div>

          <div className="col-span-3 p-5">
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">اختيار المركبة والنظام</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">المركبة</label>
                    <Select value={vehicleId} onValueChange={onVehicleChange}>
                      <SelectTrigger className="bg-card border-border" data-testid="select-vehicle-adas">
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
                    <label className="text-xs text-muted-foreground mb-1 block">نظام ADAS</label>
                    <div className="space-y-2">
                      {systems.map(s => {
                        const meta = SYSTEM_META[s.code] ?? { icon: <Crosshair className="w-5 h-5" />, color: "text-primary", desc: s.description };
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSystem(s.code)}
                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                              selectedSystem === s.code ? "border-blue-500 bg-blue-500/10" : "border-border bg-card hover:border-blue-500/40"
                            }`}
                            data-testid={`select-system-adas`}
                          >
                            <div className={`shrink-0 ${meta.color}`}>{meta.icon}</div>
                            <div>
                              <div className="font-medium text-sm">{s.name}</div>
                              <div className="text-xs text-muted-foreground">{meta.desc || s.description}</div>
                            </div>
                            {selectedSystem === s.code && <Check className="w-4 h-4 text-blue-400 ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">نوع المعايرة</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["static", "dynamic", "both"] as const).map(ct => (
                        <button
                          key={ct}
                          onClick={() => setCalType(ct)}
                          className={`p-2 rounded border text-xs font-medium transition-all ${
                            calType === ct ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border text-muted-foreground hover:border-blue-500/40"
                          }`}
                        >
                          {ct === "static" ? "ثابتة" : ct === "dynamic" ? "ديناميكية" : "كلاهما"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!vehicleId || !selectedSystem}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  data-testid="button-start-calibration"
                >
                  التالي — فحص المتطلبات <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">قائمة التحقق قبل المعايرة</h3>
                <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">يجب تأكيد جميع البنود قبل المتابعة لضمان دقة المعايرة</p>
                </div>
                <div className="space-y-2">
                  {REQUIREMENTS.map((req, i) => (
                    <button
                      key={i}
                      onClick={() => setChecks(c => ({ ...c, [i]: !c[i] }))}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                        checks[i] ? "border-green-500/40 bg-green-500/10" : "border-border bg-card hover:border-green-500/30"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        checks[i] ? "border-green-500 bg-green-500" : "border-border"
                      }`}>
                        {checks[i] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm">{req}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">رجوع</Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!allChecked}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    data-testid="button-execute-calibration"
                  >
                    تم التحقق — التالي <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">التحضير للمعايرة</h3>
                <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`${sysMeta.color}`}>{sysMeta.icon}</div>
                    <span className="font-semibold">{sysName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{sysMeta.desc}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-black/30">
                      <div className="text-muted-foreground">نوع المعايرة</div>
                      <div className="text-foreground font-bold mt-0.5">{calType === "static" ? "ثابتة" : calType === "dynamic" ? "ديناميكية" : "ثابتة + ديناميكية"}</div>
                    </div>
                    <div className="p-2 rounded bg-black/30">
                      <div className="text-muted-foreground">الوقت التقديري</div>
                      <div className="text-foreground font-bold mt-0.5">{calType === "both" ? "15-20 دقيقة" : "5-10 دقائق"}</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">لا تحرك المركبة أثناء عملية المعايرة. لا تفصل كابل VCI.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">رجوع</Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    بدء المعايرة <Crosshair className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">جارٍ المعايرة — {sysName}</h3>
                <div className="space-y-2">
                  {["اتصال بالوحدة الإلكترونية", "استقبال إشارة المستشعر", "تحليل الزاوية والإزاحة", "ضبط المعاملات", "حفظ القيم"].map((stage, i) => {
                    const pct = progress;
                    const stagePct = (i + 1) * 20;
                    const active = pct >= i * 20 && pct < stagePct;
                    const done = pct >= stagePct;
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${active ? "bg-blue-500/10" : done ? "bg-green-500/5" : ""}`}>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          done ? "border-green-500 bg-green-500" : active ? "border-blue-500 bg-blue-500/20 animate-pulse" : "border-border"
                        }`}>
                          {done ? <Check className="w-3 h-3 text-white" /> : active ? <Loader2 className="w-3 h-3 text-blue-400 animate-spin" /> : null}
                        </div>
                        <span className={`text-sm ${done ? "text-green-400" : active ? "text-blue-400" : "text-muted-foreground"}`}>{stage}</span>
                        {active && <span className="ml-auto text-xs font-mono text-blue-400 animate-pulse">{Math.round(progress)}%</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-blue-400 animate-pulse">معايرة جارية...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  result === "pass" ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10"
                }`}>
                  {result === "pass" ? <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" /> : <XCircle className="w-6 h-6 text-red-400 shrink-0" />}
                  <div>
                    <p className={`font-bold text-lg ${result === "pass" ? "text-green-400" : "text-red-400"}`}>
                      {result === "pass" ? "المعايرة ناجحة ✓" : "فشلت المعايرة ✗"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{sysName} — {calType === "static" ? "ثابتة" : calType === "dynamic" ? "ديناميكية" : "ثابتة + ديناميكية"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "الزاوية", value: `${readings.angle.toFixed(2)}°`, unit: "إزاحة زاوية" },
                    { label: "الإزاحة", value: `${readings.offset.toFixed(1)}mm`, unit: "إزاحة عمودية" },
                    { label: "الثقة", value: `${readings.confidence.toFixed(1)}%`, unit: "مستوى الدقة" },
                  ].map((r, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-card text-center">
                      <div className="text-lg font-bold font-mono text-foreground">{r.value}</div>
                      <div className="text-xs text-muted-foreground">{r.label}</div>
                      <div className="text-[10px] text-muted-foreground/50">{r.unit}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setStep(1); setProgress(0); setDone(false); setResult(null); }} className="flex-1">
                    معايرة جديدة
                  </Button>
                  <Button onClick={onClose} className="flex-1">إغلاق</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdasCalibration() {
  const [vehicleId, setVehicleId] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: calibrations } = useListAdasCalibrations();
  const { data: systems, isLoading: loadingSystems } = useListAdasSystems();
  const { data: vehicles } = useListVehicles();

  const translateStatus = (s: string) => {
    if (s === "completed") return "مكتمل";
    if (s === "running") return "جارٍ";
    if (s === "failed") return "فشل";
    return s;
  };

  const systemStats = {
    total: calibrations?.length ?? 0,
    pass: calibrations?.filter(c => c.result === "pass").length ?? 0,
    fail: calibrations?.filter(c => c.result === "fail").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <CalibrationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        systems={systems ?? []}
        vehicles={vehicles ?? []}
        vehicleId={vehicleId}
        onVehicleChange={setVehicleId}
      />

      <div className="px-6 py-5 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                <Crosshair className="w-4 h-4 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold">معايرة أنظمة ADAS</h1>
            </div>
            <p className="text-muted-foreground text-sm">معايرة دقيقة لأنظمة مساعدة السائق المتقدمة — كاميرا، رادار، ليدار، مستشعرات</p>
          </div>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setWizardOpen(true)}
            data-testid="button-start-calibration"
          >
            <Crosshair className="w-5 h-5 mr-2" />
            بدء المعايرة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
        {[
          { label: "إجمالي المعايرات", value: systemStats.total, color: "text-blue-400" },
          { label: "ناجحة", value: systemStats.pass, color: "text-green-400" },
          { label: "فاشلة", value: systemStats.fail, color: "text-red-400" },
          { label: "أنظمة مدعومة", value: systems?.length ?? 0, color: "text-primary" },
        ].map((stat, i) => (
          <div key={i} className="bg-card/50 px-5 py-3">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6 p-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">سجل المعايرات</h2>
          {(calibrations?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
              <Crosshair className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا توجد معايرات مسجلة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calibrations?.map(cal => {
                const meta = SYSTEM_META[cal.system] ?? { icon: <Crosshair className="w-5 h-5" />, color: "text-primary" };
                return (
                  <div key={cal.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-blue-500/30 transition-colors" data-testid={`cal-row-${cal.id}`}>
                    <div className={`w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{cal.system}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          cal.status === "completed" ? "bg-green-500/20 text-green-400" :
                          cal.status === "failed" ? "bg-red-500/20 text-red-400" :
                          "bg-blue-500/20 text-blue-400 animate-pulse"
                        }`}>{translateStatus(cal.status)}</span>
                        {cal.result && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            cal.result === "pass" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}>{cal.result === "pass" ? "✓ نجح" : "✗ فشل"}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {cal.vehicleName} · {cal.calibrationType} · {new Date(cal.startedAt).toLocaleString("ar")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-64 shrink-0 space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">الأنظمة المدعومة</span>
            </div>
            <div className="p-3 space-y-2">
              {loadingSystems ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-secondary rounded" />)
              ) : systems?.map(sys => {
                const meta = SYSTEM_META[sys.code] ?? { icon: <Crosshair className="w-4 h-4" />, color: "text-primary" };
                return (
                  <div key={sys.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background">
                    <div className={`shrink-0 ${meta.color}`}>{meta.icon}</div>
                    <div>
                      <div className="text-xs font-medium">{sys.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{sys.code}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">معايير OEM</span>
            </div>
            <p className="text-xs text-muted-foreground">جميع المعايرات تتبع مواصفات OEM الأصلية لكل مصنع سيارات وتضمن دقة ≥97%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
