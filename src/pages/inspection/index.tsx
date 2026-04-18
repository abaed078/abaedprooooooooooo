import { useState, useRef, useEffect } from "react";
import {
  Camera, Download, Trash2, RotateCcw, Zap, Tag,
  CheckCircle2, AlertTriangle, XCircle, Loader2, Cpu, Eye, Scan
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const SAMPLE_ISSUES = [
  { x: 25, y: 40, type: "critical", label: "تسريب زيت المحرك" },
  { x: 65, y: 25, type: "warning",  label: "تآكل سير الإطار" },
  { x: 50, y: 70, type: "ok",       label: "مرشح الهواء — نظيف" },
];

const ANNOTATION_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning:  "#eab308",
  ok:       "#22c55e",
  info:     "#3b82f6",
};

type Annotation = { x: number; y: number; type: string; label: string; id: number; aiDetected?: boolean; confidence?: number };

const AI_DEFECT_TYPES = [
  { key: "scratch",  labelAr: "خدش",         color: "#ef4444" },
  { key: "scrape",   labelAr: "خربشة",        color: "#f97316" },
  { key: "dent",     labelAr: "حفرة / ضربة",  color: "#ef4444" },
  { key: "crack",    labelAr: "تشقق",          color: "#dc2626" },
  { key: "wrinkle",  labelAr: "تجعّد",         color: "#f97316" },
  { key: "paint",    labelAr: "طلاء ناقص",    color: "#eab308" },
];

