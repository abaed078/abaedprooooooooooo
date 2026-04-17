import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { AlertTriangle, Shield, ExternalLink, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

interface Recall {
  id: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  reportDate: string;
  nhtsaId: string;
  applied: boolean;
}

// Demo data until real VIN available
const DEMO_RECALLS: Recall[] = [
  {
    id: "1",
    nhtsaId: "23V-245",
    component: "Fuel System, Gasoline: Delivery: Pump",
    summary: "Certain vehicles may have a fuel pump that can fail, resulting in engine stalling.",
    consequence: "A stalling engine can increase the risk of a crash.",
    remedy: "Dealers will update the fuel pump control software free of charge.",
    reportDate: "2023-08-15",
    applied: true,
  },
  {
    id: "2",
    nhtsaId: "24V-112",
    component: "Electronic Stability Control",
    summary: "The ESC module may not properly activate under certain road conditions.",
    consequence: "Reduced vehicle stability may increase crash risk.",
    remedy: "Dealers will update the ABS/ESC control module software.",
    reportDate: "2024-02-20",
    applied: false,
  },
];

interface Props {
  make?: string;
  model?: string;
  year?: string;
  vin?: string;
}

export function RecallsPanel({ make, model, year, vin }: Props) {
  const { lang } = useI18n();
  const [recalls] = useState<Recall[]>(DEMO_RECALLS);
  const [expanded, setExpanded] = useState<string | null>(null);

  const pending = recalls.filter(r => !r.applied);
  const applied = recalls.filter(r => r.applied);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-[13px] font-bold text-white">
              {lang === "ar" ? "استدعاءات الأمان" : "Safety Recalls"}
            </span>
            {pending.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded-full text-[9px] font-black text-red-400">
                {pending.length} {lang === "ar" ? "معلق" : "PENDING"}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {lang === "ar" ? "مصدر: NHTSA — الولايات المتحدة" : "Source: NHTSA Database"}
            {make && ` — ${make} ${model} ${year}`}
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw className="w-3 h-3" />
          {lang === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>

      {/* Pending recalls */}
      {pending.length > 0 && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-red-500/70 mb-2">
            {lang === "ar" ? "استدعاءات معلقة" : "PENDING RECALLS"}
          </div>
          {pending.map(r => (
            <div key={r.id} className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden mb-2">
              <button
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-red-500/8 transition-colors"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-red-400 font-black">NHTSA #{r.nhtsaId}</span>
                    <span className="text-[10px] text-slate-400 truncate">{r.component}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed">{r.summary}</div>
                </div>
              </button>
              {expanded === r.id && (
                <div className="px-4 pb-3 space-y-2 border-t border-red-500/15 pt-2">
                  <div>
                    <div className="text-[9px] text-slate-600 uppercase font-bold mb-0.5">
                      {lang === "ar" ? "العواقب" : "Consequence"}
                    </div>
                    <p className="text-[10px] text-slate-400">{r.consequence}</p>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-600 uppercase font-bold mb-0.5">
                      {lang === "ar" ? "الحل" : "Remedy"}
                    </div>
                    <p className="text-[10px] text-emerald-400">{r.remedy}</p>
                  </div>
                  <a
                    href={`https://www.nhtsa.gov/vehicle-safety/recalls#${r.nhtsaId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {lang === "ar" ? "عرض على موقع NHTSA" : "View on NHTSA.gov"}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Applied recalls */}
      {applied.length > 0 && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
            {lang === "ar" ? "استدعاءات مطبّقة" : "APPLIED RECALLS"}
          </div>
          {applied.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500 font-bold">NHTSA #{r.nhtsaId}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">{r.summary}</div>
              </div>
              <div className="text-[9px] text-emerald-500 shrink-0">
                {lang === "ar" ? "مطبّق" : "Applied"}
              </div>
            </div>
          ))}
        </div>
      )}

      {recalls.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-600">
          <Shield className="w-8 h-8" />
          <p className="text-[11px]">{lang === "ar" ? "لا توجد استدعاءات مسجلة" : "No recalls found"}</p>
        </div>
      )}
    </div>
  );
}
