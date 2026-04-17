import { useState } from "react";
import {
  Zap, CheckCircle2, AlertTriangle, ChevronRight, RotateCcw,
  Play, Pause, Upload, Download, Settings2, Loader2, Hash
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "select" | "read" | "enter" | "write" | "verify" | "done";

const VEHICLES = [
  { id: 1, name: "BMW 520i N20 · 2022", ecu: "Bosch MED17.2.2", injectors: 4, protocol: "UDS/DoIP" },
  { id: 2, name: "Mercedes C200 M274 · 2021", ecu: "Continental SIM271DE", injectors: 4, protocol: "CAN-FD" },
  { id: 3, name: "Toyota Camry 2AR · 2023", ecu: "Denso 89661", injectors: 4, protocol: "ISO 14229" },
  { id: 4, name: "VW Golf 1.4 TSI · 2022", ecu: "Bosch MED9.5.10", injectors: 4, protocol: "UDS" },
];

const INJECTOR_TYPES = [
  { id: "bosch", name: "Bosch HDEV 5.2", code: "0261500073", flow: "290 cc/min" },
  { id: "siemens", name: "Siemens Deka 60lbs", code: "FJ1042-12B1", flow: "630 cc/min" },
  { id: "denso", name: "Denso 197cc", code: "23250-75080", flow: "197 cc/min" },
  { id: "magneti", name: "Magneti Marelli IWP", code: "0280158827", flow: "270 cc/min" },
];

function generateCode(seed: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 18; i++) {
    result += chars[(seed * (i + 7) * 31337) % chars.length];
    if (i === 5 || i === 11) result += "-";
  }
  return result;
}

const STEPS: { id: Step; labelAr: string; desc: string }[] = [
  { id: "select", labelAr: "اختر المركبة",   desc: "حدد المركبة ونوع الحاقنات" },
  { id: "read",   labelAr: "قراءة الأكواد",   desc: "اقرأ الأكواد الحالية من ECU" },
  { id: "enter",  labelAr: "إدخال الأكواد",   desc: "أدخل أكواد الحاقنات الجديدة" },
  { id: "write",  labelAr: "الكتابة للـ ECU",  desc: "اكتب الأكواد الجديدة في الذاكرة" },
  { id: "verify", labelAr: "التحقق",           desc: "تحقق من الكتابة الناجحة" },
  { id: "done",   labelAr: "اكتمل",            desc: "تم ترميز الحاقنات بنجاح" },
];

