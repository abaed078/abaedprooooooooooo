import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  AlertCircle, CheckCircle2, Wrench, FileText, Zap,
  Camera, RefreshCw, Shield, Clock, Car
} from "lucide-react";

interface TimelineEvent {
  id: string;
  date: string;
  type: "scan" | "dtc" | "repair" | "service" | "calibration" | "update" | "recall";
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  severity?: "ok" | "warn" | "critical";
  codes?: string[];
}

const EVENTS: TimelineEvent[] = [
  {
    id: "1", date: "2026-04-07", type: "scan",
    titleEn: "Full Diagnostic Scan",       titleAr: "فحص تشخيصي شامل",
    descEn: "30 systems scanned — 2 DTCs found",   descAr: "فحص 30 نظام — تم العثور على كودين",
    severity: "warn", codes: ["P0420", "C0040"]
  },
  {
    id: "2", date: "2026-04-05", type: "service",
    titleEn: "Oil & Filter Change",        titleAr: "تغيير الزيت والفلتر",
    descEn: "5W-30 full synthetic — 5L",  descAr: "5W-30 تركيبي كامل — 5 لتر",
    severity: "ok"
  },
  {
    id: "3", date: "2026-04-01", type: "dtc",
    titleEn: "DTC Detected: P0171",        titleAr: "كود عطل: P0171",
    descEn: "System Too Lean Bank 1 — cleared after repair", descAr: "نظام وقود مفقر — تم الإصلاح وحذف الكود",
    severity: "warn", codes: ["P0171"]
  },
  {
    id: "4", date: "2026-03-20", type: "calibration",
    titleEn: "ADAS Camera Calibration",    titleAr: "معايرة كاميرا ADAS",
    descEn: "Front camera LKAS recalibrated — passed", descAr: "معايرة كاميرا LKAS الأمامية — ناجح",
    severity: "ok"
  },
  {
    id: "5", date: "2026-03-10", type: "repair",
    titleEn: "O2 Sensor Replacement",      titleAr: "استبدال حساس الأكسجين",
    descEn: "B1S1 upstream sensor replaced — Bosch OEM", descAr: "استبدال حساس B1S1 الأمامي — Bosch أصلي",
    severity: "ok"
  },
  {
    id: "6", date: "2026-02-15", type: "recall",
    titleEn: "Safety Recall Applied",      titleAr: "تطبيق استدعاء أمان",
    descEn: "NHTSA #23V-245 — Fuel pump software update", descAr: "NHTSA #23V-245 — تحديث برنامج مضخة الوقود",
    severity: "ok"
  },
  {
    id: "7", date: "2026-01-20", type: "update",
    titleEn: "ECU Software Update",        titleAr: "تحديث برنامج ECU",
    descEn: "Engine control module updated to v4.12.3", descAr: "تحديث وحدة التحكم إلى الإصدار v4.12.3",
    severity: "ok"
  },
  {
    id: "8", date: "2025-12-05", type: "scan",
    titleEn: "Pre-Purchase Inspection",    titleAr: "فحص ما قبل البيع",
    descEn: "Complete 30-point inspection — passed", descAr: "فحص شامل 30 نقطة — ناجح",
    severity: "ok"
  },
];

const TYPE_CONFIG = {
  scan:        { icon: FileText,    color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/25",    lineColor: "#3b82f6" },
  dtc:         { icon: AlertCircle, color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/25",   lineColor: "#f59e0b" },
  repair:      { icon: Wrench,      color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/25", lineColor: "#10b981" },
  service:     { icon: RefreshCw,   color: "text-violet-400",  bg: "bg-violet-500/15",  border: "border-violet-500/25",  lineColor: "#8b5cf6" },
  calibration: { icon: Zap,         color: "text-cyan-400",    bg: "bg-cyan-500/15",    border: "border-cyan-500/25",    lineColor: "#06b6d4" },
  update:      { icon: Shield,      color: "text-indigo-400",  bg: "bg-indigo-500/15",  border: "border-indigo-500/25",  lineColor: "#6366f1" },
  recall:      { icon: Camera,      color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/25",     lineColor: "#ef4444" },
};

interface Props { vehicleId?: string; }

export function VehicleTimeline({ vehicleId }: Props) {
  const { lang } = useI18n();

  const grouped = EVENTS.reduce<Record<string, TimelineEvent[]>>((acc, e) => {
    const year = e.date.slice(0, 7);
    if (!acc[year]) acc[year] = [];
    acc[year].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([month, events]) => (
        <div key={month}>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-2 py-2">
            {new Date(month + "-01").toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "long", year: "numeric" })}
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/[0.06]" />
            <div className="space-y-2">
              {events.map((event) => {
                const cfg = TYPE_CONFIG[event.type];
                const Icon = cfg.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3 group">
                    {/* Icon node */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 z-10",
                      cfg.bg, cfg.border
                    )}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-white">
                            {lang === "ar" ? event.titleAr : event.titleEn}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {lang === "ar" ? event.descAr : event.descEn}
                          </div>
                          {event.codes && event.codes.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {event.codes.map(c => (
                                <span key={c} className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-400">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {event.severity === "ok" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          {event.severity === "warn" && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                          {event.severity === "critical" && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                          <div className="flex items-center gap-1 text-[9px] text-slate-600">
                            <Clock className="w-3 h-3" />
                            {new Date(event.date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
