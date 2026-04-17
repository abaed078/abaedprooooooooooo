import { useState } from "react";
import {
  ClipboardList, CheckCircle2, XCircle, AlertTriangle, Minus,
  ChevronDown, ChevronRight, Camera, FileText, Car, Wrench,
  Gauge, Zap, Eye, RotateCcw, Download, Star, Send
} from "lucide-react";
import { cn } from "@/lib/utils";

type ItemStatus = "ok" | "warn" | "fail" | "na" | null;

interface InspectionItem {
  id: string;
  labelAr: string;
  status: ItemStatus;
  note: string;
}

interface InspectionSection {
  id: string;
  labelAr: string;
  icon: any;
  color: string;
  items: InspectionItem[];
}

const SECTIONS_INIT: InspectionSection[] = [
  {
    id: "exterior", labelAr: "المظهر الخارجي", icon: Car, color: "#3b82f6",
    items: [
      { id: "e1", labelAr: "الزجاج الأمامي — خدوش / تشققات", status: null, note: "" },
      { id: "e2", labelAr: "الزجاج الخلفي والجانبي", status: null, note: "" },
      { id: "e3", labelAr: "المصابيح الأمامية — حالة العدسة", status: null, note: "" },
      { id: "e4", labelAr: "المصابيح الخلفية والاتجاه", status: null, note: "" },
      { id: "e5", labelAr: "الطلاء — خدوش / دهان ناقص", status: null, note: "" },
      { id: "e6", labelAr: "الهيكل — حفر / تجاعيد / تشقق", status: null, note: "" },
      { id: "e7", labelAr: "الأبواب — تشغيل / إغلاق محكم", status: null, note: "" },
      { id: "e8", labelAr: "المرايا الجانبية — سلامة وحركة", status: null, note: "" },
    ]
  },
  {
    id: "tires", labelAr: "الإطارات والعجلات", icon: Gauge, color: "#f97316",
    items: [
      { id: "t1", labelAr: "إطار أمامي أيسر — عمق المداس", status: null, note: "" },
      { id: "t2", labelAr: "إطار أمامي أيمن — عمق المداس", status: null, note: "" },
      { id: "t3", labelAr: "إطار خلفي أيسر — عمق المداس", status: null, note: "" },
      { id: "t4", labelAr: "إطار خلفي أيمن — عمق المداس", status: null, note: "" },
      { id: "t5", labelAr: "ضغط الإطارات (4 إطارات)", status: null, note: "" },
      { id: "t6", labelAr: "الجنوط — تشوه / صدأ", status: null, note: "" },
      { id: "t7", labelAr: "الإطار الاحتياطي — حالة وضغط", status: null, note: "" },
    ]
  },
  {
    id: "engine", labelAr: "حجرة المحرك", icon: Zap, color: "#ef4444",
    items: [
      { id: "en1", labelAr: "مستوى زيت المحرك — نوعية ومستوى", status: null, note: "" },
      { id: "en2", labelAr: "مستوى سائل التبريد", status: null, note: "" },
      { id: "en3", labelAr: "مستوى سائل الفرامل", status: null, note: "" },
      { id: "en4", labelAr: "مستوى سائل اتجاه القيادة", status: null, note: "" },
      { id: "en5", labelAr: "مستوى ماء غسيل الزجاج", status: null, note: "" },
      { id: "en6", labelAr: "سير المحرك والتوتر", status: null, note: "" },
      { id: "en7", labelAr: "البطارية — طرفان / تآكل / شد", status: null, note: "" },
      { id: "en8", labelAr: "خراطيم التبريد — تشققات / تسريب", status: null, note: "" },
      { id: "en9", labelAr: "مرشح الهواء — نظافة", status: null, note: "" },
      { id: "en10", labelAr: "أسلاك الشمعات / الحقنات", status: null, note: "" },
    ]
  },
  {
    id: "undercarriage", labelAr: "ما تحت المركبة", icon: Wrench, color: "#8b5cf6",
    items: [
      { id: "u1", labelAr: "الفرامل الأمامية — تآكل التيل", status: null, note: "" },
      { id: "u2", labelAr: "الفرامل الخلفية — تآكل التيل", status: null, note: "" },
      { id: "u3", labelAr: "الأقراص / الأسطوانات — سماكة", status: null, note: "" },
      { id: "u4", labelAr: "خرطوم الفرامل — تشققات / تسريب", status: null, note: "" },
      { id: "u5", labelAr: "المساعدات الأمامية — تسريب زيت", status: null, note: "" },
      { id: "u6", labelAr: "المساعدات الخلفية — تسريب زيت", status: null, note: "" },
      { id: "u7", labelAr: "أصابع الإدارة — لعب / تآكل", status: null, note: "" },
      { id: "u8", labelAr: "عرجونات / محاور — صوت غير طبيعي", status: null, note: "" },
      { id: "u9", labelAr: "ماسورة العادم — تسريب / صدأ", status: null, note: "" },
    ]
  },
  {
    id: "interior", labelAr: "الداخلية", icon: Eye, color: "#22c55e",
    items: [
      { id: "i1", labelAr: "المقاعد — حالة القماش / الجلد", status: null, note: "" },
      { id: "i2", labelAr: "السقف والأعمدة — بقع / تلف", status: null, note: "" },
      { id: "i3", labelAr: "السجادة والأرضية — رطوبة / تلف", status: null, note: "" },
      { id: "i4", labelAr: "لوحة التحكم — كل المفاتيح تعمل", status: null, note: "" },
      { id: "i5", labelAr: "الشاشة الرئيسية / المعلومات", status: null, note: "" },
      { id: "i6", labelAr: "التكييف — تبريد وتسخين كافٍ", status: null, note: "" },
      { id: "i7", labelAr: "الوسائد الهوائية — مؤشر لوحة", status: null, note: "" },
      { id: "i8", labelAr: "حزام الأمان — كل الحزام يعمل", status: null, note: "" },
    ]
  },
];

