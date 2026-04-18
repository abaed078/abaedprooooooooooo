import { useState } from "react";
import { useCreateReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";

interface AutoReportBannerProps {
  vehicleId?: number;
  vehicleName?: string;
  dtcCount?: number;
  liveDataSnapshot?: Array<{ name: string; value: string; unit?: string }>;
}

export default function AutoReportBanner({
  vehicleId,
  vehicleName = "Unknown Vehicle",
  dtcCount = 0,
  liveDataSnapshot = [],
}: AutoReportBannerProps) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [, navigate] = useLocation();
  const createReport = useCreateReport();
  const [created, setCreated] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleGenerate = () => {
    const now = new Date();
    createReport.mutate(
      {
        data: {
          title: `${isAr ? "فحص تلقائي" : "Auto Scan"} — ${vehicleName}`,
          type: "diagnostic",
          vehicleId: vehicleId || null,
          vehicleName,
          vehicleVin: null,
          vehicleOdometer: null,
          shopName: null,
          technicianName: null,
          status: "draft",
          healthScore: Math.max(30, 100 - dtcCount * 12),
          dtcCount,
          dtcCodes: null,
          liveDataSnapshot: liveDataSnapshot.length > 0 ? liveDataSnapshot : null,
          notes: isAr
            ? `تقرير تلقائي من جلسة الفحص الحي بتاريخ ${now.toLocaleDateString("ar")}`
            : `Auto-generated from live scan session on ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          aiInsights: null,
        } as any,
      },
      {
        onSuccess: (data: any) => {
          setCreated(true);
          if (data?.id) setCreatedId(data.id);
        },
      }
    );
  };

  return (
    <div className="relative rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-blue-500/5 to-transparent p-4 flex items-center gap-4 overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,rgba(139,92,246,0.15),transparent_60%)]" />

      <div className="relative z-10 w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
        {created ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          <Sparkles className="w-5 h-5 text-violet-400" />
        )}
      </div>

      <div className="relative z-10 flex-1 min-w-0">
        {created ? (
          <>
            <p className="text-sm font-bold text-green-400">
              {isAr ? "تم إنشاء التقرير تلقائياً!" : "Report auto-generated!"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr ? "يمكنك مراجعته وتعديله في صفحة التقارير" : "Review and edit it in the Reports section"}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-foreground">
              {isAr ? "توليد تقرير تشخيصي تلقائي" : "Auto-generate diagnostic report"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? `${dtcCount > 0 ? `وُجدت ${dtcCount} أعطال` : "لا أعطال"} — اضغط لإنشاء مسودة تقرير PDF`
                : `${dtcCount > 0 ? `${dtcCount} faults detected` : "No faults"} — click to create a PDF draft`}
            </p>
          </>
        )}
      </div>

      <div className="relative z-10 flex items-center gap-2">
        {created && createdId ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-primary gap-1 text-xs"
            onClick={() => navigate("/reports")}
          >
            {isAr ? "عرض التقرير" : "View Report"}
            <ChevronRight className="w-3 h-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={createReport.isPending}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            {createReport.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAr ? "جارٍ الإنشاء..." : "Generating..."}</>
            ) : (
              <><FileText className="w-3.5 h-3.5" /> {isAr ? "إنشاء تقرير" : "Generate Report"}</>
            )}
          </Button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          aria-label="dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
