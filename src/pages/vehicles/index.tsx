import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListVehicles, useCreateVehicle, useDeleteVehicle, getListVehiclesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Car, Search, Plus, Trash2, ScanLine, Loader2, ChevronUp, ChevronDown,
  ChevronsUpDown, Activity, Filter, LayoutList, LayoutGrid, Eye,
  ShieldCheck, ShieldAlert, Shield, Gauge, Calendar, Hash, Zap,
  FileText, RefreshCw, MoreHorizontal, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  odometer: z.coerce.number().optional(),
  engineType: z.string().optional(),
  color: z.string().optional(),
});

const BRAND_COLORS: Record<string, string> = {
  Toyota: "#EB0A1E", Lexus: "#1E1E2E", BMW: "#1C69D4", Mercedes: "#000000",
  "Mercedes-Benz": "#000000", Audi: "#C0084A", Porsche: "#8B1A1A",
  Nissan: "#C3002F", Honda: "#CC0000", Ford: "#003478", Chevrolet: "#D4AF37",
  Dodge: "#CC0000", Tesla: "#CC0000", Maserati: "#1B4F72", Land: "#005A2B",
  "Land Rover": "#005A2B", Hyundai: "#002C5F", Kia: "#05141F",
};

const MAKE_ABBREV: Record<string, string> = {
  Toyota: "TYT", Lexus: "LEX", BMW: "BMW", "Mercedes-Benz": "MBZ",
  Mercedes: "MBZ", Audi: "AUD", Porsche: "POR", Nissan: "NIS",
  Honda: "HON", Ford: "FRD", Chevrolet: "CHV", Dodge: "DDG",
  Tesla: "TSL", Maserati: "MAS", "Land Rover": "LR", Hyundai: "HYN",
  Kia: "KIA", Volkswagen: "VWG", Jeep: "JEP",
};

function getBrandColor(make: string) {
  return BRAND_COLORS[make] || "#3b82f6";
}

function getBrandAbbr(make: string) {
  return MAKE_ABBREV[make] || make.slice(0, 3).toUpperCase();
}

function getHealthInfo(lastDiagnosed: string | null | undefined, now: number) {
  if (!lastDiagnosed) return { label: "لم يُفحص", labelEn: "Not Scanned", color: "text-slate-400", bg: "bg-slate-400/10", icon: Shield, dot: "bg-slate-400" };
  const days = Math.floor((now - new Date(lastDiagnosed).getTime()) / 86400000);
  if (days <= 7) return { label: "ممتاز", labelEn: "Excellent", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: ShieldCheck, dot: "bg-emerald-400", days };
  if (days <= 30) return { label: `منذ ${days}ي`, labelEn: `${days}d ago`, color: "text-amber-400", bg: "bg-amber-400/10", icon: Shield, dot: "bg-amber-400", days };
  return { label: "يحتاج فحصاً", labelEn: "Overdue", color: "text-red-400", bg: "bg-red-400/10", icon: ShieldAlert, dot: "bg-red-400", days };
}

type SortKey = "make" | "year" | "odometer" | "lastDiagnosed" | "licensePlate";

