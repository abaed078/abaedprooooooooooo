import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { type DtcEntry } from "@/data/dtc-database";
import { useI18n } from "@/lib/i18n";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Wrench,
  Zap,
  ListChecks,
  Cpu,
  ChevronRight,
} from "lucide-react";

interface DtcDetailModalProps {
  dtc: DtcEntry | null;
  open: boolean;
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    badge: "bg-red-500/20 text-red-400 border-red-500/40",
    bar: "bg-red-500",
    icon: ShieldAlert,
  },
  warning: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    bar: "bg-yellow-500",
    icon: AlertTriangle,
  },
  info: {
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    bar: "bg-blue-500",
    icon: Info,
  },
};

const CATEGORY_COLOR: Record<string, string> = {
  Powertrain: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  Body: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  Chassis: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  Network: "bg-green-500/20 text-green-400 border-green-500/40",
};

export default function DtcDetailModal({ dtc, open, onClose }: DtcDetailModalProps) {
  const { t } = useI18n();

  if (!dtc) return null;

  const sev = SEVERITY_CONFIG[dtc.severity];
  const SevIcon = sev.icon;

  const severityLabel = () => {
    if (dtc.severity === "critical") return t("sevCritical");
    if (dtc.severity === "warning") return t("sevWarning");
    return t("sevInfo");
  };

  const commonalityLabel = () => {
    if (dtc.commonality === "very_common") return t("dtcVeryCommon");
    if (dtc.commonality === "common") return t("dtcCommon");
    return t("dtcUncommon");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0d1117] border-border text-foreground overflow-y-auto max-h-[90vh]">
        <DialogHeader className="pb-0">
          <div className={`flex items-center gap-4 p-4 rounded-lg border mb-2 ${sev.bg}`}>
            <SevIcon className={`w-8 h-8 ${sev.color} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`font-mono text-2xl font-bold tracking-widest ${sev.color}`}>
                  {dtc.code}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${sev.badge}`}>
                  {severityLabel()}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded border font-bold ${CATEGORY_COLOR[dtc.category]}`}>
                  {dtc.category}
                </span>
                <span className="text-xs px-2 py-0.5 rounded border border-border bg-secondary text-muted-foreground font-medium">
                  {commonalityLabel()}
                </span>
              </div>
              <DialogTitle className="text-base font-semibold text-foreground mt-1 leading-snug">
                {dtc.description}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{dtc.system} {t("dtcModalSystem")}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Possible Causes */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> {t("dtcModalCauses")}
              <span className="text-[10px] text-muted-foreground/50 font-normal normal-case tracking-normal ml-1">{t("dtcModalCausesHint")}</span>
            </h3>
            <ul className="space-y-2">
              {dtc.causes.map((cause, i) => (
                <li key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/50">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                    i === 0 ? `${sev.bar} text-white` : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`text-sm ${i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {cause}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Symptoms */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {t("dtcModalSymptoms")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {dtc.symptoms.map((s, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" /> {s}
                </span>
              ))}
            </div>
          </section>

          {/* Repair Recommendations */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" /> {t("dtcModalRecommendations")}
            </h3>
            <ol className="space-y-2">
              {dtc.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border/50">
                  <span className="shrink-0 w-6 h-6 rounded bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/90">{rec}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Affected Components */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" /> {t("dtcModalComponents")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {dtc.affectedComponents.map((comp, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-medium border border-border">
                  <ListChecks className="w-3 h-3 mr-1.5 text-muted-foreground" />{comp}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
