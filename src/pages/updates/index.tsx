import { useState } from "react";
import { useGetUpdateStatus, useListAvailableUpdates } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Download, HardDrive, ShieldCheck, ChevronRight, CheckCircle2,
  RefreshCw, Loader2, ArrowDownToLine, AlertTriangle, Star
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SIMULATED_UPDATES = [
  {
    id: 1, name: "Vehicle Coverage Database", nameAr: "قاعدة بيانات المركبات",
    version: "2026.04.1", mandatory: false, sizeKb: 128000,
    releaseDate: "2026-04-01",
    description: "Adds 2026 model year vehicles including Toyota Land Cruiser 300 GX, BMW i5 M60, Mercedes EQS 2026",
    descriptionAr: "يضيف مركبات موديل 2026 بما في ذلك لاندكروزر 300 GX، BMW i5 M60، مرسيدس EQS 2026",
    category: "vehicle-db", categoryColor: "text-blue-400", categoryBg: "bg-blue-500/10", categoryBorder: "border-blue-500/20"
  },
  {
    id: 2, name: "ECU Programming Firmware", nameAr: "برنامج برمجة ECU",
    version: "8.3.2", mandatory: true, sizeKb: 52000,
    releaseDate: "2026-03-28",
    description: "Critical fix for UDS protocol timeout handling on BMW F-series vehicles",
    descriptionAr: "إصلاح حرج لمهلة بروتوكول UDS على مركبات BMW F-series",
    category: "firmware", categoryColor: "text-red-400", categoryBg: "bg-red-500/10", categoryBorder: "border-red-500/20"
  },
  {
    id: 3, name: "ADAS Calibration Module", nameAr: "وحدة معايرة ADAS",
    version: "5.1.0", mandatory: false, sizeKb: 38000,
    releaseDate: "2026-03-22",
    description: "New calibration targets for 2024+ Toyota/Lexus radar-fusion front camera systems",
    descriptionAr: "أهداف معايرة جديدة لكاميرات الرادار الأمامية من Toyota/Lexus 2024+",
    category: "adas", categoryColor: "text-green-400", categoryBg: "bg-green-500/10", categoryBorder: "border-green-500/20"
  },
  {
    id: 4, name: "Diagnostic Software OS", nameAr: "نظام برنامج التشخيص",
    version: "10.5.0", mandatory: false, sizeKb: 210000,
    releaseDate: "2026-03-15",
    description: "MaxiSYS OS update with improved scan speed, enhanced Arabic UI, and new AI diagnostic features",
    descriptionAr: "تحديث MaxiSYS OS بسرعة فحص محسّنة، واجهة عربية مُعزَّزة، وميزات AI تشخيصية جديدة",
    category: "software", categoryColor: "text-violet-400", categoryBg: "bg-violet-500/10", categoryBorder: "border-violet-500/20"
  },
];

export default function Updates() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { data: status } = useGetUpdateStatus();
  const [installing, setInstalling] = useState<number | null>(null);
  const [installed, setInstalled] = useState<Set<number>>(new Set());
  const [checking, setChecking] = useState(false);

  async function handleInstall(id: number) {
    setInstalling(id);
    await new Promise(r => setTimeout(r, 2500));
    setInstalled(prev => new Set([...prev, id]));
    setInstalling(null);
  }

  async function handleCheckAll() {
    setChecking(true);
    await new Promise(r => setTimeout(r, 1500));
    setChecking(false);
  }

  const totalSize = SIMULATED_UPDATES.reduce((a, u) => a + u.sizeKb, 0);
  const mandatoryCount = SIMULATED_UPDATES.filter(u => u.mandatory).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <h1 className="text-2xl font-black tracking-tight">
              {isAr ? "تحديثات البرنامج" : "Software Updates"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-3.5">
            {isAr ? "حافظ على أحدث إصدار للتغطية والميزات" : "Stay current with latest coverage and features"}
          </p>
        </div>
        <Button onClick={handleCheckAll} disabled={checking} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isAr ? "البحث عن تحديثات" : "Check for Updates"}
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: isAr ? "تحديثات متاحة" : "Available", value: SIMULATED_UPDATES.length, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: isAr ? "حرج" : "Critical", value: mandatoryCount, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: isAr ? "تم التثبيت" : "Installed", value: installed.size, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
          { label: isAr ? "الحجم الكلي" : "Total Size", value: `${(totalSize / 1024).toFixed(0)} MB`, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Updates list */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ArrowDownToLine className="w-3.5 h-3.5" />
            {isAr ? "التحديثات المتاحة" : "Available Updates"}
          </h2>

          {SIMULATED_UPDATES.map(upd => {
            const isInstalled = installed.has(upd.id);
            const isInstalling = installing === upd.id;
            return (
              <div key={upd.id} className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all",
                isInstalled ? "border-green-500/20 bg-green-500/5 opacity-70" : `${upd.categoryBorder} bg-white/[0.02] hover:bg-white/[0.04]`
              )}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${upd.categoryBg} border ${upd.categoryBorder}`}>
                  {isInstalled ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Download className={`w-5 h-5 ${upd.categoryColor}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white">{isAr ? upd.nameAr : upd.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400">v{upd.version}</span>
                    {upd.mandatory && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/20">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {isAr ? "إلزامي" : "Critical"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{isAr ? upd.descriptionAr : upd.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-600">
                    <span>{(upd.sizeKb / 1024).toFixed(1)} MB</span>
                    <span>·</span>
                    <span>{new Date(upd.releaseDate).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleInstall(upd.id)}
                  disabled={isInstalling || isInstalled}
                  size="sm"
                  variant={isInstalled ? "ghost" : upd.mandatory ? "destructive" : "default"}
                  className={cn("shrink-0 gap-1.5 min-w-[90px]", isInstalled && "text-green-400")}
                >
                  {isInstalling ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isAr ? "تثبيت..." : "Installing..."}</>
                  ) : isInstalled ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? "مثبّت" : "Installed"}</>
                  ) : (
                    <><Download className="w-3.5 h-3.5" />{isAr ? "تثبيت" : "Install"}</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Current versions */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
              <HardDrive className="w-3.5 h-3.5" />
              {isAr ? "الإصدارات الحالية" : "Current Versions"}
            </h3>
            <div className="space-y-3 font-mono text-sm">
              {[
                { k: isAr ? "البرنامج الثابت" : "Firmware",     v: status?.firmwareVersion || "v8.2.1" },
                { k: isAr ? "نظام التشغيل"    : "Software OS",  v: status?.softwareVersion || "v10.4.2" },
                { k: isAr ? "قاعدة المركبات"  : "Vehicle DB",   v: status?.vehicleCoverageVersion || "2026.03.5" },
                { k: isAr ? "خرائط ADAS"      : "ADAS Maps",    v: "v5.0.3" },
              ].map(item => (
                <div key={item.k} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-slate-500 text-xs">{item.k}</span>
                  <span className="text-slate-300 text-xs font-bold">{item.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription card */}
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/30 to-[#080b12] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="w-24 h-24 text-blue-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {isAr ? "الاشتراك الفعال" : "Active Subscription"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">Total Care Program</p>
              <div className="text-3xl font-black text-white mb-1">342</div>
              <p className="text-xs text-slate-400 mb-4">{isAr ? "يوم متبقٍ حتى انتهاء الاشتراك" : "Days remaining until expiration"}</p>
              <Button variant="outline" size="sm" className="w-full justify-between border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-2">
                {isAr ? "تجديد الاشتراك" : "Renew Subscription"}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
