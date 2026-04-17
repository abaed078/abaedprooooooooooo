import { useState } from "react";
import {
  Car, Heart, AlertTriangle, CheckCircle2, Clock,
  Phone, MessageCircle, Share2, Printer, QrCode,
  Wrench, DollarSign, ShieldCheck, ChevronDown, ChevronUp,
  ArrowRight, Star, Leaf, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useActiveVehicle } from "@/lib/vehicle-context";
import { useWorkshopBrand } from "@/lib/workshop-brand";

const DEMO_ISSUES = [
  {
    code: "P0300",
    titleAr: "اشتعال عشوائي في المحرك",
    titleEn: "Engine Misfires Detected",
    descAr: "يحدث احتراق غير منتظم في إسطوانات المحرك مما يسبب اهتزازاً واستهلاكاً زائداً للوقود وزيادة في الانبعاثات الضارة.",
    descEn: "Irregular combustion detected in engine cylinders causing vibration, excessive fuel consumption, and increased harmful emissions.",
    severity: "critical",
    fixAr: "فحص وتبديل شمعات الإشعال وأسلاك التوزيع — الخدمة المعتادة كل 30,000 كم",
    fixEn: "Inspect and replace spark plugs and ignition wires — regular service every 30,000 km",
    costMin: 350, costMax: 900, timeH: 2,
    safetyImpact: "high",
  },
  {
    code: "P0234",
    titleAr: "ضغط مفرط في التوربو",
    titleEn: "Turbocharger Over-Pressure",
    descAr: "يعمل نظام شاحن التوربو بضغط أعلى من المسموح به، مما قد يتسبب في أضرار جسيمة للمحرك إذا تُرك دون إصلاح.",
    descEn: "The turbocharger system is operating at above-spec pressure, which may cause severe engine damage if left unrepaired.",
    severity: "high",
    fixAr: "فحص صمام التفريغ ومجسات الضغط وخراطيم التوربو",
    fixEn: "Inspect wastegate valve, pressure sensors, and turbo hoses",
    costMin: 500, costMax: 1800, timeH: 3,
    safetyImpact: "medium",
  },
  {
    code: "P0420",
    titleAr: "كفاءة المحفز الحراري منخفضة",
    titleEn: "Catalytic Converter Efficiency Low",
    descAr: "المحفز الحراري لا يُعالج الغازات الضارة بشكل كافٍ، مما يزيد من الانبعاثات ويؤثر على أداء المحرك.",
    descEn: "The catalytic converter is not processing harmful gases efficiently, increasing emissions and affecting engine performance.",
    severity: "medium",
    fixAr: "فحص المحفز الحراري ومستشعرات الأكسجين — قد يحتاج إلى استبدال",
    fixEn: "Inspect catalytic converter and O2 sensors — replacement may be needed",
    costMin: 800, costMax: 3500, timeH: 4,
    safetyImpact: "low",
  },
];

const HEALTH = 62;

function HealthRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="65" cy="65" r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        strokeDashoffset={circ / 4}
        style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
      />
      <text x="65" y="62" textAnchor="middle" fill={color} fontSize="22" fontWeight="800">{score}</text>
      <text x="65" y="78" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10">/ 100</text>
    </svg>
  );
}

