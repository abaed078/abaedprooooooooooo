import { useState } from "react";
import { Search, Zap, ChevronRight, Info, Download, ZoomIn, ZoomOut, RotateCcw, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const SYSTEMS = [
  { id: "engine",       nameAr: "نظام المحرك",           nameEn: "Engine System",         color: "#3b82f6", modules: ["ECM","IAT","MAF","MAP","TPS","O2","INJ1-4","CKP","CMP"] },
  { id: "abs",          nameAr: "نظام ABS",               nameEn: "ABS / Brake System",    color: "#ef4444", modules: ["ABS-ECU","WSS-FL","WSS-FR","WSS-RL","WSS-RR","PUMP","SOL1-4"] },
  { id: "transmission", nameAr: "ناقل الحركة",             nameEn: "Transmission",          color: "#eab308", modules: ["TCM","OSS","ISS","TFT","SL1","SL2","TCC","L/U-SOL"] },
  { id: "airbag",       nameAr: "نظام الوسادة الهوائية",   nameEn: "Airbag / SRS",         color: "#f97316", modules: ["SRS-ECU","DR-SENS","PASS-SENS","CLOCK-SPR","PRETENS"] },
  { id: "ac",           nameAr: "نظام التكييف",            nameEn: "A/C System",            color: "#06b6d4", modules: ["A/C-ECU","COMP","COND-FAN","EVAP-SENS","PRESS-SENS","BLEND-DOOR"] },
  { id: "power",        nameAr: "نظام الطاقة",             nameEn: "Power Supply / Ground", color: "#8b5cf6", modules: ["BATT","ALT","FUSE-BOX","GND-POINTS","PWR-RELAY"] },
  { id: "body",         nameAr: "نظام الجسم BCM",          nameEn: "Body / BCM",            color: "#ec4899", modules: ["BCM","DOORS","WINDOWS","LOCKS","LIGHTS","HORN","WIPERS"] },
  { id: "can",          nameAr: "شبكة CAN Bus",            nameEn: "CAN Bus Network",       color: "#10b981", modules: ["OBD-PORT","CAN-H","CAN-L","GATEWAY","TERMRES1","TERMRES2"] },
];

const WIRE_COLORS: Record<string, { bg: string; label: string }> = {
  red:    { bg: "#ef4444", label: "أحمر — طاقة (+12V)"    },
  black:  { bg: "#374151", label: "أسود — أرضي (GND)"     },
  green:  { bg: "#22c55e", label: "أخضر — إشارة"          },
  blue:   { bg: "#3b82f6", label: "أزرق — CAN High"       },
  yellow: { bg: "#eab308", label: "أصفر — CAN Low"        },
  white:  { bg: "#e5e7eb", label: "أبيض — مرجعي (REF)"   },
  orange: { bg: "#f97316", label: "برتقالي — SRS/وسادة"   },
  gray:   { bg: "#9ca3af", label: "رمادي — إشارة ضعيفة"  },
};

function WiringCanvas({ system }: { system: typeof SYSTEMS[0] }) {
  const nodes = system.modules;
  const centerX = 400; const centerY = 220;
  const radius = 160;
  const step = (2 * Math.PI) / nodes.length;
  const positions = nodes.map((_, i) => ({
    x: centerX + radius * Math.cos(i * step - Math.PI / 2),
    y: centerY + radius * Math.sin(i * step - Math.PI / 2),
  }));

  return (
    <svg viewBox="0 0 800 440" className="w-full" style={{ background: "#05080f" }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Grid */}
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 22} x2={800} y2={i * 22} stroke="#ffffff05" strokeWidth={1} />
      ))}
      {Array.from({ length: 37 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 22} y1={0} x2={i * 22} y2={440} stroke="#ffffff05" strokeWidth={1} />
      ))}
      {/* Connections */}
      {positions.map((from, i) =>
        positions.slice(i + 1, i + 3).map((to, j) => (
          <line key={`${i}-${j}`}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={system.color} strokeWidth={1.5} strokeOpacity={0.35}
            strokeDasharray={j % 2 === 0 ? "none" : "6 3"}
          />
        ))
      )}
      {/* Center node */}
      <circle cx={centerX} cy={centerY} r={38} fill={system.color + "22"} stroke={system.color} strokeWidth={2} filter="url(#glow)" />
      <text x={centerX} y={centerY - 6} textAnchor="middle" fill={system.color} fontSize={11} fontWeight="bold">{system.nameEn.split(" ")[0]}</text>
      <text x={centerX} y={centerY + 9} textAnchor="middle" fill={system.color + "99"} fontSize={9}>ECU/MODULE</text>
      {/* Module nodes */}
      {positions.map((pos, i) => (
        <g key={i}>
          <line x1={centerX} y1={centerY} x2={pos.x} y2={pos.y} stroke={system.color} strokeWidth={1.8} strokeOpacity={0.5} />
          <circle cx={pos.x} cy={pos.y} r={24} fill="#0d1117" stroke={system.color} strokeWidth={1.5} />
          <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">{nodes[i]}</text>
        </g>
      ))}
    </svg>
  );
}

