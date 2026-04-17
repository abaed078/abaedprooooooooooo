import { useState } from "react";
import { KeyRound, Shield, AlertTriangle, CheckCircle2, Loader2, Lock, Unlock, Hash, Fingerprint, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const PROCEDURES = [
  {
    id: "add-key",    icon: KeyRound,   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",
    nameAr: "إضافة مفتاح جديد",        nameEn: "Add New Key",
    descAr: "برمجة مفتاح إضافي مع الاحتفاظ بالمفاتيح الحالية",
    steps: ["تأكد من مفتاح أصلي موجود","أدخل PIN الصانع","ضع المفتاح الجديد في القارئ","انتظر التأكيد"],
    pinRequired: true, time: "2–5 دقائق",
  },
  {
    id: "akl",        icon: Lock,       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",
    nameAr: "فقدان جميع المفاتيح (AKL)", nameEn: "All Keys Lost",
    descAr: "برمجة مفتاح جديد كلياً بدون مفتاح أصلي — يتطلب PIN رسمي",
    steps: ["تحقق من هوية المالك","اتصل بخادم IMMO","أدخل رمز الاستجابة","برمجة المفتاح الجديد"],
    pinRequired: true, time: "10–30 دقيقة",
  },
  {
    id: "delete-key", icon: Lock,       color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30",
    nameAr: "حذف مفتاح مفقود",         nameEn: "Delete / Erase Key",
    descAr: "مسح مفتاح مسروق أو مفقود من ذاكرة ECU",
    steps: ["ادخل بمفتاح مصرّح","اختر رقم المفتاح للحذف","تأكيد العملية","التحقق النهائي"],
    pinRequired: false, time: "1–3 دقائق",
  },
  {
    id: "immo-off",   icon: Shield,     color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30",
    nameAr: "تعطيل IMMO مؤقتاً",       nameEn: "IMMO Bypass",
    descAr: "تعطيل نظام مضاد السرقة مؤقتاً للصيانة",
    steps: ["تحقق من PIN الصانع","إرسال أمر الـ bypass","التحقق من الاستجابة","إعادة التفعيل بعد الانتهاء"],
    pinRequired: true, time: "3–8 دقائق",
  },
  {
    id: "pin-read",   icon: Hash,       color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30",
    nameAr: "قراءة رمز PIN",           nameEn: "PIN Code Reading",
    descAr: "استخراج PIN من ECM بواسطة Autel OBD2 Cloud",
    steps: ["اتصال Autel Cloud","نقل بيانات VIN","فك تشفير PIN","عرض الرمز"],
    pinRequired: false, time: "30–120 ثانية",
  },
  {
    id: "remote",     icon: Fingerprint,color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",
    nameAr: "برمجة ريموت كنترول",      nameEn: "Remote / Smart Key",
    descAr: "مزامنة مفتاح ذكي أو ريموت كنترول مع الجهاز",
    steps: ["اختر نوع الريموت","ادخل وضع البرمجة","اضغط أزرار الريموت","التحقق من التشغيل"],
    pinRequired: false, time: "1–5 دقائق",
  },
];

function ProcedureCard({ proc, onSelect }: { proc: typeof PROCEDURES[0]; onSelect: () => void }) {
  const Icon = proc.icon;
  return (
    <button onClick={onSelect}
      className={`w-full text-right p-4 rounded-xl border ${proc.border} ${proc.bg} hover:opacity-90 transition-all group`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${proc.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold">{proc.nameAr}</span>
            {proc.pinRequired && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold">
                PIN مطلوب
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{proc.descAr}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>⏱ {proc.time}</span>
            <span>· {proc.steps.length} خطوات</span>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 ${proc.color} opacity-0 group-hover:opacity-100 transition-all shrink-0`} />
      </div>
    </button>
  );
}

function ProcedureWizard({ proc, onClose }: { proc: typeof PROCEDURES[0] | null; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [pin, setPin] = useState("");

  if (!proc) return null;
  const Icon = proc.icon;

  const next = () => {
    if (step < proc.steps.length - 1) {
      setLoading(true);
      setTimeout(() => { setLoading(false); setStep(s => s + 1); }, 1200);
    } else {
      setLoading(true);
      setTimeout(() => { setLoading(false); setDone(true); }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0a0e1a] border border-border rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-border`}
          style={{ background: `linear-gradient(to right, var(--tw-gradient-from) 0%, transparent 100%)` }}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${proc.bg}`}>
            <Icon className={`w-5 h-5 ${proc.color}`} />
          </div>
          <div>
            <h2 className="font-bold">{proc.nameAr}</h2>
            <p className="text-[10px] text-muted-foreground">{proc.nameEn}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-muted-foreground text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {!done ? (
            <>
              {/* Steps indicator */}
              <div className="flex items-center gap-1.5">
                {proc.steps.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground text-left">الخطوة {step + 1} من {proc.steps.length}</div>

              {/* Current step */}
              <div className="p-5 rounded-xl bg-black/40 border border-border text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-black text-primary">{step + 1}</span>
                </div>
                <p className="text-sm font-bold mb-1">{proc.steps[step]}</p>
                <p className="text-[11px] text-muted-foreground">اتبع التعليمات الظاهرة على الجهاز</p>
              </div>

              {/* PIN input if required */}
              {proc.pinRequired && step === 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">أدخل PIN الصانع</label>
                  <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/, "").slice(0, 8))}
                    placeholder="••••••••"
                    type="password"
                    className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 font-mono text-center tracking-widest text-base focus:outline-none focus:border-primary/50" />
                </div>
              )}

              <button onClick={next} disabled={loading || (proc.pinRequired && step === 0 && pin.length < 4)}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (step < proc.steps.length - 1 ? "الخطوة التالية →" : "إتمام البرمجة")}
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-green-400 mb-2">تمت البرمجة بنجاح!</h3>
              <p className="text-sm text-muted-foreground mb-4">تم {proc.nameAr} بنجاح. اختبر المفتاح قبل تسليم المركبة.</p>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">إغلاق</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KeyProgramming() {
  const [selected, setSelected] = useState<typeof PROCEDURES[0] | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">برمجة المفاتيح / IMMO</h1>
          <p className="text-sm text-muted-foreground">نظام مضاد السرقة — برمجة وإدارة مفاتيح المركبة</p>
        </div>
      </div>

      <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <p className="text-xs text-red-300">
          <strong>تنبيه أمني:</strong> برمجة المفاتيح محمية قانونياً. تأكد من التحقق من ملكية المركبة قبل أي إجراء.
          يتطلب بعض الإجراءات اتصالاً بخادم Autel Cloud.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROCEDURES.map(proc => (
          <ProcedureCard key={proc.id} proc={proc} onSelect={() => setSelected(proc)} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "مركبات مدعومة", value: "10,000+", icon: "🚗" },
          { label: "بروتوكولات IMMO", value: "15+",    icon: "🔐" },
          { label: "تغطية الصانع",   value: "98%",     icon: "✅" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-black text-primary">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <ProcedureWizard proc={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
