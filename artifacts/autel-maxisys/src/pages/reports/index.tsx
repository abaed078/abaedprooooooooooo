import { useState, useEffect } from "react";
import {
  useListReports, useCreateReport, useDeleteReport,
  useListVehicles, useListDiagnosticSessions,
  getListReportsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  FileText, FileDown, Plus, Trash2, Printer, Loader2,
  Activity, CheckCircle2, AlertTriangle, XCircle, Car,
  Wrench, Calendar, User, Building2, Shield, QrCode, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTechnician } from "@/lib/technician";
import { useGetSettings } from "@workspace/api-client-react";
import { generateReportPDF } from "@/lib/pdf-generator";
import QRCode from "qrcode";

function QRShareModal({ reportId, vehicleName, onClose }: { reportId: number; vehicleName: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const shareUrl = `${window.location.origin}/autel-maxisys/reports?share=${reportId}`;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 200, margin: 2, color: { dark: "#ffffff", light: "#0d1117" } })
      .then(setQrDataUrl);
  }, [shareUrl]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-72 flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <span className="text-[12px] font-bold text-white">مشاركة التقرير</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="rounded-xl border border-white/10" style={{ width: 160, height: 160 }} />}
        <p className="text-[10px] text-slate-500 text-center">امسح الكود لمشاركة تقرير <strong className="text-slate-300">{vehicleName}</strong></p>
        <div className="w-full bg-black/30 rounded-lg p-2 text-[9px] font-mono text-slate-600 break-all text-center">{shareUrl}</div>
        <button
          onClick={() => { navigator.clipboard.writeText(shareUrl); }}
          className="text-[10px] text-primary hover:underline"
        >
          نسخ الرابط
        </button>
      </div>
    </div>
  );
}

const TYPE_META: Record<string, { label: string; labelAr: string; color: string; icon: React.ReactNode }> = {
  diagnostic:      { label: "Diagnostic Scan",    labelAr: "فحص تشخيصي",        color: "text-blue-400",   icon: <Activity className="w-4 h-4" /> },
  pre_inspection:  { label: "Pre-Repair",         labelAr: "فحص ما قبل الإصلاح", color: "text-yellow-400", icon: <Wrench className="w-4 h-4" /> },
  post_repair:     { label: "Post-Repair",        labelAr: "تحقق ما بعد الإصلاح",color: "text-green-400",  icon: <CheckCircle2 className="w-4 h-4" /> },
  full_inspection: { label: "Full Inspection",    labelAr: "فحص شامل",           color: "text-primary",    icon: <Shield className="w-4 h-4" /> },
};

function HealthScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const c = size / 2;
  const strokeWidth = size * 0.08;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
      <circle
        cx={c} cy={c} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.2} fontWeight="bold" fill={color} fontFamily="monospace">
        {score}
      </text>
      <text x={c} y={c + size * 0.2} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.1} fill="#64748b" fontFamily="sans-serif">
        /100
      </text>
    </svg>
  );
}

