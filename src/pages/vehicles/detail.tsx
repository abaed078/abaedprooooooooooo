import { useParams, Link } from "wouter";
import { useGetVehicle, useListDiagnosticSessions, useListServiceResets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Car, Wrench, Search, CheckCircle2, AlertTriangle, ShieldAlert, Info, Clock, Settings2, Activity, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { VehicleTimeline } from "./timeline";
import { RecallsPanel } from "@/components/recalls-panel";

function TimelineEntry({ date, title, subtitle, icon, color }: {
  date: string | Date;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="flex-1 pb-6 border-b border-border/50 last:border-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {new Date(date).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = parseInt(id || "0", 10);
  const { lang } = useI18n();

  const { data: vehicle, isLoading: isVehicleLoading } = useGetVehicle(vehicleId, {
    query: { enabled: !!vehicleId, queryKey: ["/api/vehicles", vehicleId] }
  });

  const { data: sessions, isLoading: isSessionsLoading } = useListDiagnosticSessions({ vehicleId }, {
    query: { enabled: !!vehicleId, queryKey: ["/api/diagnostics/sessions", { vehicleId }] }
  });

  const { data: resets } = useListServiceResets({ vehicleId }, {
    query: { enabled: !!vehicleId, queryKey: ["/api/maintenance/resets", { vehicleId }] }
  });

  if (isVehicleLoading) return <div className="p-8 animate-pulse text-muted-foreground">Loading vehicle data...</div>;
  if (!vehicle) return <div className="p-8 text-red-500">Vehicle not found</div>;

  // Build unified timeline
  const timelineItems = [
    ...(sessions || []).map(s => ({
      date: s.startedAt,
      type: "scan" as const,
      title: lang === "ar" ? `فحص تشخيصي — ${s.dtcCount} أعطال` : `Diagnostic Scan — ${s.dtcCount} fault codes`,
      subtitle: lang === "ar" ? `${s.systemsScanned} نظام فُحص • ${s.status === "completed" ? "مكتمل" : s.status}` : `${s.systemsScanned} systems scanned • ${s.status}`,
      severity: (s.dtcCount || 0) > 3 ? "critical" : (s.dtcCount || 0) > 0 ? "warning" : "ok",
    })),
    ...(resets || []).map(r => ({
      date: r.performedAt,
      type: "reset" as const,
      title: lang === "ar" ? `إعادة ضبط الخدمة` : `Service Reset: ${r.resetType}`,
      subtitle: r.resetType,
      severity: "ok" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalDtcs   = sessions?.reduce((n, s) => n + (s.dtcCount || 0), 0) || 0;
  const criticalSessions = sessions?.filter(s => (s.dtcCount || 0) > 3).length || 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/vehicles">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full bg-secondary/50 hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Car className="w-8 h-8 text-primary" />
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-muted-foreground mt-1 font-mono">{vehicle.vin || (lang === "ar" ? "لا يوجد VIN" : "NO VIN")}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/diagnostics?vehicleId=${vehicle.id}`}>
            <Button data-testid="button-new-scan">
              <Search className="w-4 h-4 mr-2" />
              {lang === "ar" ? "فحص جديد" : "New Scan"}
            </Button>
          </Link>
          <Link href={`/maintenance?vehicleId=${vehicle.id}`}>
            <Button variant="secondary">
              <Wrench className="w-4 h-4 mr-2" />
              {lang === "ar" ? "الخدمات" : "Service"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: lang === "ar" ? "جلسات الفحص" : "Total Scans",   value: sessions?.length || 0, icon: <Activity className="w-4 h-4" />, color: "text-primary" },
          { label: lang === "ar" ? "إجمالي الأعطال" : "Total DTCs",  value: totalDtcs,              icon: <AlertTriangle className="w-4 h-4" />, color: "text-yellow-400" },
          { label: lang === "ar" ? "جلسات حرجة" : "Critical Sessions", value: criticalSessions,    icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-400" },
          { label: lang === "ar" ? "الخدمات" : "Service Resets",    value: resets?.length || 0,    icon: <Settings2 className="w-4 h-4" />, color: "text-green-400" },
        ].map((s, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm shadow-none">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <span className={s.color}>{s.icon}</span>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{lang === "ar" ? "بيانات المركبة" : "Vehicle Info"}</TabsTrigger>
          <TabsTrigger value="timeline">{lang === "ar" ? "الخط الزمني" : "Timeline"}</TabsTrigger>
          <TabsTrigger value="sessions">{lang === "ar" ? "الجلسات" : "Sessions"}</TabsTrigger>
          <TabsTrigger value="recalls" className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {lang === "ar" ? "الاستدعاءات" : "Recalls"}
            <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-[9px] font-black flex items-center justify-center">1</span>
          </TabsTrigger>
        </TabsList>

        {/* Vehicle Info Tab */}
        <TabsContent value="details">
          <Card className="bg-card/50 backdrop-blur-sm shadow-none">
            <CardContent className="p-6">
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
                {[
                  { label: lang === "ar" ? "الصانع" : "Make",         value: vehicle.make },
                  { label: lang === "ar" ? "الموديل" : "Model",        value: vehicle.model },
                  { label: lang === "ar" ? "السنة" : "Year",           value: vehicle.year },
                  { label: lang === "ar" ? "المحرك" : "Engine",        value: vehicle.engineType || "-" },
                  { label: lang === "ar" ? "عداد المسافة" : "Odometer", value: vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : "-" },
                  { label: lang === "ar" ? "رقم اللوحة" : "Plate",     value: vehicle.licensePlate || "-" },
                  { label: "VIN",                                        value: vehicle.vin || "-", mono: true },
                  { label: lang === "ar" ? "اللون" : "Color",           value: vehicle.color || "-" },
                  { label: lang === "ar" ? "آخر فحص" : "Last Scanned", value: vehicle.lastDiagnosed ? new Date(vehicle.lastDiagnosed).toLocaleDateString() : (lang === "ar" ? "لم يُفحص" : "Never") },
                ].map((item, i) => (
                  <div key={i}>
                    <dt className="text-muted-foreground uppercase text-xs tracking-wider font-semibold mb-1">{item.label}</dt>
                    <dd className={`font-medium text-base ${(item as any).mono ? "font-mono text-sm" : ""}`}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab — enhanced */}
        <TabsContent value="timeline">
          <Card className="bg-card/50 backdrop-blur-sm shadow-none">
            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
              <VehicleTimeline vehicleId={String(vehicleId)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recalls Tab */}
        <TabsContent value="recalls">
          <Card className="bg-card/50 backdrop-blur-sm shadow-none">
            <CardContent className="p-5">
              <RecallsPanel
                make={vehicle.make}
                model={vehicle.model}
                year={String(vehicle.year)}
                vin={vehicle.vin || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card className="bg-card/50 backdrop-blur-sm shadow-none">
            <CardContent className="p-4">
              {isSessionsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-card rounded-lg" />)}</div>
              ) : sessions?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>{lang === "ar" ? "لا توجد جلسات فحص بعد" : "No diagnostic sessions yet"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions?.map(session => (
                    <Link key={session.id} href={`/diagnostics/${session.id}`}>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            session.status === "completed" ? ((session.dtcCount ?? 0) > 0 ? "bg-red-500" : "bg-green-500") : "bg-yellow-500 animate-pulse"
                          }`} />
                          <div>
                            <p className="font-medium text-sm">{new Date(session.startedAt).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{session.systemsScanned} {lang === "ar" ? "نظام فُحص" : "systems"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(session.dtcCount ?? 0) > 0 ? (
                            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{session.dtcCount} DTCs</span>
                          ) : (
                            <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{lang === "ar" ? "سليم" : "Clean"}</span>
                          )}
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
