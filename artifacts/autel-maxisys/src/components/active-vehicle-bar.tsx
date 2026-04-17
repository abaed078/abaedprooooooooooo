import { useState } from "react";
import { Car, ChevronDown, X, Search, CheckCircle2, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useActiveVehicle, ActiveVehicle } from "@/lib/vehicle-context";
import { useListVehicles } from "@workspace/api-client-react";

const BRAND_COLORS: Record<string, string> = {
  toyota: "#EB0A1E", bmw: "#1C69D4", mercedes: "#5A5A5A", "mercedes-benz": "#5A5A5A",
  audi: "#C0084A", ford: "#003478", honda: "#CC0000", nissan: "#C3002F",
  chevrolet: "#D4A017", dodge: "#8B0000", lexus: "#1A1A2E", kia: "#05141F",
  hyundai: "#002C5F", volkswagen: "#001E50", porsche: "#A9122A", tesla: "#CC0000",
  genesis: "#1A1A2E", land: "#005A2B", "land rover": "#005A2B",
};

function getBrandColor(make: string) {
  const key = make.toLowerCase();
  for (const [k, v] of Object.entries(BRAND_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "#3B82F6";
}

function getBrandCode(make: string) {
  const parts = make.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return make.slice(0, 3).toUpperCase();
}

export function VehicleSelector({ onClose }: { onClose: () => void }) {
  const { lang, dir } = useI18n();
  const { setActiveVehicle } = useActiveVehicle();
  const { data: vehicles } = useListVehicles();
  const [search, setSearch] = useState("");
  const isAr = lang === "ar";

  const filtered = (vehicles ?? []).filter(v => {
    const q = search.toLowerCase();
    return (
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.licensePlate ?? "").toLowerCase().includes(q) ||
      (v.vin ?? "").toLowerCase().includes(q)
    );
  });

  function select(v: any) {
    setActiveVehicle({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      vin: v.vin ?? undefined,
      licensePlate: v.licensePlate ?? undefined,
      mileage: v.mileage ?? undefined,
      engineCode: v.engineCode ?? undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
          <Car className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-white flex-1">
            {isAr ? "اختر مركبة للعمل عليها" : "Select Active Vehicle"}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? "ابحث بالماركة أو الموديل أو اللوحة..." : "Search make, model, plate..."}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
              dir={dir}
            />
          </div>
        </div>

        {/* Vehicle List */}
        <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.03]">
          {filtered.slice(0, 20).map(v => {
            const color = getBrandColor(v.make);
            const code = getBrandCode(v.make);
            return (
              <button
                key={v.id}
                onClick={() => select(v)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
                  style={{ backgroundColor: color + "33", border: `1px solid ${color}44` }}
                >
                  <span style={{ color }}>{code}</span>
                </div>
                <div className="flex-1 min-w-0 text-left" dir="ltr">
                  <p className="text-sm font-semibold text-white truncate">
                    {v.year} {v.make} {v.model}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {v.licensePlate && (
                      <span className="text-[10px] font-mono text-slate-500 border border-white/10 px-1.5 py-0.5 rounded">
                        {v.licensePlate}
                      </span>
                    )}
                    {(v as any).mileage && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {(v as any).mileage.toLocaleString()} km
                      </span>
                    )}
                    {(v as any).engineCode && (
                      <span className="text-[10px] text-slate-600">{(v as any).engineCode}</span>
                    )}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-slate-700 hover:text-blue-400 transition-colors shrink-0" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              {isAr ? "لا توجد مركبات مطابقة" : "No vehicles found"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActiveVehicleBar() {
  const { lang, dir } = useI18n();
  const { activeVehicle, clearActiveVehicle } = useActiveVehicle();
  const [showSelector, setShowSelector] = useState(false);
  const isAr = lang === "ar";

  const color = activeVehicle ? getBrandColor(activeVehicle.make) : "#3B82F6";
  const code = activeVehicle ? getBrandCode(activeVehicle.make) : "??";

  return (
    <>
      <div className={cn(
        "h-9 shrink-0 flex items-center px-3 gap-3 bg-[#0a0f1a] border-b border-white/[0.05] select-none z-10",
        dir === "rtl" ? "flex-row-reverse" : ""
      )}>
        {/* Label */}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          {isAr ? "مركبة العمل:" : "Active Vehicle:"}
        </span>

        {activeVehicle ? (
          <>
            {/* Brand badge */}
            <div
              className="flex items-center justify-center w-6 h-6 rounded-lg text-[9px] font-black"
              style={{ backgroundColor: color + "28", border: `1px solid ${color}40`, color }}
            >
              {code}
            </div>

            {/* Vehicle info */}
            <button
              onClick={() => setShowSelector(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all",
                dir === "rtl" ? "flex-row-reverse" : ""
              )}
            >
              <span className="text-xs font-semibold text-white" dir="ltr">
                {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
              </span>
              {activeVehicle.licensePlate && (
                <span className="text-[10px] font-mono text-slate-500 border border-white/10 px-1.5 rounded hidden sm:inline">
                  {activeVehicle.licensePlate}
                </span>
              )}
              {activeVehicle.mileage && (
                <span className="text-[10px] text-slate-500 hidden md:inline">
                  {activeVehicle.mileage.toLocaleString()} km
                </span>
              )}
              {activeVehicle.engineCode && (
                <span className="text-[10px] text-slate-600 hidden lg:inline">
                  · {activeVehicle.engineCode}
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {/* VIN badge */}
            {activeVehicle.vin && (
              <span className="text-[10px] font-mono text-slate-600 hidden xl:inline">
                VIN: {activeVehicle.vin.slice(-8)}
              </span>
            )}

            {/* Status dot */}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isAr ? "جاهزة للفحص" : "Ready"}
            </div>

            {/* Clear */}
            <button
              onClick={clearActiveVehicle}
              className="ml-auto text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
              title={isAr ? "إلغاء تحديد المركبة" : "Clear vehicle"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowSelector(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-lg border border-dashed border-blue-500/30",
              "bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-xs font-medium transition-all",
              dir === "rtl" ? "flex-row-reverse" : ""
            )}
          >
            <Car className="w-3.5 h-3.5" />
            {isAr ? "اختر مركبة للعمل عليها" : "Select a vehicle to work on"}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        )}
      </div>

      {showSelector && <VehicleSelector onClose={() => setShowSelector(false)} />}
    </>
  );
}