const STATUS_CONFIG: Record<NonNullable<ItemStatus>, { label: string; color: string; bg: string; icon: any }> = {
  ok:   { label: "سليم",   color: "text-green-400",  bg: "bg-green-500/20 border-green-500/40",   icon: CheckCircle2   },
  warn: { label: "تحذير",  color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40", icon: AlertTriangle  },
  fail: { label: "يحتاج",  color: "text-red-400",    bg: "bg-red-500/20 border-red-500/40",       icon: XCircle        },
  na:   { label: "لا ينطبق",color:"text-muted-foreground", bg: "bg-muted/20 border-border",      icon: Minus          },
};

function StatusButton({ status, current, onClick }: { status: NonNullable<ItemStatus>; current: ItemStatus; onClick: () => void }) {
  const cfg = STATUS_CONFIG[status];
  const active = current === status;
  return (
    <button onClick={onClick}
      className={cn("flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all",
        active ? cfg.bg : "bg-transparent border-border hover:border-white/20"
      )}>
      <cfg.icon className={cn("w-3 h-3", active ? cfg.color : "text-muted-foreground")} />
      <span className={active ? cfg.color : "text-muted-foreground"}>{cfg.label}</span>
    </button>
  );
}

function SectionBlock({ section, onUpdate }: {
  section: InspectionSection;
  onUpdate: (sectionId: string, itemId: string, status: ItemStatus, note: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const done = section.items.filter(i => i.status !== null).length;
  const total = section.items.length;
  const Icon = section.icon;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-all">
        <div className="p-2 rounded-xl" style={{ backgroundColor: section.color + "25" }}>
          <Icon className="w-4 h-4" style={{ color: section.color }} />
        </div>
        <div className="flex-1 text-right">
          <div className="font-bold text-sm">{section.labelAr}</div>
          <div className="text-[10px] text-muted-foreground">{done} / {total} مكتمل</div>
        </div>
        <div className="h-1.5 w-24 bg-black/40 rounded-full overflow-hidden border border-border">
          <div className="h-full rounded-full transition-all" style={{ width: `${total > 0 ? (done/total)*100 : 0}%`, backgroundColor: section.color }} />
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {section.items.map(item => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 text-right">
                <div className="text-[11px] font-medium">{item.labelAr}</div>
                {item.note && <div className="text-[9px] text-yellow-400 mt-0.5">{item.note}</div>}
              </div>
              <div className="flex gap-1">
                {(["ok","warn","fail","na"] as NonNullable<ItemStatus>[]).map(s => (
                  <StatusButton key={s} status={s} current={item.status}
                    onClick={() => onUpdate(section.id, item.id, item.status === s ? null : s, item.note)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DVIPage() {
  const [sections, setSections] = useState(SECTIONS_INIT);
  const [customerName, setCustomerName] = useState("أحمد الزهراني");
  const [vehicle, setVehicle] = useState("BMW 520i · 2022");
  const [reportSent, setReportSent] = useState(false);

  const updateItem = (sectionId: string, itemId: string, status: ItemStatus, note: string) => {
    setSections(prev => prev.map(sec =>
      sec.id === sectionId
        ? { ...sec, items: sec.items.map(it => it.id === itemId ? { ...it, status } : it) }
        : sec
    ));
  };

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const doneItems  = sections.reduce((acc, s) => acc + s.items.filter(i => i.status !== null).length, 0);
  const okItems    = sections.reduce((acc, s) => acc + s.items.filter(i => i.status === "ok").length, 0);
  const warnItems  = sections.reduce((acc, s) => acc + s.items.filter(i => i.status === "warn").length, 0);
  const failItems  = sections.reduce((acc, s) => acc + s.items.filter(i => i.status === "fail").length, 0);
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const healthColor = failItems > 0 ? "#ef4444" : warnItems > 0 ? "#eab308" : "#22c55e";
  const healthLabel = failItems > 0 ? "يحتاج إصلاح عاجل" : warnItems > 0 ? "تحتاج متابعة" : "حالة ممتازة";

  const sendReport = () => { setReportSent(true); setTimeout(() => setReportSent(false), 3000); };

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden" dir="rtl">
      {/* Main form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/30">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black">فحص رقمي شامل — DVI</h1>
            <p className="text-xs text-muted-foreground">Digital Vehicle Inspection · {totalItems} نقطة فحص</p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <div className="text-xs text-muted-foreground">{pct}% مكتمل</div>
            <div className="h-2 w-28 bg-black/40 rounded-full overflow-hidden border border-border">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#22c55e" : "#3b82f6" }} />
            </div>
          </div>
        </div>

        {sections.map(sec => (
          <SectionBlock key={sec.id} section={sec} onUpdate={updateItem} />
        ))}
      </div>

      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-[#08090f] flex flex-col overflow-hidden">
        {/* Vehicle info */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">معلومات المركبة</div>
          <div className="p-2 rounded-xl bg-card border border-border">
            <div className="text-[10px] text-muted-foreground">المركبة</div>
            <div className="font-bold text-sm">{vehicle}</div>
          </div>
          <div className="p-2 rounded-xl bg-card border border-border">
            <div className="text-[10px] text-muted-foreground">العميل</div>
            <div className="font-bold text-sm">{customerName}</div>
          </div>
          <div className="p-2 rounded-xl bg-card border border-border">
            <div className="text-[10px] text-muted-foreground">تاريخ الفحص</div>
            <div className="font-bold text-sm">{new Date().toLocaleDateString("ar-SA")}</div>
          </div>
        </div>

        {/* Health score */}
        <div className="p-3 border-b border-border">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">نتيجة الفحص</div>
          <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: healthColor + "15", borderColor: healthColor + "40" }} >
            <div className="text-4xl font-black mb-1" style={{ color: healthColor }}>
              {failItems > 0 ? failItems : warnItems > 0 ? warnItems : okItems}
            </div>
            <div className="text-[10px] font-bold" style={{ color: healthColor }}>{healthLabel}</div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {[
              { label: "سليم", count: okItems, color: "#22c55e" },
              { label: "تحذير", count: warnItems, color: "#eab308" },
              { label: "عطل", count: failItems, color: "#ef4444" },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-xl bg-card border border-border">
                <div className="text-lg font-black" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[9px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stars rating */}
        <div className="p-3 border-b border-border">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">تقييم الحالة العامة</div>
          <div className="flex gap-1 justify-center">
            {[1,2,3,4,5].map(n => {
              const score = totalItems > 0 ? 5 - Math.round((failItems * 2 + warnItems) / totalItems * 3) : 5;
              return <Star key={n} className={cn("w-6 h-6", n <= score ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />;
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 mt-auto space-y-2">
          <button onClick={sendReport}
            className={cn("w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
              reportSent ? "bg-green-500/20 border border-green-500/40 text-green-400" : "bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25"
            )}>
            {reportSent ? <><CheckCircle2 className="w-4 h-4" /> تم الإرسال!</> : <><Send className="w-4 h-4" /> إرسال للعميل</>}
          </button>
          <button className="w-full py-2.5 rounded-xl bg-card border border-border text-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
            <Download className="w-4 h-4" /> تصدير PDF
          </button>
          <button onClick={() => setSections(SECTIONS_INIT)}
            className="w-full py-2.5 rounded-xl bg-card border border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
            <RotateCcw className="w-4 h-4" /> إعادة تعيين
          </button>
        </div>
      </div>
    </div>
  );
}