export default function CustomerPortal() {
  const { lang, dir } = useI18n();
  const { activeVehicle } = useActiveVehicle();
  const { brand } = useWorkshopBrand();
  const isAr = lang === "ar";
  const [expanded, setExpanded] = useState<number | null>(0);

  const totalMin = DEMO_ISSUES.reduce((s, i) => s + i.costMin, 0);
  const totalMax = DEMO_ISSUES.reduce((s, i) => s + i.costMax, 0);
  const totalHours = DEMO_ISSUES.reduce((s, i) => s + i.timeH, 0);

  function shareWhatsApp() {
    const veh = activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : (isAr ? "مركبتك" : "Your vehicle");
    const issues = DEMO_ISSUES.map(i => `• ${isAr ? i.titleAr : i.titleEn}`).join("\n");
    const msg = isAr
      ? `🚗 تقرير فحص: ${veh}\n\nدرجة الصحة: ${HEALTH}/100\n\nالأعطال المكتشفة:\n${issues}\n\nالتكلفة التقديرية: ${totalMin.toLocaleString()} - ${totalMax.toLocaleString()} ريال\n\nللتواصل والحجز: ${brand.phone || "اتصل بنا"}\n${brand.shopName || "الورشة"}`
      : `🚗 Vehicle Inspection Report: ${veh}\n\nHealth Score: ${HEALTH}/100\n\nIssues Found:\n${issues}\n\nEstimated Cost: SAR ${totalMin.toLocaleString()} - ${totalMax.toLocaleString()}\n\nContact us: ${brand.phone || "Call us"}\n${brand.shopName || "Workshop"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const sevColor = (s: string) =>
    s === "critical" ? { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400", label: isAr ? "حرج" : "Critical" }
    : s === "high" ? { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", dot: "bg-orange-400", label: isAr ? "عالٍ" : "High" }
    : { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400", label: isAr ? "متوسط" : "Medium" };

  return (
    <div className="min-h-full bg-[#080b12] pb-12" dir={dir}>
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#0d1117] to-[#080b12] border-b border-white/[0.06] px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Workshop info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-white">{brand.shopName || (isAr ? "ورشة الإصلاح المتخصصة" : "Professional Workshop")}</div>
              <div className="text-[11px] text-slate-500">{brand.phone || ""} {brand.email ? `• ${brand.email}` : ""}</div>
            </div>
            <div className="ms-auto flex items-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
            </div>
          </div>

          {/* Vehicle + Health */}
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black text-white mb-1">
                {isAr ? "تقرير فحص مركبتك" : "Your Vehicle Inspection Report"}
              </h1>
              <div className="flex items-center gap-2 mb-3">
                <Car className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] text-slate-300">
                  {activeVehicle
                    ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`
                    : (isAr ? "Land Cruiser 300 – 2023" : "Land Cruiser 300 – 2023")
                  }
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-amber-400">{isAr ? "يحتاج عناية" : "Needs Attention"}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </div>

            {/* Health ring */}
            <div className="flex flex-col items-center">
              <HealthRing score={HEALTH} />
              <div className="text-[11px] text-slate-400 mt-1">{isAr ? "صحة المركبة" : "Vehicle Health"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: AlertTriangle, label: isAr ? "أعطال مكتشفة" : "Issues Found", value: DEMO_ISSUES.length, color: "text-red-400", bg: "bg-red-500/8" },
            { icon: DollarSign, label: isAr ? "التكلفة التقديرية" : "Est. Cost (SAR)", value: `${totalMin.toLocaleString()}–${totalMax.toLocaleString()}`, color: "text-emerald-400", bg: "bg-emerald-500/8" },
            { icon: Clock, label: isAr ? "وقت الإصلاح" : "Repair Time", value: `${totalHours}h`, color: "text-blue-400", bg: "bg-blue-500/8" },
          ].map((c, i) => {
            const CIcon = c.icon;
            return (
              <div key={i} className={cn("rounded-2xl p-4 border border-white/[0.07]", c.bg)}>
                <CIcon className={cn("w-5 h-5 mb-2", c.color)} />
                <div className={cn("text-[16px] font-black", c.color)}>{c.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{c.label}</div>
              </div>
            );
          })}
        </div>

        {/* Issues */}
        <div>
          <h2 className="text-[14px] font-bold text-white mb-3">
            {isAr ? "الأعطال المكتشفة" : "Issues Found"}
          </h2>
          <div className="space-y-3">
            {DEMO_ISSUES.map((issue, idx) => {
              const sev = sevColor(issue.severity);
              const isOpen = expanded === idx;
              return (
                <div key={idx} className={cn("rounded-2xl border overflow-hidden", sev.bg, sev.border)}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-start"
                    onClick={() => setExpanded(isOpen ? null : idx)}
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", sev.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-white">{isAr ? issue.titleAr : issue.titleEn}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border", sev.text, sev.border)}>
                          {sev.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{issue.code}</span>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={cn("text-[11px] font-bold", sev.text)}>
                        {issue.costMin.toLocaleString()}–{issue.costMax.toLocaleString()} {isAr ? "ر.س" : "SAR"}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-white/[0.05]">
                      <p className="text-[12px] text-slate-300 leading-relaxed mt-3 mb-3">
                        {isAr ? issue.descAr : issue.descEn}
                      </p>
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                        <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-[11px] text-slate-300">{isAr ? issue.fixAr : issue.fixEn}</p>
                      </div>
                      <div className="flex gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          {issue.timeH}h {isAr ? "تقريباً" : "approx"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <ShieldCheck className="w-3 h-3" />
                          {isAr ? `تأثير سلامة: ${issue.safetyImpact === "high" ? "عالٍ" : issue.safetyImpact === "medium" ? "متوسط" : "منخفض"}` : `Safety: ${issue.safetyImpact}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Good news */}
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-bold text-emerald-400 mb-1">
              {isAr ? "الجانب الإيجابي" : "Good News"}
            </div>
            <p className="text-[12px] text-slate-300">
              {isAr
                ? "نظام الفرامل، الشاحن الكهربائي، نظام ABS، والتوجيه جميعها تعمل بشكل ممتاز. لا توجد مشاكل أمان فورية."
                : "Brake system, charging system, ABS, and steering are all working excellently. No immediate safety concerns."
              }
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-blue-600/5 border border-primary/20 p-5">
          <div className="text-[15px] font-bold text-white mb-1">
            {isAr ? "احجز موعد الإصلاح الآن" : "Book Your Repair Appointment"}
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            {isAr
              ? "فريقنا متاح الآن لإصلاح مركبتك باستخدام قطع أصلية معتمدة مع ضمان على الخدمة"
              : "Our team is available to repair your vehicle with genuine parts and service warranty"
            }
          </p>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`tel:${brand.phone || ""}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary/80 transition-all"
            >
              <Phone className="w-4 h-4" />
              {brand.phone || (isAr ? "اتصل بنا" : "Call Now")}
            </a>
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-[12px] font-bold hover:bg-green-500 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-[12px] font-medium hover:bg-white/[0.1] transition-all"
            >
              <Printer className="w-4 h-4" />
              {isAr ? "طباعة" : "Print"}
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-[12px] font-medium hover:bg-white/[0.1] transition-all"
            >
              <Share2 className="w-4 h-4" />
              {isAr ? "مشاركة" : "Share"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
            <Zap className="w-3 h-3 text-primary" />
            {isAr ? "مدعوم بتقنية Autel MaxiSYS MS Ultra S2" : "Powered by Autel MaxiSYS MS Ultra S2"}
          </div>
          <div className="text-[10px] text-slate-700 mt-0.5">
            {isAr ? "تقرير تشخيصي رقمي موثوق" : "Certified Digital Diagnostic Report"}
          </div>
        </div>
      </div>
    </div>
  );
}