export default function InjectorCoding() {
  const [step, setStep] = useState<Step>("select");
  const [vehicle, setVehicle] = useState<typeof VEHICLES[0] | null>(null);
  const [injType, setInjType] = useState<typeof INJECTOR_TYPES[0] | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const doRead = () => {
    if (!vehicle) return;
    setLoading(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(interval); return 100; } return p + 8; }), 80);
    setTimeout(() => {
      setLoading(false);
      const generated = Array.from({ length: vehicle.injectors }, (_, i) => generateCode(i + 1));
      setCodes(generated);
      setNewCodes(generated.map((c, i) => generateCode(i + 100)));
      setStep("enter");
    }, 1200);
  };

  const doWrite = () => {
    setLoading(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(interval); return 100; } return p + 5; }), 60);
    setTimeout(() => { setLoading(false); setStep("verify"); }, 2000);
  };

  const doVerify = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("done"); }, 1000);
  };

  const reset = () => { setStep("select"); setVehicle(null); setInjType(null); setCodes([]); setNewCodes([]); };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30">
          <Zap className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-lg font-black">ترميز الحاقنات</h1>
          <p className="text-xs text-muted-foreground">Injector Coding — IMA / QR Code Programming</p>
        </div>
        <button onClick={reset} className="mr-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs hover:bg-white/5 transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> إعادة تعيين
        </button>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className={cn("flex flex-col items-center gap-1 flex-1",)}>
              <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all",
                i < stepIndex ? "bg-green-500/20 border-green-500 text-green-400" :
                i === stepIndex ? "bg-primary/20 border-primary text-primary" :
                "bg-card border-border text-muted-foreground"
              )}>
                {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <div className={cn("text-[9px] text-center font-bold",
                i === stepIndex ? "text-primary" : i < stepIndex ? "text-green-400" : "text-muted-foreground"
              )}>{s.labelAr}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px flex-1 mx-1 mt-[-12px]", i < stepIndex ? "bg-green-500/50" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card p-6">
        {/* STEP: SELECT */}
        {step === "select" && (
          <div className="space-y-4">
            <h2 className="font-bold text-base mb-4">اختر المركبة ونوع الحاقن</h2>
            <div className="grid grid-cols-2 gap-3">
              {VEHICLES.map(v => (
                <button key={v.id} onClick={() => setVehicle(v)}
                  className={cn("p-4 rounded-xl border text-right transition-all",
                    vehicle?.id === v.id ? "border-primary/60 bg-primary/10" : "border-border bg-background hover:border-white/20"
                  )}>
                  <div className="font-bold text-sm">{v.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">ECU: {v.ecu}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">{v.protocol}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400">{v.injectors} حاقنات</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-sm font-bold mb-2">نوع الحاقن الجديد</div>
              <div className="grid grid-cols-2 gap-2">
                {INJECTOR_TYPES.map(t => (
                  <button key={t.id} onClick={() => setInjType(t)}
                    className={cn("p-3 rounded-xl border text-right transition-all",
                      injType?.id === t.id ? "border-orange-500/60 bg-orange-500/10" : "border-border bg-background hover:border-white/20"
                    )}>
                    <div className="font-bold text-xs">{t.name}</div>
                    <div className="text-[9px] text-muted-foreground">كود: {t.code} · {t.flow}</div>
                  </button>
                ))}
              </div>
            </div>
            <button disabled={!vehicle || !injType} onClick={() => { setStep("read"); doRead(); }}
              className="w-full py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/25 transition-all flex items-center justify-center gap-2">
              <ChevronRight className="w-4 h-4" /> قراءة الأكواد الحالية
            </button>
          </div>
        )}

        {/* STEP: READ (loading) */}
        {step === "read" && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <div className="font-bold">جارٍ قراءة أكواد الحاقنات من ECU...</div>
            <div className="text-xs text-muted-foreground">{vehicle?.ecu} · {vehicle?.protocol}</div>
            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-border max-w-xs mx-auto">
              <div className="h-full bg-primary rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-primary font-mono">{progress}%</div>
          </div>
        )}

        {/* STEP: ENTER */}
        {step === "enter" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base">أكواد الحاقنات الجديدة</h2>
              <div className="text-[10px] text-muted-foreground">{vehicle?.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {codes.map((oldCode, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-[10px] font-bold text-muted-foreground">حاقن {i + 1}</div>
                  <div className="p-2 rounded-lg bg-black/40 border border-border">
                    <div className="text-[9px] text-muted-foreground mb-0.5">الكود الحالي</div>
                    <div className="font-mono text-[10px] text-muted-foreground line-through">{oldCode}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/30">
                    <div className="text-[9px] text-orange-400 mb-0.5">الكود الجديد</div>
                    <input
                      value={newCodes[i] || ""}
                      onChange={e => setNewCodes(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      className="font-mono text-[10px] w-full bg-transparent outline-none text-orange-300"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={doWrite}
              className="w-full py-3 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold hover:bg-orange-500/25 transition-all flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> كتابة الأكواد إلى ECU
            </button>
          </div>
        )}

        {/* STEP: WRITE (loading) */}
        {step === "write" && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto" />
            <div className="font-bold">جارٍ كتابة الأكواد...</div>
            <div className="text-xs text-muted-foreground">لا تفصل كابل OBD أثناء الكتابة</div>
            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-border max-w-xs mx-auto">
              <div className="h-full bg-orange-400 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-orange-400 font-mono">{progress}%</div>
          </div>
        )}

        {/* STEP: VERIFY */}
        {step === "verify" && (
          <div className="text-center py-10 space-y-4">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
            <div className="font-bold text-base">تحقق من الكتابة</div>
            <p className="text-sm text-muted-foreground">سيتم إعادة قراءة الأكواد من ECU للتأكد من الكتابة الصحيحة</p>
            <button onClick={doVerify} disabled={loading}
              className="px-8 py-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 font-bold hover:bg-yellow-500/25 transition-all flex items-center justify-center gap-2 mx-auto">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              التحقق الآن
            </button>
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div className="font-black text-xl text-green-400">تم بنجاح!</div>
            <p className="text-sm text-muted-foreground">تم ترميز {vehicle?.injectors} حاقنات بنجاح في {vehicle?.name}</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mt-4">
              {newCodes.map((c, i) => (
                <div key={i} className="p-2 rounded-lg bg-green-500/5 border border-green-500/20 text-right">
                  <div className="text-[9px] text-green-400">حاقن {i+1}</div>
                  <div className="font-mono text-[9px] text-foreground">{c}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-card border border-border text-sm font-bold hover:bg-white/5 transition-all flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> مركبة جديدة
              </button>
              <button className="px-5 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/25 transition-all flex items-center gap-2">
                <Download className="w-4 h-4" /> تصدير التقرير
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
