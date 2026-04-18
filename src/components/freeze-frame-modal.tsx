import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { X, Camera, Clock, Gauge, Thermometer, Activity, Zap, Wind } from "lucide-react";

interface FreezeFrame {
  timestamp: string;
  rpm: number;
  speed: number;
  coolantTemp: number;
  intakeTemp: number;
  throttle: number;
  load: number;
  maf: number;
  map: number;
  shortFuelTrim: number;
  longFuelTrim: number;
  o2Bank1: number;
  ignitionTiming: number;
  fuelPressure: number;
}

interface Props {
  dtcCode: string;
  dtcName: string;
  onClose: () => void;
}

const DEMO_FF: FreezeFrame = {
  timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  rpm: 2150, speed: 67, coolantTemp: 94, intakeTemp: 31,
  throttle: 42.5, load: 58.3, maf: 18.4, map: 65,
  shortFuelTrim: -4.7, longFuelTrim: 8.2, o2Bank1: 0.41,
  ignitionTiming: 12.5, fuelPressure: 380,
};

interface FrameItem {
  labelEn: string; labelAr: string;
  value: string | number; unit: string;
  icon: any; color: string;
  note?: string;
}

export function FreezeFrameModal({ dtcCode, dtcName, onClose }: Props) {
  const { lang } = useI18n();
  const ff = DEMO_FF;

  const items: FrameItem[] = [
    { labelEn: "Engine RPM",        labelAr: "دورات المحرك",        value: ff.rpm,                    unit: "rpm",  icon: Activity,    color: "text-blue-400",    note: "" },
    { labelEn: "Vehicle Speed",     labelAr: "سرعة المركبة",        value: ff.speed,                  unit: "km/h", icon: Gauge,       color: "text-emerald-400", note: "" },
    { labelEn: "Coolant Temp",      labelAr: "حرارة سائل التبريد",  value: ff.coolantTemp,            unit: "°C",   icon: Thermometer, color: ff.coolantTemp > 100 ? "text-red-400" : "text-amber-400", note: ff.coolantTemp > 100 ? (lang === "ar" ? "مرتفعة" : "High") : "" },
    { labelEn: "Intake Air Temp",   labelAr: "حرارة هواء السحب",    value: ff.intakeTemp,             unit: "°C",   icon: Thermometer, color: "text-slate-400",   note: "" },
    { labelEn: "Throttle Position", labelAr: "موضع خانق الوقود",    value: ff.throttle.toFixed(1),    unit: "%",    icon: Zap,         color: "text-violet-400",  note: "" },
    { labelEn: "Engine Load",       labelAr: "حمل المحرك",          value: ff.load.toFixed(1),        unit: "%",    icon: Activity,    color: "text-orange-400",  note: "" },
    { labelEn: "MAF Air Flow",      labelAr: "تدفق الهواء MAF",     value: ff.maf.toFixed(1),         unit: "g/s",  icon: Wind,        color: "text-cyan-400",    note: "" },
    { labelEn: "MAP Sensor",        labelAr: "حساس MAP",            value: ff.map,                    unit: "kPa",  icon: Gauge,       color: "text-blue-300",    note: "" },
    { labelEn: "Short Fuel Trim B1",labelAr: "تعديل الوقود القصير", value: (ff.shortFuelTrim > 0 ? "+" : "") + ff.shortFuelTrim.toFixed(1), unit: "%", icon: Zap, color: ff.shortFuelTrim > 10 ? "text-red-400" : ff.shortFuelTrim < -10 ? "text-amber-400" : "text-emerald-400", note: ff.shortFuelTrim < -10 ? (lang === "ar" ? "خصم زائد" : "Rich") : ff.shortFuelTrim > 10 ? (lang === "ar" ? "إضافة زائدة" : "Lean") : "" },
    { labelEn: "Long Fuel Trim B1", labelAr: "تعديل الوقود الطويل",value: (ff.longFuelTrim > 0 ? "+" : "") + ff.longFuelTrim.toFixed(1),  unit: "%", icon: Zap, color: ff.longFuelTrim > 10 ? "text-red-400" : "text-emerald-400", note: "" },
    { labelEn: "O2 Sensor B1S1",    labelAr: "حساس O2 B1S1",       value: ff.o2Bank1.toFixed(3),     unit: "V",    icon: Zap,         color: "text-green-400",   note: "" },
    { labelEn: "Ignition Timing",   labelAr: "توقيت الإشعال",       value: ff.ignitionTiming.toFixed(1), unit: "°", icon: Zap,       color: "text-yellow-400",  note: "" },
    { labelEn: "Fuel Pressure",     labelAr: "ضغط الوقود",          value: ff.fuelPressure,           unit: "kPa",  icon: Gauge,       color: "text-blue-400",    note: "" },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Camera className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-black text-amber-400">{dtcCode}</span>
                <span className="text-[12px] text-white font-semibold">{dtcName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{lang === "ar" ? "لقطة مجمّدة بتاريخ" : "Frozen at"}: {new Date(ff.timestamp).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="mb-3">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">
              {lang === "ar" ? "بيانات المستشعرات لحظة ظهور الكود" : "SENSOR SNAPSHOT AT TIME OF FAULT"}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {items.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.labelEn} className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", item.color)} />
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide truncate">
                      {lang === "ar" ? item.labelAr : item.labelEn}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-[18px] font-black tabular-nums leading-none", item.color)}>{item.value}</span>
                    <span className="text-[9px] text-slate-600">{item.unit}</span>
                  </div>
                  {item.note && (
                    <span className={cn("text-[9px] font-semibold", item.color)}>{item.note}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06] bg-amber-500/5 shrink-0">
          <p className="text-[10px] text-amber-400/70 leading-relaxed">
            {lang === "ar"
              ? "هذه البيانات تمثل حالة المركبة في اللحظة التي ظهر فيها الكود. استخدمها للتشخيص التفصيلي."
              : "This data represents vehicle state at the exact moment the fault was detected. Use for detailed diagnosis."}
          </p>
        </div>
      </div>
    </div>
  );
}