function VideoSimulator({ annotations, onAddAnnotation, aiScanActive, aiDetections }: {
  annotations: Annotation[];
  onAddAnnotation: (ann: Annotation) => void;
  aiScanActive: boolean;
  aiDetections: Annotation[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const drawFrame = () => {
      const W = canvas.width; const H = canvas.height;
      timeRef.current += 0.02;
      const t = timeRef.current;

      ctx.fillStyle = "#050810";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "#1a2035"; ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

      const cx = W / 2; const cy = H / 2;
      ctx.fillStyle = "#1e293b"; ctx.beginPath();
      (ctx as any).roundRect?.(cx-140, cy-90, 280, 180, 20);
      ctx.fill();
      ctx.strokeStyle = "#334155"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#0f172a"; ctx.fillRect(cx-110, cy-60, 220, 100);

      [[-80,-10],[0,-10],[80,-10]].forEach(([ox, oy]) => {
        ctx.fillStyle = "#334155"; ctx.beginPath();
        (ctx as any).roundRect?.(cx+ox-22, cy+oy-18, 44, 36, 8);
        ctx.fill();
      });

      const oilY = cy + 48 + Math.sin(t * 3) * 8;
      ctx.beginPath(); ctx.arc(cx - 90, oilY, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,68,68,${0.6 + Math.sin(t * 5) * 0.4})`; ctx.fill();

      // AI scanning overlay
      if (aiScanActive) {
        const scanY = ((t * 60) % (H + 20)) - 10;
        const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
        grad.addColorStop(0, "rgba(59,130,246,0)");
        grad.addColorStop(0.5, "rgba(59,130,246,0.3)");
        grad.addColorStop(1, "rgba(59,130,246,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 30, W, 60);

        // Grid scan effect
        ctx.strokeStyle = "rgba(59,130,246,0.08)"; ctx.lineWidth = 0.5;
        for (let i = 0; i < W; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
        for (let i = 0; i < H; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
      }

      // AI detected defect boxes
      aiDetections.forEach(det => {
        const dx = (det.x / 100) * W; const dy = (det.y / 100) * H;
        const bw = 80; const bh = 50;
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2;
        ctx.strokeRect(dx - bw/2, dy - bh/2, bw, bh);
        ctx.fillStyle = "rgba(239,68,68,0.1)"; ctx.fillRect(dx - bw/2, dy - bh/2, bw, bh);
        ctx.fillStyle = "#ef4444"; ctx.font = "bold 9px monospace";
        ctx.fillText(det.label + ` ${det.confidence}%`, dx - bw/2, dy - bh/2 - 4);
      });

      ctx.fillStyle = "rgba(59,130,246,0.03)";
      for (let y = 0; y < H; y += 4) { ctx.fillRect(0, y, W, 2); }

      const m = 20; ctx.strokeStyle = aiScanActive ? "#ef4444" : "#3b82f6"; ctx.lineWidth = 3; ctx.setLineDash([]);
      [[0,0],[W,0],[0,H],[W,H]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x === 0 ? x+m : x-m, y); ctx.lineTo(x, y); ctx.lineTo(x, y === 0 ? y+m : y-m); ctx.stroke();
      });

      ctx.fillStyle = aiScanActive ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)";
      ctx.fillRect(8, 8, 180, 28);
      ctx.fillStyle = aiScanActive ? "#fca5a5" : "#93c5fd"; ctx.font = "bold 11px monospace";
      ctx.fillText(aiScanActive ? `AI SCAN · DETECTING...` : `MAXIVIDEO  |  ${new Date().toLocaleTimeString()}`, 14, 26);

      frameRef.current = requestAnimationFrame(drawFrame);
    };

    frameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameRef.current);
  }, [aiScanActive, aiDetections]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (aiScanActive) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddAnnotation({ x, y, type: "info", label: "نقطة فحص جديدة", id: Date.now() });
  };

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} width={800} height={450} onClick={handleClick}
        className={cn("w-full rounded-xl border border-border", aiScanActive ? "cursor-wait border-red-500/40" : "cursor-crosshair")} />
      {annotations.map(ann => (
        <div key={ann.id}
          style={{ left: `${ann.x}%`, top: `${ann.y}%`, borderColor: ANNOTATION_COLORS[ann.type] }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-black/60 flex items-center justify-center cursor-pointer group animate-in zoom-in-50">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ANNOTATION_COLORS[ann.type] }} />
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] px-2 py-0.5 rounded bg-black/90 border border-white/10 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
            {ann.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIResultCard({ det }: { det: Annotation & { confidence?: number; area?: string } }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border border-red-500/20 bg-red-500/5">
      <div className="w-1.5 h-8 rounded-full bg-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-xs text-red-400">{det.label}</div>
        <div className="text-[9px] text-muted-foreground truncate">{det.area || "الهيكل الأمامي"}</div>
      </div>
      <div className="text-xs font-black text-red-400">{det.confidence}%</div>
    </div>
  );
}

export default function Inspection() {
  const { lang } = useI18n();
  const [annotations, setAnnotations] = useState<Annotation[]>(
    SAMPLE_ISSUES.map((a, i) => ({ ...a, id: i }))
  );
  const [photos, setPhotos] = useState<{ id: number; label: string; issues: number }[]>([
    { id: 1, label: "حجرة المحرك", issues: 2 },
    { id: 2, label: "منطقة الإطارات", issues: 1 },
    { id: 3, label: "تحت المركبة",  issues: 0 },
  ]);
  const [activeType, setActiveType] = useState<string>("critical");
  const [tab, setTab] = useState<"manual" | "ai">("manual");

  // AI state
  const [aiScanning, setAiScanning] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [aiDetections, setAiDetections] = useState<(Annotation & { confidence?: number; area?: string })[]>([]);

  const runAiScan = () => {
    setAiScanning(true);
    setAiDone(false);
    setAiDetections([]);
    setTimeout(() => {
      const numDefects = 2 + Math.floor(Math.random() * 3);
      const defects: (Annotation & { confidence?: number; area?: string })[] = [];
      const areas = ["الجانب الأيسر", "الهيكل الأمامي", "الباب الخلفي", "قائمة A الأيمن", "غطاء المحرك"];
      for (let i = 0; i < numDefects; i++) {
        const defType = AI_DEFECT_TYPES[Math.floor(Math.random() * AI_DEFECT_TYPES.length)];
        defects.push({
          id: Date.now() + i,
          x: 15 + Math.random() * 70,
          y: 15 + Math.random() * 70,
          type: "critical",
          label: defType.labelAr,
          confidence: 78 + Math.floor(Math.random() * 20),
          area: areas[Math.floor(Math.random() * areas.length)],
          aiDetected: true,
        });
      }
      setAiDetections(defects);
      setAiScanning(false);
      setAiDone(true);
    }, 3000);
  };

  const addAnnotation = (ann: Annotation) => {
    setAnnotations(prev => [...prev, { ...ann, type: activeType }]);
  };

  const capturePhoto = () => {
    setPhotos(prev => [...prev, { id: Date.now(), label: `لقطة ${prev.length + 1}`, issues: annotations.filter(a => a.type === "critical").length }]);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden" dir="rtl">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-[#0a0c13]">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">كاميرا الفحص — MaxiVideo</span>

          {/* Tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[10px] font-bold">
            <button onClick={() => setTab("manual")}
              className={cn("px-3 py-1.5 transition-all", tab === "manual" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> يدوي</span>
            </button>
            <button onClick={() => setTab("ai")}
              className={cn("px-3 py-1.5 transition-all flex items-center gap-1", tab === "ai" ? "bg-red-500/20 text-red-400" : "text-muted-foreground hover:text-foreground")}>
              <Cpu className="w-3 h-3" /> AI Defect Detection
            </button>
          </div>

          <div className="mr-auto flex items-center gap-2">
            {tab === "manual" && Object.entries({ critical: "خطر", warning: "تحذير", ok: "سليم", info: "ملاحظة" }).map(([type, label]) => (
              <button key={type} onClick={() => setActiveType(type)}
                className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all", activeType === type ? "border-white/20 bg-white/5" : "border-transparent")}
                style={{ color: ANNOTATION_COLORS[type] }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ANNOTATION_COLORS[type] }} />
                {label}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={capturePhoto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[11px] font-bold hover:bg-primary/25 transition-all">
              <Camera className="w-3.5 h-3.5" /> التقط صورة
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <VideoSimulator
            annotations={tab === "manual" ? annotations : []}
            onAddAnnotation={addAnnotation}
            aiScanActive={aiScanning}
            aiDetections={tab === "ai" ? aiDetections : []}
          />

          {/* AI TAB */}
          {tab === "ai" && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <Cpu className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">AI Defect Detection</div>
                    <div className="text-[10px] text-muted-foreground">كشف: خدش · خربشة · حفرة · تشقق · تجعّد · طلاء ناقص</div>
                  </div>
                  <button onClick={runAiScan} disabled={aiScanning}
                    className={cn("mr-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      aiScanning ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                    )}>
                    {aiScanning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ الفحص...</> : <><Scan className="w-3.5 h-3.5" /> فحص AI الآن</>}
                  </button>
                </div>

                {!aiDone && !aiScanning && (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    اضغط "فحص AI الآن" لبدء التحليل التلقائي بالذكاء الاصطناعي
                  </div>
                )}

                {aiScanning && (
                  <div className="text-center py-6 space-y-2">
                    <div className="text-xs text-red-400 animate-pulse font-bold">جارٍ تحليل الصورة بالذكاء الاصطناعي...</div>
                    <div className="text-[10px] text-muted-foreground">محرك الكشف: Autel Vision AI v3.2</div>
                  </div>
                )}

                {aiDone && aiDetections.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-red-400">تم اكتشاف {aiDetections.length} عيوب</span>
                    </div>
                    {aiDetections.map(d => <AIResultCard key={d.id} det={d} />)}
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/25 transition-all flex items-center justify-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> تصدير تقرير الفحص
                      </button>
                      <button onClick={runAiScan}
                        className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> إعادة
                      </button>
                    </div>
                  </div>
                )}

                {aiDone && aiDetections.length === 0 && (
                  <div className="text-center py-4 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
                    <div className="text-sm font-bold text-green-400">لا عيوب مكتشفة!</div>
                    <div className="text-[10px] text-muted-foreground">المركبة في حالة ممتازة</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MANUAL TAB */}
          {tab === "manual" && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { type:"critical", label:"مشاكل خطيرة",  icon: XCircle,      count: annotations.filter(a=>a.type==="critical").length },
                { type:"warning",  label:"تحذيرات",       icon: AlertTriangle, count: annotations.filter(a=>a.type==="warning").length  },
                { type:"ok",       label:"عناصر سليمة",  icon: CheckCircle2,  count: annotations.filter(a=>a.type==="ok").length       },
              ].map(s => (
                <div key={s.type} className="p-3 rounded-xl border border-border bg-card flex items-center gap-3">
                  <s.icon className="w-5 h-5 shrink-0" style={{ color: ANNOTATION_COLORS[s.type] }} />
                  <div>
                    <div className="text-lg font-black" style={{ color: ANNOTATION_COLORS[s.type] }}>{s.count}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-border bg-[#08090f] flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-bold">الصور الملتقطة ({photos.length})</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {photos.map(p => (
            <div key={p.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="h-16 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <Camera className="w-6 h-6 text-muted-foreground opacity-40" />
              </div>
              <div className="p-2">
                <div className="text-[10px] font-bold truncate">{p.label}</div>
                {p.issues > 0 && <div className="text-[9px] text-red-400">{p.issues} مشكلة</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <button className="w-full py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> تصدير التقرير
          </button>
        </div>
      </div>
    </div>
  );
}
