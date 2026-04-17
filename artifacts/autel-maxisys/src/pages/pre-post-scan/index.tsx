import { useState } from "react";
import {
  GitCompare, CheckCircle2, XCircle, AlertTriangle, Plus,
  Minus, ArrowRight, Download, RotateCcw, ClipboardList, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DtcEntry {
  code: string;
  descAr: string;
  system: string;
  severity: "critical" | "warning" | "info";
}

const PRE_DTCS: DtcEntry[] = [
  { code: "P0300", descAr: "خلل في إشعال أسطوانات متعددة", system: "المحرك",    severity: "critical" },
  { code: "P0171", descAr: "خليط هواء-وقود فقير — بنك 1",  system: "الوقود",    severity: "warning"  },
  { code: "P0420", descAr: "كفاءة محفز منخفضة — بنك 1",    system: "العوادم",   severity: "warning"  },
  { code: "C0040", descAr: "خلل في حساس سرعة الإطار الأمامي الأيمن", system: "ABS", severity: "critical" },
  { code: "B0100", descAr: "خلل في دائرة وسادة هوائية الراكب",system: "SRS",    severity: "critical" },
  { code: "U0100", descAr: "فقدان الاتصال مع وحدة ECM",    system: "الشبكة",   severity: "warning"  },
];

const POST_DTCS: DtcEntry[] = [
  { code: "P0171", descAr: "خليط هواء-وقود فقير — بنك 1",  system: "الوقود",    severity: "warning"  },
];

const SEVERITY_CONFIG: Record<DtcEntry["severity"], { color: string; bg: string; icon: any }> = {
  critical: { color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30",       icon: XCircle        },
  warning:  { color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: AlertTriangle  },
  info:     { color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30",     icon: CheckCircle2   },
};

function DtcRow({ dtc, type }: { dtc: DtcEntry; type: "pre" | "post" | "resolved" | "new" }) {
  const cfg = SEVERITY_CONFIG[dtc.severity];
  const Icon = cfg.icon;
  return (
    <div className={cn("flex items-center gap-3 p-2.5 rounded-xl border",
      type === "resolved" ? "border-green-500/30 bg-green-500/5 opacity-70" :
      type === "new"      ? "border-orange-500/30 bg-orange-500/5" :
      cfg.bg
    )}>
      <Icon className={cn("w-3.5 h-3.5 shrink-0", type === "resolved" ? "text-green-400" : cfg.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-mono font-black", type === "resolved" ? "line-through text-green-400 opacity-60" : cfg.color)}>
            {dtc.code}
          </span>
          <span className={cn("text-[8px] px-1.5 py-0.5 rounded border",
            type === "resolved" ? "border-green-500/30 text-green-400" :
            type === "new" ? "border-orange-500/30 text-orange-400" :
            `border-current ${cfg.color}`
          )}>
            {type === "resolved" ? "✓ حُلَّ" : type === "new" ? "جديد" : dtc.system}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{dtc.descAr}</div>
      </div>
    </div>
  );
}

export default function PrePostScan() {
  const [showDiff, setShowDiff] = useState(false);
  const [scanDate] = useState({ pre: "2026-04-05 09:15", post: "2026-04-07 14:30" });

  // Calculate diff
  const resolved = PRE_DTCS.filter(p => !POST_DTCS.find(q => q.code === p.code));
  const newIssues = POST_DTCS.filter(p => !PRE_DTCS.find(q => q.code === p.code));
  const remaining = POST_DTCS.filter(p => PRE_DTCS.find(q => q.code === p.code));

  const improvement = Math.round((resolved.length / PRE_DTCS.length) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30">
          <GitCompare className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-black">مقارنة ما قبل وبعد الإصلاح</h1>
          <p className="text-xs text-muted-foreground">Pre/Post Repair Scan Comparison</p>
        </div>
        <div className="mr-auto flex gap-2">
          <button onClick={() => setShowDiff(p => !p)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all",
              showDiff ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}>
            <GitCompare className="w-3.5 h-3.5" /> عرض الفرق فقط
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/25 transition-all">
            <Download className="w-3.5 h-3.5" /> تصدير التقرير
          </button>
        </div>
      </div>

      {/* Score card */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "أكواد قبل الإصلاح",  value: PRE_DTCS.length,   color: "text-red-400"    },
          { label: "أكواد بعد الإصلاح",   value: POST_DTCS.length,  color: "text-yellow-400" },
          { label: "تم حلّها",            value: resolved.length,   color: "text-green-400"  },
          { label: "نسبة التحسين",        value: `${improvement}%`, color: "text-primary"    },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border border-border bg-card text-center">
            <div className={cn("text-3xl font-black", s.color)}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-muted-foreground">صفر أكواد</span>
          <span className="text-green-400">{improvement}% تحسين</span>
          <span className="text-muted-foreground">اكتمال التصليح</span>
        </div>
        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-border relative">
          {/* Pre bar */}
          <div className="h-full rounded-full bg-red-500/30 absolute left-0 top-0" style={{ width: "100%" }} />
          {/* Post bar */}
          <div className="h-full rounded-full transition-all" style={{ width: `${100 - improvement}%`, backgroundColor: POST_DTCS.length === 0 ? "#22c55e" : "#eab308" }} />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>قبل: {PRE_DTCS.length} كود</span>
          <span>بعد: {POST_DTCS.length} كود</span>
        </div>
      </div>

      {/* Comparison */}
      <div className={cn("grid gap-4", showDiff ? "grid-cols-1" : "grid-cols-3")}>
        {!showDiff && (
          <>
            {/* PRE column */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/3 overflow-hidden">
              <div className="px-4 py-3 border-b border-red-500/20 bg-red-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-sm text-red-400">قبل الإصلاح</span>
                </div>
                <div className="text-[9px] text-muted-foreground">{scanDate.pre}</div>
              </div>
              <div className="p-3 space-y-1.5">
                {PRE_DTCS.map(d => <DtcRow key={d.code} dtc={d} type="pre" />)}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-black text-green-400">-{resolved.length}</div>
                <div className="text-[9px] text-muted-foreground">أكواد محلولة</div>
                {newIssues.length > 0 && <>
                  <div className="text-2xl font-black text-orange-400">+{newIssues.length}</div>
                  <div className="text-[9px] text-muted-foreground">أكواد جديدة</div>
                </>}
              </div>
            </div>

            {/* POST column */}
            <div className="rounded-2xl border border-green-500/20 bg-green-500/3 overflow-hidden">
              <div className="px-4 py-3 border-b border-green-500/20 bg-green-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="font-bold text-sm text-green-400">بعد الإصلاح</span>
                </div>
                <div className="text-[9px] text-muted-foreground">{scanDate.post}</div>
              </div>
              <div className="p-3 space-y-1.5">
                {POST_DTCS.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                    <div className="font-bold text-green-400">لا أكواد خطأ!</div>
                    <div className="text-[10px] text-muted-foreground">المركبة في حالة سليمة تماماً</div>
                  </div>
                ) : (
                  POST_DTCS.map(d => <DtcRow key={d.code} dtc={d} type="post" />)
                )}
              </div>
            </div>
          </>
        )}

        {/* Diff view */}
        {showDiff && (
          <div className="space-y-4">
            {resolved.length > 0 && (
              <div className="rounded-2xl border border-green-500/20 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-green-500/20 bg-green-500/10 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="font-bold text-xs text-green-400">تم حلّها ({resolved.length})</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {resolved.map(d => <DtcRow key={d.code} dtc={d} type="resolved" />)}
                </div>
              </div>
            )}
            {remaining.length > 0 && (
              <div className="rounded-2xl border border-yellow-500/20 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-yellow-500/20 bg-yellow-500/10 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="font-bold text-xs text-yellow-400">لا تزال موجودة ({remaining.length})</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {remaining.map(d => <DtcRow key={d.code} dtc={d} type="post" />)}
                </div>
              </div>
            )}
            {newIssues.length > 0 && (
              <div className="rounded-2xl border border-orange-500/20 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-orange-500/20 bg-orange-500/10 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-orange-400" />
                  <span className="font-bold text-xs text-orange-400">أكواد جديدة ({newIssues.length})</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {newIssues.map(d => <DtcRow key={d.code} dtc={d} type="new" />)}
                </div>
              </div>
            )}
            {resolved.length === PRE_DTCS.length && newIssues.length === 0 && (
              <div className="py-10 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <div className="font-black text-xl text-green-400">إصلاح مكتمل 100%</div>
                <p className="text-sm text-muted-foreground">تم حل جميع الأكواد بنجاح</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Technician summary */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">ملاحظات التقني</span>
        </div>
        <textarea
          className="w-full h-20 bg-black/40 border border-border rounded-xl px-3 py-2 text-xs text-right placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          placeholder="أضف ملاحظاتك حول الإصلاح المنجز..."
          defaultValue="تم استبدال فلتر الهواء وضبط حساس MAP. لا يزال الكود P0171 يحتاج متابعة بعد 500 كم إضافية."
        />
        <div className="flex justify-end">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/25 transition-all">
            <Download className="w-3.5 h-3.5" /> إرسال للعميل
          </button>
        </div>
      </div>
    </div>
  );
}