export default function WiringDiagrams() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [selectedSystem, setSelectedSystem] = useState(SYSTEMS[0]);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(100);
  const [activePin, setActivePin] = useState<string | null>(null);

  const pinData = [
    { pin: "A1", wire: "red",    signal: "B+ Power Supply",     spec: "12–14.5V" },
    { pin: "A2", wire: "black",  signal: "Ground GND",          spec: "< 0.1Ω"  },
    { pin: "A3", wire: "green",  signal: "Sensor Signal",        spec: "0–5V"    },
    { pin: "A4", wire: "white",  signal: "Reference Voltage",    spec: "5V ±0.1" },
    { pin: "B1", wire: "blue",   signal: "CAN High",             spec: "2.5–3.5V"},
    { pin: "B2", wire: "yellow", signal: "CAN Low",              spec: "1.5–2.5V"},
    { pin: "B3", wire: "orange", signal: "SRS Signal",           spec: "0–5V"    },
    { pin: "B4", wire: "gray",   signal: "Analog Ground",        spec: "< 0.5Ω"  },
  ];

  const filtered = SYSTEMS.filter(s =>
    (isAr ? s.nameAr : s.nameEn).toLowerCase().includes(search.toLowerCase()) ||
    s.modules.some(m => m.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border overflow-y-auto bg-[#08090f] flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">{isAr ? "رسومات الأسلاك" : "Wiring Diagrams"}</span>
          </div>
          <div className="relative">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? "بحث نظام..." : "Search system..."}
              className="w-full bg-black/30 border border-border rounded-lg pr-8 pl-3 py-1.5 text-xs focus:outline-none focus:border-primary/50" />
          </div>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {filtered.map(sys => (
            <button key={sys.id} onClick={() => setSelectedSystem(sys)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${selectedSystem.id === sys.id ? "bg-primary/10 border border-primary/30" : "hover:bg-white/[0.03]"}`}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sys.color }} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{isAr ? sys.nameAr : sys.nameEn}</div>
                <div className="text-[9px] text-muted-foreground">{sys.modules.length} مكوّن</div>
              </div>
              {selectedSystem.id === sys.id && <ChevronRight className="w-3 h-3 text-primary ml-auto shrink-0" />}
            </button>
          ))}
        </div>
        {/* Wire color legend */}
        <div className="p-3 border-t border-border">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">مفتاح ألوان الأسلاك</div>
          <div className="space-y-1">
            {Object.entries(WIRE_COLORS).slice(0, 5).map(([, v]) => (
              <div key={v.label} className="flex items-center gap-2">
                <div className="w-4 h-1.5 rounded-full" style={{ backgroundColor: v.bg }} />
                <span className="text-[9px] text-muted-foreground">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-[#0a0c13]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedSystem.color }} />
            <span className="text-sm font-bold">{isAr ? selectedSystem.nameAr : selectedSystem.nameEn}</span>
            <span className="text-[10px] text-muted-foreground ml-1">{selectedSystem.modules.length} وحدة مترابطة</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => setZoom(z => Math.min(200, z + 10))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:border-primary/40 hover:text-primary transition-all">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono w-12 text-center text-muted-foreground">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.max(50, z - 10))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:border-primary/40 hover:text-primary transition-all">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoom(100)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:border-primary/40 hover:text-primary transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] hover:border-primary/40 hover:text-primary transition-all ml-2">
              <Download className="w-3.5 h-3.5" /> {isAr ? "تصدير PDF" : "Export PDF"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Wiring canvas */}
          <div className="rounded-2xl border border-border overflow-hidden" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
            <WiringCanvas system={selectedSystem} />
          </div>

          {/* Pin-out table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold">{isAr ? "جدول الأطراف والدبابيس" : "Connector Pin-out Table"}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{selectedSystem.nameEn} — Main Connector</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right px-4 py-2 text-muted-foreground font-semibold">دبوس</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-semibold">لون السلك</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-semibold">الإشارة / الوظيفة</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-semibold">القيمة المرجعية</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {pinData.map(row => (
                    <tr key={row.pin}
                      onClick={() => setActivePin(activePin === row.pin ? null : row.pin)}
                      className={`border-b border-border/50 cursor-pointer transition-colors ${activePin === row.pin ? "bg-primary/5" : "hover:bg-white/[0.02]"}`}>
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">{row.pin}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-2 rounded-full" style={{ backgroundColor: WIRE_COLORS[row.wire]?.bg }} />
                          <span className="text-muted-foreground capitalize">{row.wire}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-foreground">{row.signal}</td>
                      <td className="px-4 py-2.5 font-mono text-green-400">{row.spec}</td>
                      <td className="px-4 py-2.5">
                        <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
