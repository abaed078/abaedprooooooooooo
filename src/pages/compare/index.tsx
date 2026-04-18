import { useState } from "react";
import { useListVehicles, useListDiagnosticSessions, useListDtcCodes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Car, AlertTriangle, ShieldAlert, CheckCircle2, Activity } from "lucide-react";
import { useI18n } from "@/lib/i18n";

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "critical" ? "bg-red-500/20 text-red-400 border-red-500/40" :
    severity === "warning"  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" :
    "bg-blue-500/20 text-blue-400 border-blue-500/40";
  const icon = severity === "critical" ? <ShieldAlert className="w-3 h-3" /> : severity === "warning" ? <AlertTriangle className="w-3 h-3" /> : null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold uppercase ${cls}`}>
      {icon}{severity}
    </span>
  );
}

function VehicleColumn({ vehicleId, sessionId }: { vehicleId: number; sessionId: number }) {
  const { data: vehicles } = useListVehicles();
  const { data: sessions } = useListDiagnosticSessions({ vehicleId });
  const { data: dtcCodes } = useListDtcCodes({ sessionId }, { query: { enabled: !!sessionId } } as any);

  const vehicle = vehicles?.find(v => v.id === vehicleId);
  const session = sessions?.find(s => s.id === sessionId);
  if (!vehicle) return <div className="text-muted-foreground text-center p-8">No vehicle selected</div>;

  const critical = dtcCodes?.filter(c => c.severity === "critical").length || 0;
  const warnings = dtcCodes?.filter(c => c.severity === "warning").length || 0;
  const healthy = !dtcCodes || dtcCodes.length === 0;

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl border-2 ${healthy ? "border-green-500/40 bg-green-500/5" : critical > 0 ? "border-red-500/40 bg-red-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-full ${healthy ? "bg-green-500/20" : critical > 0 ? "bg-red-500/20" : "bg-yellow-500/20"}`}>
            {healthy ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : critical > 0 ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-yellow-400" />}
          </div>
          <div>
            <p className="font-bold text-lg">{vehicle.year} {vehicle.make} {vehicle.model}</p>
            <p className="text-xs text-muted-foreground font-mono">{vehicle.vin || "No VIN"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-red-400">{critical}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-400">{warnings}</p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </div>
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold">{dtcCodes?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total DTCs</p>
          </div>
        </div>
      </div>

      {session && (
        <div className="text-xs text-muted-foreground flex items-center gap-2 px-1">
          <Activity className="w-3 h-3" />
          Session: {new Date(session.startedAt).toLocaleDateString()} — {session.systemsScanned} systems scanned
        </div>
      )}

      <div className="space-y-2">
        {dtcCodes && dtcCodes.length > 0 ? dtcCodes.map(code => (
          <div key={code.id} className="flex items-start justify-between gap-2 p-3 rounded-lg bg-card/60 border border-border">
            <div className="min-w-0">
              <span className="font-mono font-bold text-sm text-primary">{code.code}</span>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{code.description}</p>
            </div>
            <SeverityBadge severity={code.severity} />
          </div>
        )) : (
          <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-60" />
            <p className="text-sm font-medium">No fault codes</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Compare() {
  const { lang } = useI18n();
  const { data: vehicles } = useListVehicles();

  const [v1Id, setV1Id] = useState<number>(0);
  const [v2Id, setV2Id] = useState<number>(0);
  const [s1Id, setS1Id] = useState<number>(0);
  const [s2Id, setS2Id] = useState<number>(0);

  const { data: sessions1 } = useListDiagnosticSessions({ vehicleId: v1Id }, { query: { enabled: !!v1Id } } as any);
  const { data: sessions2 } = useListDiagnosticSessions({ vehicleId: v2Id }, { query: { enabled: !!v2Id } } as any);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <GitCompare className="w-8 h-8 text-primary" />
          {lang === "ar" ? "مقارنة التشخيص" : "Diagnostic Comparison"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {lang === "ar" ? "قارن نتائج التشخيص بين مركبتين" : "Compare diagnostic results between two vehicles side by side"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Column 1 selector */}
        <Card className="bg-card/50 backdrop-blur-sm border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Car className="w-4 h-4" /> {lang === "ar" ? "المركبة الأولى" : "Vehicle A"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={v1Id.toString()} onValueChange={v => { setV1Id(parseInt(v)); setS1Id(0); }}>
              <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر مركبة" : "Select vehicle"} /></SelectTrigger>
              <SelectContent>
                {vehicles?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.year} {v.make} {v.model}</SelectItem>)}
              </SelectContent>
            </Select>
            {v1Id > 0 && (
              <Select value={s1Id.toString()} onValueChange={v => setS1Id(parseInt(v))}>
                <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر جلسة" : "Select session"} /></SelectTrigger>
                <SelectContent>
                  {sessions1?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{new Date(s.startedAt).toLocaleDateString()} — {s.status}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Column 2 selector */}
        <Card className="bg-card/50 backdrop-blur-sm border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Car className="w-4 h-4" /> {lang === "ar" ? "المركبة الثانية" : "Vehicle B"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={v2Id.toString()} onValueChange={v => { setV2Id(parseInt(v)); setS2Id(0); }}>
              <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر مركبة" : "Select vehicle"} /></SelectTrigger>
              <SelectContent>
                {vehicles?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.year} {v.make} {v.model}</SelectItem>)}
              </SelectContent>
            </Select>
            {v2Id > 0 && (
              <Select value={s2Id.toString()} onValueChange={v => setS2Id(parseInt(v))}>
                <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر جلسة" : "Select session"} /></SelectTrigger>
                <SelectContent>
                  {sessions2?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{new Date(s.startedAt).toLocaleDateString()} — {s.status}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison results */}
      {(v1Id > 0 || v2Id > 0) && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            {v1Id > 0 ? <VehicleColumn vehicleId={v1Id} sessionId={s1Id} /> : <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-xl">Select Vehicle A</div>}
          </div>
          <div>
            {v2Id > 0 ? <VehicleColumn vehicleId={v2Id} sessionId={s2Id} /> : <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-xl">Select Vehicle B</div>}
          </div>
        </div>
      )}

      {!v1Id && !v2Id && (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <GitCompare className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-xl font-medium mb-2">{lang === "ar" ? "اختر مركبتين للمقارنة" : "Select two vehicles to compare"}</p>
          <p className="text-sm">{lang === "ar" ? "سيتم عرض الأعطال والفحوصات جنباً إلى جنب" : "Fault codes and scan results will appear side by side"}</p>
        </div>
      )}
    </div>
  );
}