const SortIcon = ({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) => {
  if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
};

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [filterMake, setFilterMake] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "scanned" | "overdue" | "never">("all");
  const [sortKey, setSortKey] = useState<SortKey>("make");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, lang } = useI18n();

  const [now] = useState(() => Date.now());

  const { data: vehicles, isLoading, refetch } = useListVehicles();
  const createVehicle = useCreateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { make: "", model: "", year: new Date().getFullYear() },
  });

  const decodeVin = async () => {
    const vin = form.getValues("vin");
    if (!vin || vin.length !== 17) { toast({ title: "VIN يجب أن يكون 17 حرفاً", variant: "destructive" }); return; }
    setVinDecoding(true);
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
      const json = await res.json();
      const result = json.Results?.[0];
      if (result) {
        const make = result.Make || ""; const model = result.Model || "";
        const year = parseInt(result.ModelYear) || form.getValues("year");
        const engine = [result.DisplacementL ? `${parseFloat(result.DisplacementL).toFixed(1)}L` : "", result.FuelTypePrimary || "", result.EngineCylinders ? `${result.EngineCylinders}-cyl` : ""].filter(Boolean).join(" ");
        if (make) form.setValue("make", make, { shouldValidate: true });
        if (model) form.setValue("model", model, { shouldValidate: true });
        if (year) form.setValue("year", year, { shouldValidate: true });
        if (engine) form.setValue("engineType", engine);
        toast({ title: `✓ تم فك تشفير VIN: ${year} ${make} ${model}` });
      } else { toast({ title: "رقم VIN غير صالح", variant: "destructive" }); }
    } catch { toast({ title: "فشل الاتصال بخدمة VIN", variant: "destructive" }); }
    finally { setVinDecoding(false); }
  };

  const onSubmit = (data: z.infer<typeof vehicleSchema>) => {
    createVehicle.mutate({ data }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }); setIsAddOpen(false); form.reset(); toast({ title: "✓ تمت إضافة المركبة" }); },
      onError: () => toast({ title: "فشل الحفظ", variant: "destructive" })
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تريد حذف هذه المركبة؟")) return;
    deleteVehicle.mutate({ id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }); if (selectedId === id) setSelectedId(null); toast({ title: "تم حذف المركبة" }); }
    });
  };

  // Unique makes for filter
  const makes = useMemo(() => {
    if (!vehicles) return [];
    return Array.from(new Set(vehicles.map(v => v.make))).sort();
  }, [vehicles]);

  const filtered = useMemo(() => {
    if (!vehicles) return [];
    let list = vehicles.filter(v => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.vin || "").toLowerCase().includes(q) ||
        (v.licensePlate || "").toLowerCase().includes(q);
      const matchMake = filterMake === "all" || v.make === filterMake;
      const health = getHealthInfo(v.lastDiagnosed, now);
      const matchStatus =
        filterStatus === "all" ? true :
        filterStatus === "scanned" ? (health.days !== undefined && health.days <= 7) :
        filterStatus === "overdue" ? (health.days !== undefined && health.days > 30) :
        !v.lastDiagnosed;
      return matchSearch && matchMake && matchStatus;
    });
    list = list.sort((a, b) => {
      let va: string | number = 0, vb: string | number = 0;
      if (sortKey === "make") { va = `${a.make} ${a.model}`; vb = `${b.make} ${b.model}`; }
      else if (sortKey === "year") { va = a.year; vb = b.year; }
      else if (sortKey === "odometer") { va = a.odometer || 0; vb = b.odometer || 0; }
      else if (sortKey === "lastDiagnosed") { va = a.lastDiagnosed ? new Date(a.lastDiagnosed).getTime() : 0; vb = b.lastDiagnosed ? new Date(b.lastDiagnosed).getTime() : 0; }
      else if (sortKey === "licensePlate") { va = a.licensePlate || ""; vb = b.licensePlate || ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [vehicles, search, filterMake, filterStatus, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = vehicles?.find(v => v.id === selectedId);

  const stats = useMemo(() => {
    if (!vehicles) return { total: 0, scanned: 0, overdue: 0, never: 0 };
    const total = vehicles.length;
    const scanned = vehicles.filter(v => v.lastDiagnosed && (now - new Date(v.lastDiagnosed).getTime()) < 7 * 86400000).length;
    const never = vehicles.filter(v => !v.lastDiagnosed).length;
    const overdue = vehicles.filter(v => v.lastDiagnosed && (now - new Date(v.lastDiagnosed).getTime()) > 30 * 86400000).length;
    return { total, scanned, overdue, never };
  }, [vehicles, now]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const sideStats = useMemo(() => {
    if (!selected) return [];
    return [
      { icon: Hash, label: lang === "ar" ? "اللوحة" : "Plate", val: selected.licensePlate || "—" },
      { icon: Gauge, label: lang === "ar" ? "العداد" : "Odometer", val: selected.odometer ? `${selected.odometer.toLocaleString()} km` : "—" },
      { icon: Zap, label: lang === "ar" ? "المحرك" : "Engine", val: selected.engineType || "—" },
      { icon: Calendar, label: lang === "ar" ? "آخر فحص" : "Last Scan", val: selected.lastDiagnosed ? new Date(selected.lastDiagnosed).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US") : "—" },
    ];
  }, [selected, lang]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0c10]">

      {/* ── TOP HEADER ── */}
      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center gap-4 bg-[#0d1117]">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold tracking-wide text-white/90">
              {lang === "ar" ? "إدارة قائمة المركبات" : "Vehicle Fleet Manager"}
            </span>
            <span className="ml-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono font-bold">
              {stats.total} {lang === "ar" ? "مركبة" : "vehicles"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-md p-0.5">
            <Button variant="ghost" size="icon" className={`h-7 w-7 ${viewMode === "table" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`} onClick={() => setViewMode("table")}>
              <LayoutList className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={`h-7 w-7 ${viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`} onClick={() => setViewMode("grid")}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold" data-testid="button-add-vehicle">
                <Plus className="w-3.5 h-3.5" />
                {lang === "ar" ? "إضافة مركبة" : "Add Vehicle"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0d1117] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">{lang === "ar" ? "تسجيل مركبة جديدة" : "Register New Vehicle"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="vin" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">VIN — رقم الهيكل (17 خانة)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input {...field} placeholder="1HGCM82633A004352" className="font-mono uppercase bg-white/[0.04] border-white/10" maxLength={17} data-testid="input-vehicle-vin" /></FormControl>
                        <Button type="button" variant="secondary" onClick={decodeVin} disabled={vinDecoding} className="shrink-0 gap-1.5 text-xs">
                          {vinDecoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                          {lang === "ar" ? "فك التشفير" : "Decode"}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "make" as const, label: "الماركة / Make" },
                      { name: "model" as const, label: "الموديل / Model" },
                    ].map(f => (
                      <FormField key={f.name} control={form.control} name={f.name} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs text-muted-foreground">{f.label}</FormLabel><FormControl><Input {...field} className="bg-white/[0.04] border-white/10" data-testid={`input-vehicle-${f.name}`} /></FormControl><FormMessage /></FormItem>
                      )} />
                    ))}
                    <FormField control={form.control} name="year" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-muted-foreground">السنة / Year</FormLabel><FormControl><Input type="number" {...field} className="bg-white/[0.04] border-white/10" data-testid="input-vehicle-year" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="engineType" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-muted-foreground">المحرك / Engine</FormLabel><FormControl><Input {...field} placeholder="3.5L V6 Twin Turbo" className="bg-white/[0.04] border-white/10" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="licensePlate" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-muted-foreground">اللوحة / Plate</FormLabel><FormControl><Input {...field} className="bg-white/[0.04] border-white/10 uppercase" data-testid="input-vehicle-plate" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="odometer" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs text-muted-foreground">العداد (كم) / ODO</FormLabel><FormControl><Input type="number" {...field} className="bg-white/[0.04] border-white/10" data-testid="input-vehicle-odo" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={createVehicle.isPending} data-testid="button-submit-vehicle" className="w-full mt-2">
                    {createVehicle.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />جاري الحفظ...</> : "حفظ المركبة"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="shrink-0 grid grid-cols-4 divide-x divide-white/[0.06] border-b border-white/[0.06] bg-[#0d1117]">
        {[
          { label: lang === "ar" ? "إجمالي المركبات" : "Total Fleet", val: stats.total, icon: Car, color: "text-blue-400", filter: "all" },
          { label: lang === "ar" ? "حديثة الفحص" : "Recently Scanned", val: stats.scanned, icon: CheckCircle2, color: "text-emerald-400", filter: "scanned" },
          { label: lang === "ar" ? "تحتاج صيانة" : "Needs Service", val: stats.overdue, icon: AlertCircle, color: "text-amber-400", filter: "overdue" },
          { label: lang === "ar" ? "لم تُفحص بعد" : "Never Scanned", val: stats.never, icon: Clock, color: "text-slate-400", filter: "never" },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => { setFilterStatus(s.filter as typeof filterStatus); setPage(1); }}
            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-all text-left ${filterStatus === s.filter ? "bg-white/[0.04]" : ""}`}
          >
            <s.icon className={`w-4 h-4 ${s.color} shrink-0`} />
            <div>
              <div className={`text-xl font-bold font-mono ${filterStatus === s.filter ? s.color : "text-white"}`}>{s.val}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
            </div>
            {filterStatus === s.filter && <div className="ml-auto w-1 h-6 rounded-full bg-current opacity-50" style={{ color: s.color.replace("text-", "") }} />}
          </button>
        ))}
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-[#0d1117]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={lang === "ar" ? "بحث بالماركة، الموديل، VIN، اللوحة..." : "Search make, model, VIN, plate..."}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-xs bg-white/[0.04] border-white/10 focus-visible:ring-primary/50"
            data-testid="input-search-vehicles"
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-muted-foreground ml-2" />
          <span className="text-[10px] text-muted-foreground mr-1">{lang === "ar" ? "ماركة:" : "Brand:"}</span>
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => { setFilterMake("all"); setPage(1); }}
              className={`shrink-0 px-2.5 py-1 text-[10px] rounded font-medium transition-all border ${filterMake === "all" ? "bg-primary/20 text-primary border-primary/40" : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white/70"}`}
            >
              {lang === "ar" ? "الكل" : "All"} ({stats.total})
            </button>
            {makes.slice(0, 8).map(make => {
              const cnt = vehicles?.filter(v => v.make === make).length || 0;
              const color = getBrandColor(make);
              return (
                <button
                  key={make}
                  onClick={() => { setFilterMake(make); setPage(1); }}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] rounded font-medium transition-all border ${filterMake === make ? "border-white/30 text-white" : "border-white/10 text-muted-foreground hover:border-white/20"}`}
                  style={filterMake === make ? { backgroundColor: color + "22", borderColor: color + "66", color } : {}}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {make} <span className="opacity-60">({cnt})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ml-auto text-[10px] text-muted-foreground shrink-0">
          {filtered.length > 0 && `${filtered.length} ${lang === "ar" ? "نتيجة" : "results"}`}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-hidden flex">

        {/* List/Table */}
        <div className={`flex-1 overflow-auto ${selectedId ? "border-r border-white/[0.06]" : ""}`}>
          {isLoading ? (
            <div className="p-6 space-y-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          ) : viewMode === "table" ? (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#111418] border-b border-white/[0.06]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-8">#</th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("make")} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors">
                      {lang === "ar" ? "المركبة" : "Vehicle"} <SortIcon k="make" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("year")} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors">
                      {lang === "ar" ? "السنة" : "Year"} <SortIcon k="year" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">VIN</th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("licensePlate")} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors">
                      {lang === "ar" ? "اللوحة" : "Plate"} <SortIcon k="licensePlate" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("odometer")} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors">
                      {lang === "ar" ? "العداد" : "Mileage"} <SortIcon k="odometer" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    {lang === "ar" ? "المحرك" : "Engine"}
                  </th>
                  <th className="px-3 py-2 text-center">
                    <button onClick={() => toggleSort("lastDiagnosed")} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors mx-auto">
                      {lang === "ar" ? "الحالة" : "Status"} <SortIcon k="lastDiagnosed" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {lang === "ar" ? "إجراء" : "Action"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((v, idx) => {
                  const health = getHealthInfo(v.lastDiagnosed, now);
                  const isSelected = selectedId === v.id;
                  const brandColor = getBrandColor(v.make);
                  const abbr = getBrandAbbr(v.make);
                  const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedId(isSelected ? null : v.id)}
                      data-testid={`card-vehicle-${v.id}`}
                      className={`border-b border-white/[0.04] cursor-pointer transition-all group
                        ${isSelected ? "bg-primary/[0.08] border-primary/20" : "hover:bg-white/[0.025]"}`}
                    >
                      {/* Row # */}
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-[10px]">{globalIdx.toString().padStart(2, "0")}</td>

                      {/* Brand + Name */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-[9px] shrink-0 border border-white/10"
                            style={{ backgroundColor: brandColor + "33", borderColor: brandColor + "55", color: brandColor }}
                          >
                            {abbr}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-xs leading-tight truncate">{v.make} {v.model}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight">{v.engineType || "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Year */}
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[11px] text-white/80">{v.year}</span>
                      </td>

                      {/* VIN */}
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{v.vin || "—"}</span>
                      </td>

                      {/* Plate */}
                      <td className="px-3 py-2.5">
                        {v.licensePlate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/20 bg-white/[0.04] font-mono text-[10px] text-white/80 uppercase">
                            {v.licensePlate}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>

                      {/* Odometer */}
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[11px] text-white/80">
                          {v.odometer ? `${v.odometer.toLocaleString()}` : "—"}
                        </span>
                        {v.odometer && <span className="text-[9px] text-muted-foreground ml-0.5">km</span>}
                      </td>

                      {/* Engine */}
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span className="text-[10px] text-muted-foreground">{v.engineType || "—"}</span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${health.color} ${health.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${health.dot} animate-pulse`} />
                          {lang === "ar" ? health.label : health.labelEn}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/diagnostics?vehicleId=${v.id}`} onClick={e => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10" title="Start Scan" data-testid={`button-scan-${v.id}`}>
                              <ScanLine className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-white" title="View Details" onClick={() => setSelectedId(isSelected ? null : v.id)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-400/10" title="Delete" onClick={e => handleDelete(v.id, e)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* GRID MODE */
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {paginated.map(v => {
                const health = getHealthInfo(v.lastDiagnosed, now);
                const brandColor = getBrandColor(v.make);
                const abbr = getBrandAbbr(v.make);
                const isSelected = selectedId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedId(isSelected ? null : v.id)}
                    data-testid={`card-vehicle-${v.id}`}
                    className={`group relative cursor-pointer rounded-lg border transition-all overflow-hidden
                      ${isSelected ? "border-primary/50 shadow-lg shadow-primary/10" : "border-white/[0.08] hover:border-white/20"}`}
                    style={{ background: isSelected ? `linear-gradient(135deg, ${brandColor}22, #0d1117)` : "#111418" }}
                  >
                    {/* Brand header */}
                    <div className="px-3 pt-3 pb-2 flex items-start justify-between">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-xs border"
                        style={{ backgroundColor: brandColor + "33", borderColor: brandColor + "55", color: brandColor }}
                      >
                        {abbr}
                      </div>
                      <div className={`w-2 h-2 rounded-full mt-1 ${health.dot}`} />
                    </div>
                    {/* Info */}
                    <div className="px-3 pb-2">
                      <div className="text-xs font-bold text-white leading-tight">{v.make}</div>
                      <div className="text-xs text-white/60 leading-tight">{v.model}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{v.year}</div>
                    </div>
                    {/* Bottom bar */}
                    <div className="px-3 pb-3 flex items-center justify-between">
                      {v.licensePlate ? (
                        <span className="font-mono text-[9px] text-white/50 border border-white/10 px-1.5 py-0.5 rounded uppercase">{v.licensePlate}</span>
                      ) : <span className="text-[10px] text-muted-foreground">{v.odometer ? `${(v.odometer / 1000).toFixed(0)}k km` : "—"}</span>}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/diagnostics?vehicleId=${v.id}`} onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" data-testid={`button-scan-${v.id}`}>
                            <ScanLine className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length === 0 && !isLoading && (
            <div className="py-20 text-center text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-10" />
              <p className="text-sm">{lang === "ar" ? "لا توجد مركبات مطابقة" : "No matching vehicles"}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0d1117] px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {lang === "ar"
                  ? `عرض ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} من ${filtered.length}`
                  : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  {lang === "ar" ? "السابق" : "Prev"}
                </Button>
                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                  const p = i + 1;
                  return (
                    <Button key={p} variant="ghost" size="sm" className={`h-7 w-7 p-0 text-[11px] font-mono ${page === p ? "bg-primary/20 text-primary" : "text-muted-foreground"}`} onClick={() => setPage(p)}>
                      {p}
                    </Button>
                  );
                })}
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  {lang === "ar" ? "التالي" : "Next"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDE PANEL (Vehicle Details) ── */}
        {selected && (
          <div className="w-72 shrink-0 bg-[#0d1117] overflow-y-auto">
            {(() => {
              const health = getHealthInfo(selected.lastDiagnosed, now);
              const brandColor = getBrandColor(selected.make);
              const abbr = getBrandAbbr(selected.make);
              return (
                <>
                  {/* Panel header */}
                  <div className="p-4 border-b border-white/[0.06]" style={{ background: `linear-gradient(135deg, ${brandColor}22, transparent)` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border-2"
                        style={{ backgroundColor: brandColor + "33", borderColor: brandColor + "66", color: brandColor }}>
                        {abbr}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{selected.make} {selected.model}</div>
                        <div className="text-xs text-muted-foreground">{selected.year} • {selected.engineType || "—"}</div>
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${health.color} ${health.bg}`}>
                      <div className={`w-2 h-2 rounded-full ${health.dot}`} />
                      {lang === "ar" ? health.label : health.labelEn}
                    </div>
                  </div>

                  {/* VIN */}
                  <div className="p-4 border-b border-white/[0.06]">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{lang === "ar" ? "رقم الهيكل" : "VIN"}</div>
                    <div className="font-mono text-xs text-white/80 break-all">{selected.vin || (lang === "ar" ? "غير مسجل" : "Not Registered")}</div>
                  </div>

                  {/* Stats grid */}
                  <div className="p-4 grid grid-cols-2 gap-3 border-b border-white/[0.06]">
                    {sideStats.map((s, i) => (
                      <div key={i} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <s.icon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{s.label}</span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate">{s.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="p-4 space-y-2">
                    <Link href={`/diagnostics?vehicleId=${selected.id}`}>
                      <Button className="w-full gap-2 text-xs" size="sm" data-testid={`button-scan-${selected.id}`}>
                        <ScanLine className="w-3.5 h-3.5" />
                        {lang === "ar" ? "بدء فحص شامل" : "Start Full Scan"}
                      </Button>
                    </Link>
                    <Link href={`/vehicles/${selected.id}`}>
                      <Button variant="secondary" className="w-full gap-2 text-xs mt-2" size="sm">
                        <Activity className="w-3.5 h-3.5" />
                        {lang === "ar" ? "سجل الفحوصات" : "Diagnostic History"}
                      </Button>
                    </Link>
                    <Link href={`/maintenance?vehicleId=${selected.id}`}>
                      <Button variant="outline" className="w-full gap-2 text-xs mt-1 border-white/10" size="sm">
                        <FileText className="w-3.5 h-3.5" />
                        {lang === "ar" ? "إعادة الضبط والصيانة" : "Service Resets"}
                      </Button>
                    </Link>
                    <Button variant="ghost" className="w-full gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-1" size="sm"
                      onClick={e => handleDelete(selected.id, e)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      {lang === "ar" ? "حذف المركبة" : "Delete Vehicle"}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
