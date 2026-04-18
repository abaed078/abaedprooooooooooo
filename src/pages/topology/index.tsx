import { useState, useEffect, useRef } from "react";
import { Network, AlertTriangle, RefreshCw, Cpu, Activity } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type ModuleStatus = "ok" | "fault" | "offline" | "warning";

interface EcuModule {
  id: string; nameAr: string; nameEn: string;
  bus: string; address: string; status: ModuleStatus;
  dtcCount: number; x: number; y: number;
  connections: string[];
}

const MODULES: EcuModule[] = [
  { id:"PCM",  nameAr:"وحدة التحكم الرئيسية",    nameEn:"PCM/ECM",           bus:"CAN-C", address:"0x7E0", status:"ok",      dtcCount:0,  x:400, y:200, connections:["TCM","ABS","BCM","DASH"] },
  { id:"TCM",  nameAr:"ناقل الحركة",               nameEn:"Transmission",      bus:"CAN-C", address:"0x7E1", status:"ok",      dtcCount:0,  x:220, y:140, connections:["PCM"] },
  { id:"ABS",  nameAr:"نظام الفرامل ABS",           nameEn:"ABS/ESC Module",    bus:"CAN-C", address:"0x760", status:"warning", dtcCount:1,  x:580, y:140, connections:["PCM","DASH"] },
  { id:"BCM",  nameAr:"وحدة التحكم في الجسم",      nameEn:"Body Control (BCM)",bus:"CAN-B", address:"0x726", status:"ok",      dtcCount:0,  x:220, y:310, connections:["PCM","DASH","SRS","HVAC"] },
  { id:"SRS",  nameAr:"وسادة هوائية SRS",           nameEn:"Airbag / SRS",      bus:"CAN-B", address:"0x720", status:"fault",   dtcCount:3,  x:400, y:380, connections:["BCM"] },
  { id:"DASH", nameAr:"لوحة العدادات",              nameEn:"Instrument Cluster", bus:"CAN-C", address:"0x720", status:"ok",      dtcCount:0,  x:580, y:310, connections:["PCM","ABS","BCM"] },
  { id:"HVAC", nameAr:"نظام التكييف",               nameEn:"HVAC / Climate",    bus:"CAN-B", address:"0x741", status:"ok",      dtcCount:0,  x:100, y:225, connections:["BCM"] },
  { id:"ADAS", nameAr:"معايرة ADAS",                nameEn:"ADAS / Camera",     bus:"CAN-FD",address:"0x7D0", status:"ok",      dtcCount:0,  x:700, y:225, connections:["PCM","DASH"] },
  { id:"EPS",  nameAr:"التوجيه الكهربائي",          nameEn:"Electric Power Steer",bus:"CAN-C",address:"0x730",status:"ok",      dtcCount:0,  x:400, y:80,  connections:["PCM","ABS"] },
  { id:"GW",   nameAr:"بوابة الشبكة",               nameEn:"Gateway Module",    bus:"CAN-C", address:"0x751", status:"ok",      dtcCount:0,  x:400, y:290, connections:["PCM","BCM","DASH"] },
];

const STATUS_COLOR: Record<ModuleStatus, { stroke: string; fill: string; glow: string; label: string }> = {
  ok:      { stroke:"#22c55e", fill:"#22c55e15", glow:"#22c55e44", label:"سليم"   },
  warning: { stroke:"#eab308", fill:"#eab30815", glow:"#eab30844", label:"تحذير"  },
  fault:   { stroke:"#ef4444", fill:"#ef444415", glow:"#ef444444", label:"عطل"    },
  offline: { stroke:"#475569", fill:"#47556915", glow:"#47556944", label:"غير متصل" },
};

const BUS_COLOR: Record<string, string> = {
  "CAN-C":  "#3b82f6",
  "CAN-B":  "#8b5cf6",
  "CAN-FD": "#06b6d4",
};

