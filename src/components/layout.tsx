import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetDeviceInfo } from "@workspace/api-client-react";
import {
  Car, Activity, AlertCircle, Wrench, Settings,
  FileText, Zap, Battery, BatteryCharging, BatteryFull,
  Cpu, LayoutDashboard, BookOpen, GitCompare, Radio,
  Plug, Languages, ChevronDown, Check, Wifi, WifiHigh,
  TriangleAlert, ArrowDownToLine, ChevronRight, Shield, Network,
  Waves, GitBranch, BrainCircuit, Radar, BatteryMedium,
  ShieldCheck, BarChart2, Sun, Moon, Keyboard, MessageSquareMore, Leaf, Users,
  Layers, PlayCircle, KeyRound, Gauge, Camera, Share2,
  ClipboardList, Package, SplitSquareHorizontal,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useTechnician } from "@/lib/technician";
import { useObd } from "@/lib/obd/context";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Hash } from "lucide-react";
import VciConnectPanel from "@/components/vci-connect-panel";
import { ActiveVehicleBar } from "@/components/active-vehicle-bar";
import AiAssistant from "@/components/ai-assistant";
import { KeyboardShortcutsOverlay } from "@/components/keyboard-shortcuts";
import { VoiceCommandsButton } from "@/components/voice-commands";

/* ─── Navigation items ──────────────────────────────────────── */
const NAV_ITEMS = [
  { href: "/",            icon: LayoutDashboard, labelAr: "الرئيسية",       labelEn: "Dashboard",    group: "main"    },
  { href: "/vehicles",    icon: Car,             labelAr: "المركبات",        labelEn: "Vehicles",     group: "main"    },
  { href: "/diagnostics", icon: Activity,        labelAr: "التشخيص",         labelEn: "Diagnostics",  group: "main"    },
  { href: "/live-scan",   icon: Radio,           labelAr: "الفحص الحي",      labelEn: "Live Scan",    group: "main", liveIndicator: true },
  { href: "/system-map",  icon: Network,         labelAr: "خريطة الأنظمة",   labelEn: "System Map",   group: "main"    },
  { href: "/oscilloscope",icon: Waves,           labelAr: "الأوسيلوسكوب",    labelEn: "Oscilloscope", group: "main"    },
  { href: "/guided-diag", icon: GitBranch,       labelAr: "التشخيص الموجّه", labelEn: "Guided Diag",  group: "main"    },
  { href: "/predictive",  icon: BrainCircuit,    labelAr: "الصيانة التنبؤية", labelEn: "Predictive AI", group: "main"    },
  { href: "/full-scan",   icon: Radar,           labelAr: "فحص شامل",        labelEn: "Full Scan",    group: "main"    },
  { href: "/battery",     icon: BatteryMedium,   labelAr: "محلل البطارية",   labelEn: "Battery",      group: "main"    },
  { href: "/monitors",      icon: ShieldCheck,      labelAr: "مراقبات OBD",      labelEn: "OBD Monitors",   group: "main"    },
  { href: "/topology",      icon: Share2,           labelAr: "Topology 3.0",     labelEn: "Topology 3.0",   group: "main"    },
  { href: "/active-tests",  icon: PlayCircle,       labelAr: "اختبارات نشطة",    labelEn: "Active Tests",   group: "main"    },
  { href: "/inspection",    icon: Camera,           labelAr: "كاميرا الفحص",     labelEn: "Inspection",     group: "main"    },
  { href: "/ai-chat",       icon: MessageSquareMore,labelAr: "مساعد AI الذكي",   labelEn: "AI Assistant",   group: "main"    },
  { href: "/maintenance",   icon: Wrench,           labelAr: "الصيانة",          labelEn: "Maintenance",    group: "service" },
  { href: "/programming",   icon: Cpu,              labelAr: "برمجة ECU",        labelEn: "Programming",    group: "service" },
  { href: "/adas",          icon: AlertCircle,      labelAr: "معايرة ADAS",      labelEn: "ADAS",           group: "service" },
  { href: "/wiring",        icon: Layers,           labelAr: "رسومات الأسلاك",   labelEn: "Wiring Diagrams",group: "service" },
  { href: "/key-programming",icon: KeyRound,        labelAr: "برمجة مفاتيح",     labelEn: "Key Programming",group: "service" },
  { href: "/tpms",          icon: Gauge,            labelAr: "TPMS إطارات",      labelEn: "TPMS",           group: "service" },
  { href: "/ev-diagnostics",icon: BatteryCharging,  labelAr: "تشخيص كهربائي EV",labelEn: "EV Diagnostics", group: "service" },
  { href: "/remote-expert",   icon: Users,                labelAr: "خبير عن بُعد",       labelEn: "Remote Expert",   group: "service" },
  { href: "/injector-coding", icon: Zap,                  labelAr: "ترميز الحاقنات",     labelEn: "Injector Coding",  group: "service" },
  { href: "/vin-decoder",     icon: Hash,                 labelAr: "فك تشفير VIN",       labelEn: "VIN Decoder",      group: "data"    },
  { href: "/dtc-lookup",    icon: BookOpen,         labelAr: "مكتبة DTC",        labelEn: "DTC Library",    group: "data"    },
  { href: "/maxifix",       icon: BookOpen,         labelAr: "MaxiFix مجتمع",    labelEn: "MaxiFix",        group: "data"    },
  { href: "/dvi",           icon: ClipboardList,    labelAr: "فحص DVI شامل",    labelEn: "DVI Inspection", group: "data"    },
  { href: "/pre-post-scan", icon: SplitSquareHorizontal, labelAr: "قبل/بعد الإصلاح", labelEn: "Pre/Post Scan",  group: "data"    },
  { href: "/parts",         icon: Package,          labelAr: "قطع الغيار",       labelEn: "Parts Catalog",  group: "data"    },
  { href: "/compare",       icon: GitCompare,       labelAr: "المقارنة",         labelEn: "Compare",        group: "data"    },
  { href: "/reports",       icon: FileText,         labelAr: "التقارير",         labelEn: "Reports",        group: "data"    },
  { href: "/stats",         icon: BarChart2,        labelAr: "الإحصائيات",       labelEn: "Statistics",     group: "data"    },
  { href: "/emissions",     icon: Leaf,             labelAr: "الانبعاثات",        labelEn: "Emissions",      group: "data"    },
  { href: "/customer",      icon: Users,            labelAr: "بوابة العميل",      labelEn: "Customer Portal",group: "data"    },
  { href: "/updates",       icon: ArrowDownToLine,  labelAr: "التحديثات",        labelEn: "Updates",        group: "data"    },
  { href: "/settings",      icon: Settings,         labelAr: "الإعدادات",        labelEn: "Settings",       group: "bottom"  },
];