function ReportCard({ report, onDownload, onDelete, generating, lang, vehicles, sessions }: {
  report: any; onDownload: (r: any) => void; onDelete: (id: number) => void;
  generating: number | null; lang: string; vehicles: any[]; sessions: any[];
}) {
  const meta = TYPE_META[report.type] ?? TYPE_META.diagnostic;
  const score = report.dtcCount === 0 ? 98 : report.dtcCount === 1 ? 82 : report.dtcCount <= 3 ? 64 : 45;
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all group" data-testid={`report-card-${report.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50">
        <div className={`shrink-0 ${meta.color}`}>{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{report.title}</h3>
          <p className="text-xs text-muted-foreground">{lang === "ar" ? meta.labelAr : meta.label}</p>
        </div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
          report.status === "completed" ? "bg-green-500/20 text-green-400" :
          report.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
          "bg-secondary text-muted-foreground"
        }`}>
          {report.status === "completed" ? (lang === "ar" ? "مكتمل" : "Done") : report.status}
        </span>
      </div>

      <div className="p-4 flex gap-3 items-start">
        <HealthScoreRing score={score} size={70} />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{report.vehicleName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>{new Date(report.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${
            report.dtcCount === 0 ? "text-green-400" : "text-red-400"
          }`}>
            {report.dtcCount === 0
              ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{lang === "ar" ? "لا أعطال" : "No DTCs"}</>
              : <><XCircle className="w-3.5 h-3.5 shrink-0" />{report.dtcCount} {lang === "ar" ? "كود عطل" : "DTCs"}</>
            }
          </div>
          <div className={`text-xs font-bold ${score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
            {lang === "ar"
              ? (score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : "يحتاج صيانة")
              : (score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Service")}
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <Button
          variant="secondary" size="sm" className="flex-1"
          onClick={() => onDownload(report)}
          disabled={generating === report.id}
        >
          {generating === report.id
            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
          PDF
        </Button>
        <Button
          variant="secondary" size="sm"
          onClick={() => setShowQr(true)}
          title={lang === "ar" ? "مشاركة QR" : "Share via QR"}
          className="px-2.5"
        >
          <QrCode className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline" size="sm" className="px-2 text-red-500 hover:text-red-500 hover:bg-red-500/10"
          onClick={() => onDelete(report.id)}
          data-testid={`button-delete-${report.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showQr && (
        <QRShareModal
          reportId={report.id}
          vehicleName={report.vehicleName}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
}

function CreateReportDialog({ open, onClose, vehicles, sessions, lang, onCreate }: {
  open: boolean; onClose: () => void; vehicles: any[]; sessions: any[];
  lang: string; onCreate: (data: any) => void;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [type, setType] = useState<"diagnostic" | "pre_inspection" | "post_repair" | "full_inspection">("diagnostic");
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  const handleCreate = () => {
    if (!vehicleId || !title) {
      toast({ title: lang === "ar" ? "يرجى ملء الحقول المطلوبة" : "Fill required fields", variant: "destructive" });
      return;
    }
    onCreate({ vehicleId: parseInt(vehicleId), sessionId: sessionId && sessionId !== "none" ? parseInt(sessionId) : undefined, type, title });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold text-base">{lang === "ar" ? "إنشاء تقرير جديد" : "Create New Report"}</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">{lang === "ar" ? "عنوان التقرير *" : "Report Title *"}</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={lang === "ar" ? "مثال: فحص شامل — تويوتا كامري 2022" : "e.g. Full Inspection — Toyota Camry 2022"}
              className="bg-background border-border"
              data-testid="input-report-title"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">{lang === "ar" ? "المركبة *" : "Vehicle *"}</label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="bg-background border-border" data-testid="select-vehicle-report">
                <SelectValue placeholder={lang === "ar" ? "اختر مركبة" : "Choose vehicle"} />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.year} {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">{lang === "ar" ? "نوع التقرير" : "Report Type"}</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_META).map(([val, meta]) => (
                <button
                  key={val}
                  onClick={() => setType(val as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                    type === val ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"
                  }`}
                  data-testid="select-type-report"
                >
                  <span className={meta.color}>{meta.icon}</span>
                  <span className="text-xs font-medium">{lang === "ar" ? meta.labelAr : meta.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">{lang === "ar" ? "ربط جلسة تشخيص (اختياري)" : "Link Session (Optional)"}</label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder={lang === "ar" ? "اختر جلسة" : "Select session"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{lang === "ar" ? "بدون جلسة" : "None"}</SelectItem>
                {sessions.filter(s => !vehicleId || s.vehicleId.toString() === vehicleId).map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {new Date(s.startedAt).toLocaleDateString()} ({s.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} className="w-full" data-testid="button-execute-report">
            <Plus className="w-4 h-4 mr-2" />
            {lang === "ar" ? "إنشاء التقرير" : "Generate Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Reports() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);
  const lang = "ar";

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { current: tech } = useTechnician();
  const { data: settings } = useGetSettings({ query: { queryKey: ["/api/device/settings"] } });
  const { data: reports, isLoading: loadingReports } = useListReports();
  const { data: vehicles } = useListVehicles();
  const { data: sessions } = useListDiagnosticSessions();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();

  const handleCreate = (data: any) => {
    createReport.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        setIsCreateOpen(false);
        toast({ title: lang === "ar" ? "تم إنشاء التقرير بنجاح ✓" : "Report created" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm(lang === "ar" ? "هل تريد حذف هذا التقرير؟" : "Delete report?")) return;
    deleteReport.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        toast({ title: lang === "ar" ? "تم الحذف" : "Deleted" });
      }
    });
  };

  const handleDownloadPdf = async (report: any) => {
    setGeneratingPdf(report.id);
    try {
      const vehicle = vehicles?.find(v => v.id === report.vehicleId);
      generateReportPDF({
        title: report.title, type: report.type,
        vehicleName: report.vehicleName || `Vehicle #${report.vehicleId}`,
        vehicleVin: vehicle?.vin || undefined,
        vehicleOdometer: vehicle?.odometer || undefined,
        shopName: settings?.shopName || undefined,
        technicianName: settings?.technicianName || tech.name,
        createdAt: report.createdAt,
        dtcCount: report.dtcCount || 0,
        dtcCodes: [], liveData: [],
      });
      toast({ title: lang === "ar" ? "تم تنزيل PDF ✓" : "PDF downloaded" });
    } catch {
      toast({ title: lang === "ar" ? "فشل التنزيل" : "Failed", variant: "destructive" });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const filteredReports = reports?.filter(r => filterType === "all" || r.type === filterType);

  const stats = {
    total: reports?.length ?? 0,
    clean: reports?.filter(r => (r.dtcCount ?? 0) === 0).length ?? 0,
    withDtc: reports?.filter(r => (r.dtcCount ?? 0) > 0).length ?? 0,
    avgScore: reports && reports.length > 0
      ? Math.round(reports.reduce((s, r) => s + (r.dtcCount === 0 ? 98 : r.dtcCount === 1 ? 82 : r.dtcCount <= 3 ? 64 : 45), 0) / reports.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <CreateReportDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        vehicles={vehicles ?? []}
        sessions={sessions ?? []}
        lang={lang}
        onCreate={handleCreate}
      />

      <div className="px-6 py-5 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">التقارير التشخيصية</h1>
            </div>
            <p className="text-muted-foreground text-sm">تقارير PDF احترافية مع نقاط الصحة الشاملة</p>
          </div>
          <Button size="lg" onClick={() => setIsCreateOpen(true)} data-testid="button-create-report">
            <Plus className="w-5 h-5 mr-2" />
            إنشاء تقرير
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-border border-b border-border">
        {[
          { label: "إجمالي التقارير", value: stats.total, icon: <FileText className="w-4 h-4" />, color: "text-primary" },
          { label: "مركبات سليمة", value: stats.clean, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400" },
          { label: "تحتاج صيانة", value: stats.withDtc, icon: <AlertTriangle className="w-4 h-4" />, color: "text-yellow-400" },
          { label: "متوسط الصحة", value: stats.total > 0 ? `${stats.avgScore}/100` : "—", icon: <Activity className="w-4 h-4" />, color: "text-blue-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-card/50 px-5 py-3 flex items-center gap-3">
            <div className={`${stat.color} opacity-70`}>{stat.icon}</div>
            <div>
              <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {["all", ...Object.keys(TYPE_META)].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              filterType === t ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "all" ? "الكل" : TYPE_META[t]?.labelAr}
            {t !== "all" && (
              <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full font-mono">
                {reports?.filter(r => r.type === t).length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {loadingReports ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-52 animate-pulse bg-card rounded-xl border border-border" />)}
          </div>
        ) : (filteredReports?.length ?? 0) === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg">{lang === "ar" ? "لا توجد تقارير بعد" : "No reports yet"}</p>
            <p className="text-sm mt-1 opacity-60">انقر «إنشاء تقرير» للبدء</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredReports?.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDownload={handleDownloadPdf}
                  onDelete={handleDelete}
                  generating={generatingPdf}
                  lang={lang}
                  vehicles={vehicles ?? []}
                  sessions={sessions ?? []}
                />
              ))}
            </div>

            {(filteredReports?.length ?? 0) > 0 && (
              <div className="mt-6 p-4 rounded-xl border border-border bg-card/30 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{settings?.shopName || "ورشة الخبراء للسيارات"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{settings?.technicianName || tech.name}</span>
                </div>
                <div className="ml-auto text-xs text-muted-foreground font-mono">
                  Autel MaxiSYS MS Ultra S2 · {new Date().toLocaleDateString("ar-SA")}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