function TopologyCanvas({ modules, selectedId, onSelect }: {
  modules: EcuModule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const pulseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width; const H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pulseRef.current += 0.04;
      const t = pulseRef.current;

      // Dark bg
      ctx.fillStyle = "#05080f"; ctx.fillRect(0, 0, W, H);
      // Grid
      ctx.strokeStyle = "#ffffff06"; ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke(); }
      for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(W,i); ctx.stroke(); }

      // Draw connections with animated data flow
      const drawn = new Set<string>();
      modules.forEach(mod => {
        mod.connections.forEach(targetId => {
          const key = [mod.id, targetId].sort().join("-");
          if (drawn.has(key)) return; drawn.add(key);
          const target = modules.find(m => m.id === targetId);
          if (!target) return;

          const busColor = BUS_COLOR[mod.bus] || "#3b82f6";
          // Base connection line
          ctx.beginPath(); ctx.moveTo(mod.x, mod.y); ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = busColor + "40"; ctx.lineWidth = 2;
          ctx.setLineDash([]); ctx.stroke();

          // Animated data flow dot
          const pct = (t * 0.3 + modules.indexOf(mod) * 0.2) % 1;
          const dx = mod.x + (target.x - mod.x) * pct;
          const dy = mod.y + (target.y - mod.y) * pct;
          ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI*2);
          ctx.fillStyle = busColor; ctx.shadowColor = busColor; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
        });
      });

      // Draw module nodes
      modules.forEach(mod => {
        const cfg = STATUS_COLOR[mod.status];
        const isSelected = mod.id === selectedId;
        const pulse = isSelected ? 1 + Math.sin(t * 4) * 0.06 : 1;
        const r = 38 * pulse;

        ctx.save();
        ctx.translate(mod.x, mod.y);

        // Glow
        if (mod.status !== "ok" || isSelected) {
          const grad = ctx.createRadialGradient(0, 0, r, 0, 0, r + 30);
          grad.addColorStop(0, cfg.glow); grad.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(0, 0, r + 30, 0, Math.PI*2);
          ctx.fillStyle = grad; ctx.fill();
        }

        // Node circle
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = cfg.fill; ctx.fill();
        ctx.strokeStyle = isSelected ? "white" : cfg.stroke;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        // Text
        ctx.fillStyle = "white"; ctx.font = "bold 10px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText(mod.id, 0, -6);
        ctx.font = "8px sans-serif"; ctx.fillStyle = "#94a3b8";
        ctx.fillText(mod.address, 0, 6);
        if (mod.dtcCount > 0) {
          ctx.beginPath(); ctx.arc(22, -22, 9, 0, Math.PI*2);
          ctx.fillStyle = "#ef4444"; ctx.fill();
          ctx.fillStyle = "white"; ctx.font = "bold 9px sans-serif";
          ctx.fillText(String(mod.dtcCount), 22, -19);
        }

        ctx.restore();
      });

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [modules, selectedId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const hit = modules.find(m => Math.hypot(m.x - mx, m.y - my) < 42);
    if (hit) onSelect(hit.id);
  };

  return (
    <canvas ref={canvasRef} width={800} height={460} onClick={handleClick}
      className="w-full rounded-xl border border-border cursor-pointer" />
  );
}

export default function TopologyMap() {
  const { lang } = useI18n();
  const [modules, setModules] = useState(MODULES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const selected = modules.find(m => m.id === selectedId);
  const faultCount = modules.filter(m => m.status === "fault").length;
  const warnCount = modules.filter(m => m.status === "warning").length;

  const rescan = () => {
    setScanning(true);
    setTimeout(() => {
      setModules(prev => prev.map(m => ({ ...m, dtcCount: m.status === "fault" ? Math.floor(Math.random() * 4) + 1 : 0 })));
      setScanning(false);
    }, 2000);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-[#08090f] overflow-y-auto flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Topology Map 3.0</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { label: "سليم", count: modules.filter(m=>m.status==="ok").length,      color:"text-green-400" },
              { label: "تحذير",count: warnCount,                                        color:"text-yellow-400"},
              { label: "عطل",  count: faultCount,                                       color:"text-red-400"  },
            ].map(s => (
              <div key={s.label} className="p-2 rounded-lg bg-card border border-border">
                <div className={`text-lg font-black ${s.color}`}>{s.count}</div>
                <div className="text-[9px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-2 flex-1 space-y-1">
          {modules.map(mod => {
            const cfg = STATUS_COLOR[mod.status];
            return (
              <button key={mod.id} onClick={() => setSelectedId(mod.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-right transition-all ${selectedId === mod.id ? "bg-primary/10 border border-primary/20" : "hover:bg-white/[0.03]"}`}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.stroke }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{mod.nameAr}</div>
                  <div className="text-[9px] text-muted-foreground">{mod.address} · {mod.bus}</div>
                </div>
                {mod.dtcCount > 0 && (
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">{mod.dtcCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bus legend */}
        <div className="p-3 border-t border-border">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">شبكات CAN</div>
          {Object.entries(BUS_COLOR).map(([bus, color]) => (
            <div key={bus} className="flex items-center gap-2 py-1">
              <div className="w-6 h-1 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono font-bold" style={{ color }}>{bus}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main canvas + detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-[#0a0c13]">
          <span className="text-xs text-muted-foreground">{modules.length} وحدة إلكترونية · شبكة CAN متعددة</span>
          {(faultCount > 0 || warnCount > 0) && (
            <span className="text-[10px] px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 font-bold">
              {faultCount} عطل · {warnCount} تحذير
            </span>
          )}
          <button onClick={rescan} disabled={scanning}
            className="mr-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "جارٍ الفحص..." : "إعادة الفحص"}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <TopologyCanvas modules={modules} selectedId={selectedId} onSelect={setSelectedId} />

          {/* Selected module detail */}
          {selected && (
            <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{selected.nameAr}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded border font-bold"
                      style={{ color: STATUS_COLOR[selected.status].stroke, borderColor: STATUS_COLOR[selected.status].stroke + "50" }}>
                      {STATUS_COLOR[selected.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selected.nameEn}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-primary">{selected.address}</div>
                  <div className="text-[10px] font-bold mt-0.5" style={{ color: BUS_COLOR[selected.bus] }}>{selected.bus}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded-lg bg-black/30 border border-border text-center">
                  <div className="text-lg font-black text-red-400">{selected.dtcCount}</div>
                  <div className="text-[9px] text-muted-foreground">رموز DTC</div>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-border text-center">
                  <div className="text-lg font-black text-blue-400">{selected.connections.length}</div>
                  <div className="text-[9px] text-muted-foreground">وحدات مرتبطة</div>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-border text-center">
                  <div className="text-xs font-mono font-bold text-green-400">V2.4.1</div>
                  <div className="text-[9px] text-muted-foreground">إصدار البرنامج</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