function NavIcon({
  href, icon: Icon, labelAr, labelEn, liveIndicator, obdConnected, lang
}: {
  href: string; icon: any; labelAr: string; labelEn: string;
  liveIndicator?: boolean; obdConnected?: boolean; lang: string;
}) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  const label = lang === "ar" ? labelAr : labelEn;

  return (
    <Link href={href} className="w-full">
      <div className={cn(
        "relative flex items-center gap-2.5 px-2 h-10 rounded-xl cursor-pointer transition-all duration-150",
        "hover:bg-white/[0.06]",
        isActive
          ? "bg-primary/[0.12] text-primary shadow-[inset_0_0_12px_rgba(59,130,246,0.08)] after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:rounded-r-full"
          : "text-slate-500 hover:text-slate-300"
      )}>
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <span className={cn(
          "text-[11px] font-medium whitespace-nowrap overflow-hidden transition-all duration-200 leading-tight",
          "opacity-0 w-0 group-hover/sb:opacity-100 group-hover/sb:w-auto",
          isActive ? "text-primary" : "text-slate-400"
        )}>
          {label}
        </span>
        {liveIndicator && obdConnected && (
          <span className="absolute top-1.5 left-7 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
      </div>
    </Link>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { lang, setLang, dir } = useI18n();
  const { current: tech, setCurrent, all } = useTechnician();
  const { user, signOut } = useAuth();
  const [time, setTime] = useState(new Date());
  const [vciPanelOpen, setVciPanelOpen] = useState(false);
  const { state: obdState } = useObd();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: deviceInfo } = useGetDeviceInfo({
    query: { queryKey: ["/api/device/info"], refetchInterval: 10000 }
  });

  const batteryLevel = deviceInfo?.batteryLevel || 84;
  const getBatteryIcon = () => {
    if (deviceInfo?.batteryStatus === "charging") return <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />;
    if (batteryLevel > 80) return <BatteryFull className="w-3.5 h-3.5 text-emerald-400" />;
    if (batteryLevel < 20) return <Battery className="w-3.5 h-3.5 text-red-400" />;
    return <Battery className="w-3.5 h-3.5 text-amber-400" />;
  };

  const obdConnected = obdState === "connected";
  const obdConnecting = obdState === "connecting" || obdState === "initializing";
  const vciStatus = obdConnected ? "connected" : obdConnecting ? "connecting" : "disconnected";

  /* Current page label for breadcrumb */
  const currentNav = NAV_ITEMS.find(n => n.href !== "/" ? location.startsWith(n.href) : location === "/");
  const pageLabel = currentNav ? (lang === "ar" ? currentNav.labelAr : currentNav.labelEn) : "";

  const mainItems   = NAV_ITEMS.filter(n => n.group === "main");
  const serviceItems = NAV_ITEMS.filter(n => n.group === "service");
  const dataItems   = NAV_ITEMS.filter(n => n.group === "data");
  const bottomItems = NAV_ITEMS.filter(n => n.group === "bottom");

  return (
    <div
      className="h-[100dvh] flex flex-col bg-[#080b12] text-foreground selection:bg-primary/30 font-sans overflow-hidden"
      dir={dir}
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ═══════════════════════════════════════
          TOP STATUS BAR  — device-style header
          ═══════════════════════════════════════ */}
      <header className="h-11 shrink-0 flex items-center px-3 bg-[#0d1117] border-b border-white/[0.07] z-20 select-none">
        {/* Left: Logo + Device name */}
        <div className={cn("flex items-center gap-2.5 min-w-[192px]", dir === "rtl" ? "flex-row-reverse" : "")}>
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 border border-primary/30">
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-white tracking-wider leading-tight">MaxiSYS MS Ultra S2</div>
            <div className="text-[9px] text-slate-500 leading-tight font-mono">AUTEL® DIAGNOSTIC SYSTEM</div>
          </div>
        </div>

        {/* Center: VCI + OBD connection */}
        <div className={cn("flex-1 flex items-center justify-center gap-3", dir === "rtl" ? "flex-row-reverse" : "")}>
          {/* VCI status pill */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold transition-all",
            obdConnected
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : obdConnecting
              ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
              : "border-slate-600/50 bg-slate-800/40 text-slate-400"
          )}>
            <Zap className="w-3 h-3" />
            VCI: {obdConnected
              ? (lang === "ar" ? "متصل" : "CONNECTED")
              : obdConnecting
              ? (lang === "ar" ? "جارٍ..." : "CONNECTING")
              : (lang === "ar" ? "غير متصل" : "DISCONNECTED")}
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              obdConnected ? "bg-emerald-400 animate-pulse" : obdConnecting ? "bg-amber-400 animate-pulse" : "bg-slate-600"
            )} />
          </div>

          {/* Breadcrumb */}
          {pageLabel && (
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500">
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-300 font-medium">{pageLabel}</span>
            </div>
          )}

          {/* OBD connect button */}
          <button
            onClick={() => setVciPanelOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold transition-all",
              obdConnected
                ? "border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                : obdConnecting
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400 animate-pulse"
                : "border-blue-500/30 bg-blue-500/8 text-blue-400 hover:bg-blue-500/15"
            )}
          >
            <Plug className="w-3 h-3" />
            {obdConnected
              ? (lang === "ar" ? "مركبة متصلة" : "Vehicle Connected")
              : obdConnecting
              ? (lang === "ar" ? "جارٍ الاتصال..." : "Connecting...")
              : (lang === "ar" ? "ربط مركبة حقيقية" : "Connect Real Vehicle")}
          </button>
        </div>

        {/* Right: User/Technician + Lang + Status icons */}
        <div className={cn("flex items-center gap-2 min-w-[192px] justify-end", dir === "rtl" ? "flex-row-reverse" : "")}>
          {/* User & Technician Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all text-[11px] font-medium text-white/80",
                dir === "rtl" ? "flex-row-reverse pl-2.5 pr-1.5" : ""
              )}>
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-5 h-5 rounded-full shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {user?.displayName?.[0] || user?.email?.[0] || "?"}
                  </div>
                )}
                <div className="flex flex-col items-start leading-none max-w-[100px] hidden sm:flex">
                  <span className="truncate w-full text-white/90">
                    {user?.displayName || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-slate-500 truncate w-full">
                    {lang === "ar" ? tech.nameAr : tech.name}
                  </span>
                </div>
                <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-[#111827] border-white/10 shadow-2xl">
              {/* Account Header */}
              <div className="px-3 py-3 border-b border-white/[0.06]">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                  {lang === "ar" ? "الحساب" : "Account"}
                </p>
                <div className="flex items-center gap-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-8 h-8 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {user?.displayName?.[0] || user?.email?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{user?.displayName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Technician Selector Section */}
              <div className="px-3 py-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                {lang === "ar" ? "الفني النشط" : "Active Technician"}
              </div>
              {all.map(t2 => (
                <DropdownMenuItem key={t2.id} onClick={() => setCurrent(t2)} className="cursor-pointer gap-3 py-2 hover:bg-white/[0.05]">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0", t2.color)}>{t2.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{lang === "ar" ? t2.nameAr : t2.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{lang === "ar" ? t2.roleAr : t2.role}</p>
                  </div>
                  {tech.id === t2.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer gap-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-bold">{lang === "ar" ? "تسجيل الخروج" : "Sign Out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Voice Commands */}
          <VoiceCommandsButton />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center justify-center text-slate-400 hover:text-white"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Keyboard shortcuts hint */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
            className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center justify-center text-slate-500 hover:text-white"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Language */}
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all text-[10px] font-bold text-white/70"
          >
            <Languages className="w-3 h-3" />
            {lang === "en" ? "ع" : "EN"}
          </button>

          {/* Signal + Battery + Clock */}
          <div className={cn("flex items-center gap-2 text-[10px] font-mono text-slate-400", dir === "rtl" ? "flex-row-reverse" : "")}>
            <WifiHigh className="w-3.5 h-3.5 text-slate-400" />
            {getBatteryIcon()}
            <span className="text-slate-300 tabular-nums">
              {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          ACTIVE VEHICLE BAR
          ═══════════════════════════════════════ */}
      <ActiveVehicleBar />

      {/* ═══════════════════════════════
          BODY: Icon sidebar + Content
          ═══════════════════════════════ */}
      <div className={cn("flex flex-1 overflow-hidden", dir === "rtl" ? "flex-row-reverse" : "")}>

        {/* ── EXPANDABLE SIDEBAR — hover to reveal labels ── */}
        <aside className={cn(
          "group/sb shrink-0 bg-[#0d1117] border-r border-white/[0.06] flex flex-col py-2 z-20",
          "w-12 hover:w-52 transition-[width] duration-200 ease-out overflow-hidden",
          dir === "rtl" ? "border-l border-r-0" : ""
        )}>
          {/* Group: DIAGNOSTICS */}
          <div className="px-1 mb-0.5">
            <div className="h-5 flex items-center px-2 mb-0.5 overflow-hidden">
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600 whitespace-nowrap opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-100">
                {lang === "ar" ? "التشخيص" : "DIAGNOSTICS"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 w-full">
              {mainItems.map(n => (
                <NavIcon key={n.href} {...n} obdConnected={obdConnected} lang={lang} />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-2 h-px bg-white/[0.05] my-1.5" />

          {/* Group: SERVICE */}
          <div className="px-1 mb-0.5">
            <div className="h-5 flex items-center px-2 mb-0.5 overflow-hidden">
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600 whitespace-nowrap opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-100">
                {lang === "ar" ? "الخدمة" : "SERVICE"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 w-full">
              {serviceItems.map(n => (
                <NavIcon key={n.href} {...n} obdConnected={obdConnected} lang={lang} />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-2 h-px bg-white/[0.05] my-1.5" />

          {/* Group: DATA */}
          <div className="px-1 mb-0.5">
            <div className="h-5 flex items-center px-2 mb-0.5 overflow-hidden">
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600 whitespace-nowrap opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-100">
                {lang === "ar" ? "البيانات" : "DATA"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 w-full">
              {dataItems.map(n => (
                <NavIcon key={n.href} {...n} obdConnected={obdConnected} lang={lang} />
              ))}
            </div>
          </div>

          {/* Bottom spacer + settings */}
          <div className="flex-1" />
          <div className="mx-2 h-px bg-white/[0.05] mb-1.5" />
          <div className="flex flex-col gap-0.5 w-full px-1 pb-1">
            {bottomItems.map(n => (
              <NavIcon key={n.href} {...n} obdConnected={obdConnected} lang={lang} />
            ))}
          </div>
        </aside>

        {/* ── MAIN CONTENT — animated page transitions ── */}
        <main className="flex-1 overflow-auto bg-[#080b12] relative min-w-0">
          <div key={location} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 fill-mode-both min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* VCI Panel */}
      {vciPanelOpen && <VciConnectPanel onClose={() => setVciPanelOpen(false)} />}

      {/* AI Assistant floating */}
      <AiAssistant />

      {/* Global keyboard shortcuts overlay */}
      <KeyboardShortcutsOverlay />
    </div>
  );
}
