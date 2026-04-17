import { useState } from "react";
import { Bot, DollarSign, Clock, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface Dtc { code: string; description: string; severity?: string; }
interface Vehicle { make?: string; model?: string; year?: number; }

interface Props {
  dtcs: Dtc[];
  vehicle?: Vehicle;
}

export function AiCostEstimator({ dtcs, vehicle }: Props) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState("");
  const [priorities, setPriorities] = useState("");
  const [tab, setTab] = useState<"cost" | "priority">("cost");

  if (!dtcs.length) return null;

  async function fetchEstimate() {
    setLoading(true);
    setEstimate("");
    setPriorities("");
    try {
      const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const [costRes, prioRes] = await Promise.all([
        fetch(`${BASE_URL}/api/ai/cost-estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dtcs, vehicle, lang }),
        }),
        fetch(`${BASE_URL}/api/ai/repair-priority`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dtcs, vehicle, lang }),
        }),
      ]);
      const costData = await costRes.json();
      const prioData = await prioRes.json();
      setEstimate(costData.estimate ?? (isAr ? "تعذّر التحليل" : "Analysis failed"));
      setPriorities(prioData.priorities ?? (isAr ? "تعذّر التحليل" : "Analysis failed"));
    } catch {
      setEstimate(isAr ? "حدث خطأ في الاتصال" : "Connection error");
      setPriorities(isAr ? "حدث خطأ في الاتصال" : "Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-blue-500/8 transition-colors text-left"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !estimate && !loading) fetchEstimate();
        }}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-blue-300">
              {isAr ? "تحليل ذكي للتكلفة والأولويات" : "AI Cost & Priority Analysis"}
            </span>
            <Sparkles className="w-3 h-3 text-blue-400/60" />
          </div>
          <p className="text-[10px] text-slate-500">{dtcs.length} {isAr ? "أعطال محددة" : "faults selected"}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-blue-500/15 p-4 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isAr ? "يحلّل الأعطال..." : "Analyzing faults..."}
            </div>
          )}

          {!loading && (estimate || priorities) && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 bg-black/20 rounded-lg p-1">
                <button
                  onClick={() => setTab("cost")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-md transition-all",
                    tab === "cost" ? "bg-blue-600/30 text-blue-300 font-bold" : "text-slate-500 hover:text-slate-300")}
                >
                  <DollarSign className="w-3 h-3" />
                  {isAr ? "تقدير التكلفة" : "Cost Estimate"}
                </button>
                <button
                  onClick={() => setTab("priority")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-md transition-all",
                    tab === "priority" ? "bg-blue-600/30 text-blue-300 font-bold" : "text-slate-500 hover:text-slate-300")}
                >
                  <Clock className="w-3 h-3" />
                  {isAr ? "الأولويات" : "Priorities"}
                </button>
              </div>

              {/* Content */}
              <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap bg-black/20 rounded-lg p-3 max-h-64 overflow-y-auto">
                {tab === "cost" ? estimate : priorities}
              </div>

              <Button
                size="sm" variant="ghost"
                onClick={() => { setEstimate(""); setPriorities(""); fetchEstimate(); }}
                className="text-[10px] text-slate-500 h-6"
              >
                {isAr ? "تحديث التحليل" : "Refresh Analysis"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
