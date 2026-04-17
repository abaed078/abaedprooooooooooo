import { useState } from "react";
import { decodeVin, type VinInfo } from "@/lib/vin-decoder";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Car, Cpu, Fuel, Shield, Globe, Factory,
  AlertTriangle, CheckCircle2, Loader2, Copy, QrCode,
  ClipboardList, Hash, Zap, Activity, Info
} from "lucide-react";

const SAMPLE_VINS = [
  { vin: "1HGBH41JXMN109186", label: "Honda Civic 2021"   },
  { vin: "2T1BURHE0JC070233", label: "Toyota Corolla 2018" },
  { vin: "WBA3A5C50CF256666", label: "BMW 3 Series 2012"   },
  { vin: "1G1YY2D74K5109822", label: "Chevrolet Corvette"  },
];

function InfoCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value?: string; accent?: string;
}) {
  if (!value || value === "Not Applicable" || value === "0") return null;
  return (
    <div className={`p-3.5 rounded-xl border bg-card flex items-start gap-3 transition-all hover:border-white/20 ${accent || "border-border"}`}>
      <div className="w-9 h-9 rounded-lg bg-black/30 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-sm font-bold text-foreground leading-tight">{value}</div>
      </div>
    </div>
  );
}

function RecallsPanel({ make, model, year }: { make: string; model: string; year: string }) {
  const [recalls, setRecalls] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRecalls = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`
      );
      const data = await res.json();
      setRecalls(data.results || []);
    } catch {
      setRecalls([]);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-orange-400">استدعاءات NHTSA</span>
          {recalls !== null && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${recalls.length > 0 ? "bg-orange-500/20 text-orange-300" : "bg-green-500/20 text-green-300"}`}>
              {recalls.length > 0 ? `${recalls.length} استدعاء` : "لا يوجد"}
            </span>
          )}
        </div>
        {!fetched && (
          <Button size="sm" variant="outline" onClick={fetchRecalls} disabled={loading}
            className="text-[11px] h-7 border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "فحص الاستدعاءات"}
          </Button>
        )}
      </div>
      {recalls === null && (
        <p className="text-xs text-muted-foreground">اضغط لجلب سجل الاستدعاءات الرسمي من قاعدة بيانات NHTSA الأمريكية.</p>
      )}
      {recalls !== null && recalls.length === 0 && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" /> لا توجد استدعاءات مسجلة لهذه المركبة
        </div>
      )}
      {recalls !== null && recalls.length > 0 && (
        <div className="space-y-2">
          {recalls.slice(0, 5).map((r: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs font-bold text-orange-300">{r.Component}</p>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.Summary || r.Consequence}</p>
              <p className="text-[10px] text-orange-400/60 mt-1">رقم الحملة: {r.NHTSACampaignNumber}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VinVisual({ vin }: { vin: string }) {
  const segments = [
    { chars: vin.slice(0, 3),  label: "WMI",   labelAr: "رمز المصنّع", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30"   },
    { chars: vin.slice(3, 8),  label: "VDS",   labelAr: "وصف المركبة", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30"  },
    { chars: vin.slice(8, 9),  label: "Check", labelAr: "رقم التحقق",  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    { chars: vin.slice(9, 10), label: "Year",  labelAr: "سنة الصنع",   color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    { chars: vin.slice(10, 11),label: "Plant",  labelAr: "مصنع الإنتاج",color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
    { chars: vin.slice(11),    label: "Seq",   labelAr: "رقم التسلسل", color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30"   },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 items-end justify-center py-3">
      {segments.map((seg) => (
        <div key={seg.label} className="flex flex-col items-center gap-1">
          <div className={`px-3 py-2 rounded-lg border ${seg.bg} ${seg.border} font-mono font-black text-lg ${seg.color} tracking-widest`}>
            {seg.chars}
          </div>
          <div className="text-[9px] text-muted-foreground font-semibold">{seg.label}</div>
          <div className="text-[9px] text-muted-foreground/60">{seg.labelAr}</div>
        </div>
      ))}
    </div>
  );
}

export default function VinDecoderPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<VinInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDecode = async (v?: string) => {
    const target = (v ?? vin).trim().toUpperCase();
    if (target.length !== 17) { setError(isAr ? "VIN يجب أن يكون 17 حرفاً بالضبط" : "VIN must be exactly 17 characters"); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const info = await decodeVin(target);
      setResult(info);
      if (v) setVin(v);
    } catch (e: any) {
      setError(isAr ? "فشل جلب البيانات — تحقق من الاتصال بالإنترنت" : `Decode failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyVin = () => {
    navigator.clipboard.writeText(result!.vin);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
          <Hash className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">فك تشفير VIN</h1>
          <p className="text-sm text-muted-foreground">رقم تعريف المركبة — 17 خانة بمعلومات كاملة + استدعاءات NHTSA</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              dir="ltr"
              value={vin}
              onChange={e => { setVin(e.target.value.toUpperCase().slice(0, 17)); setError(""); }}
              placeholder="أدخل رقم VIN (17 خانة) — مثال: 1HGBH41JXMN109186"
              className="pr-10 font-mono tracking-widest text-center text-base h-12 bg-card"
              onKeyDown={e => e.key === "Enter" && handleDecode()}
              maxLength={17}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-muted-foreground/50">
              {vin.length}/17
            </div>
          </div>
          <Button onClick={() => handleDecode()} disabled={loading || vin.length !== 17}
            className="h-12 px-6 font-bold text-sm bg-blue-600 hover:bg-blue-500">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1.5" />فك التشفير</>}
          </Button>
        </div>
        {error && (
          <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Sample VINs */}
      <div>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">أمثلة VIN للتجربة</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_VINS.map(s => (
            <button key={s.vin} onClick={() => handleDecode(s.vin)}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:text-primary transition-all font-mono">
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          {/* VIN Visual breakdown */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">تحليل بنية VIN</span>
              <button onClick={copyVin}
                className="flex items-center gap-1.5 text-[11px] text-primary hover:underline font-semibold">
                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "تم النسخ" : "نسخ VIN"}
              </button>
            </div>
            <VinVisual vin={result.vin} />
          </div>

          {/* Main Info */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-green-400">تم التحقق من البيانات بنجاح</span>
              <span className="mr-auto text-[10px] text-muted-foreground font-mono">{result.vin}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <InfoCard icon={<Car className="w-4 h-4 text-blue-400" />}    label="الشركة المصنّعة" value={result.make}            accent="border-blue-500/20"   />
              <InfoCard icon={<Car className="w-4 h-4 text-green-400" />}   label="الطراز"          value={result.model}           accent="border-green-500/20"  />
              <InfoCard icon={<Activity className="w-4 h-4 text-yellow-400" />} label="سنة الصنع"   value={result.modelYear}       accent="border-yellow-500/20" />
              <InfoCard icon={<Factory className="w-4 h-4 text-purple-400" />}  label="المصنّع"     value={result.manufacturer}    accent="border-purple-500/20" />
              <InfoCard icon={<Globe className="w-4 h-4 text-cyan-400" />}   label="بلد الإنتاج"    value={result.plantCountry}    accent="border-cyan-500/20"   />
              <InfoCard icon={<Shield className="w-4 h-4 text-orange-400" />} label="هيكل السيارة"  value={result.bodyClass}       accent="border-orange-500/20" />
              <InfoCard icon={<Cpu className="w-4 h-4 text-red-400" />}     label="نوع المحرك"      value={result.engineType}      accent="border-red-500/20"    />
              <InfoCard icon={<Fuel className="w-4 h-4 text-lime-400" />}   label="نوع الوقود"      value={result.fuelType}        accent="border-lime-500/20"   />
              <InfoCard icon={<Zap className="w-4 h-4 text-indigo-400" />}  label="نوع الدفع"       value={result.driveType}       accent="border-indigo-500/20" />
              <InfoCard icon={<ClipboardList className="w-4 h-4 text-teal-400" />} label="ناقل الحركة" value={result.transmissionStyle} accent="border-teal-500/20" />
            </div>
          </div>

          {/* NHTSA Recalls */}
          {result.make && result.model && result.modelYear && (
            <RecallsPanel make={result.make} model={result.model} year={result.modelYear} />
          )}

          {/* Info note */}
          <div className="p-3 rounded-xl border border-blue-500/15 bg-blue-500/5 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-400/80">
              البيانات مصدرها قاعدة بيانات NHTSA الرسمية عبر API مفتوح. يمكن إضافة هذه المركبة مباشرة لقائمة مركباتك من صفحة المركبات.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
