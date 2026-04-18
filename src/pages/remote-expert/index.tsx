import { useState, useEffect, useRef } from "react";
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Monitor,
  MessageSquare, Star, Clock, Shield, Award, ChevronRight,
  Activity, AlertTriangle, Wifi, WifiOff, Users, Zap,
  CheckCircle2, Send, Paperclip, Camera, Share2, Signal,
  RotateCcw, XCircle, BookOpen, Globe, Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useListVehicles, useListDtcCodes, useListDiagnosticSessions } from "@workspace/api-client-react";
import { useActiveVehicle } from "@/lib/vehicle-context";

/* ─── Expert definitions ─────────────────────── */
interface Expert {
  id: string;
  nameAr: string;
  nameEn: string;
  specialtyAr: string;
  specialtyEn: string;
  rating: number;
  sessions: number;
  certifications: string[];
  online: boolean;
  flagCode: string;
  country: string;
  responseMs: number;
  avatarSeed: string;
  color: string;
}

const EXPERTS: Expert[] = [
  {
    id: "e1", nameAr: "د. كارلوس مارتينيز", nameEn: "Dr. Carlos Martinez",
    specialtyAr: "برمجة ECU ومحركات BMW/Mercedes", specialtyEn: "ECU Programming · BMW/Mercedes",
    rating: 4.9, sessions: 3420, certifications: ["Bosch", "ADAS L3", "CAN FD"],
    online: true, flagCode: "🇩🇪", country: "ألمانيا", responseMs: 12, avatarSeed: "carlos", color: "#3b82f6"
  },
  {
    id: "e2", nameAr: "فيكتور إيفانوف", nameEn: "Viktor Ivanov",
    specialtyAr: "ADAS ومعايرة الرادار والكاميرا", specialtyEn: "ADAS · Radar & Camera Calibration",
    rating: 4.8, sessions: 2180, certifications: ["VCDS Pro", "DoIP", "UDS"],
    online: true, flagCode: "🇷🇺", country: "روسيا", responseMs: 8, avatarSeed: "viktor", color: "#22c55e"
  },
  {
    id: "e3", nameAr: "سارة تاناكا", nameEn: "Sarah Tanaka",
    specialtyAr: "سيارات Toyota / Lexus / Hybrid", specialtyEn: "Toyota · Lexus · Hybrid Systems",
    rating: 4.95, sessions: 5100, certifications: ["Toyota Master", "HV Safety", "CAN FD"],
    online: true, flagCode: "🇯🇵", country: "اليابان", responseMs: 5, avatarSeed: "sarah", color: "#f97316"
  },
  {
    id: "e4", nameAr: "مارك ريتشاردز", nameEn: "Mark Richards",
    specialtyAr: "Volkswagen / Audi / Porsche (VAG)", specialtyEn: "VAG Group · VW · Audi · Porsche",
    rating: 4.85, sessions: 2950, certifications: ["ODIS Expert", "J2534", "Bosch"],
    online: false, flagCode: "🇬🇧", country: "بريطانيا", responseMs: 25, avatarSeed: "mark", color: "#a855f7"
  },
  {
    id: "e5", nameAr: "أحمد الرشيد", nameEn: "Ahmad Al-Rashid",
    specialtyAr: "GM / Ford / Chrysler النظام الكهربائي", specialtyEn: "GM · Ford · Chrysler Electrical",
    rating: 4.7, sessions: 1640, certifications: ["RP1210", "CAN FD", "ISO 27145"],
    online: true, flagCode: "🇸🇦", country: "السعودية", responseMs: 18, avatarSeed: "ahmed", color: "#eab308"
  },
];

/* ─── Animated "video" canvas ────────────────── */
function ExpertVideoCanvas({ expert, active }: { expert: Expert | null; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useRef(0);

  useEffect(() => {
    if (!active || !expert) return;
    let raf: number;
    const draw = () => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext("2d"); if (!ctx) return;
      const W = c.width, H = c.height;
      ctx.fillStyle = "#0a0d14"; ctx.fillRect(0, 0, W, H);

      // Scanning lines effect (CRT)
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(0, y, W, 1);
      }

      // Background grid
      ctx.strokeStyle = "rgba(59,130,246,0.06)"; ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // Avatar silhouette
      const cx = W * 0.5, cy = H * 0.38;
      const headR = Math.min(W, H) * 0.12;
      const bodyW = headR * 2.4, bodyH = headR * 2.2;
      ctx.fillStyle = expert.color + "22";
      ctx.beginPath(); ctx.arc(cx, cy, headR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = expert.color + "18";
      ctx.beginPath(); ctx.ellipse(cx, cy + headR * 1.6, bodyW, bodyH, 0, 0, Math.PI * 2); ctx.fill();

      // Glowing ring around head
      const glow = ctx.createRadialGradient(cx, cy, headR * 0.6, cx, cy, headR * 1.5);
      glow.addColorStop(0, expert.color + "33");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, headR * 1.5, 0, Math.PI * 2); ctx.fill();

      // Animated sound wave bars at bottom
      const barsY = H - 24; const barCount = 24; const barSpacing = W / (barCount + 2);
      for (let i = 0; i < barCount; i++) {
        const bx = barSpacing + i * barSpacing;
        const h = 4 + Math.abs(Math.sin(t.current * 3 + i * 0.6)) * 14;
        ctx.fillStyle = expert.color + "90";
        ctx.fillRect(bx - 2, barsY - h, 4, h);
      }

      // Status indicator (connection quality)
      ctx.fillStyle = "#22c55e"; ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(12, 12, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Recording indicator
      ctx.fillStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 6 + Math.sin(t.current * 4) * 3;
      ctx.beginPath(); ctx.arc(W - 14, 12, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "right";
      ctx.fillText("● REC", W - 22, 16); ctx.textAlign = "left";

      // Expert name overlay at bottom
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, H - 42, W, 42);
      ctx.fillStyle = "white"; ctx.font = "bold 12px sans-serif";
      ctx.fillText(expert.nameEn, 10, H - 24);
      ctx.fillStyle = expert.color; ctx.font = "10px sans-serif";
      ctx.fillText(expert.specialtyEn.split("·")[0], 10, H - 10);

      t.current += 0.04;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, expert]);

  return (
    <canvas ref={ref} width={480} height={320}
      className="w-full h-full object-cover rounded-xl" />
  );
}

/* ─── Self-view mini canvas ──────────────────── */
function SelfViewCanvas({ muted }: { muted: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useRef(0);
  useEffect(() => {
    let raf: number;
    const draw = () => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext("2d"); if (!ctx) return;
      const W = c.width, H = c.height;
      ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, W, H);

      if (!muted) {
        const cx = W / 2, cy = H * 0.38;
        const headR = Math.min(W, H) * 0.18;
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.arc(cx, cy, headR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.ellipse(cx, cy + headR * 1.5, headR * 2, headR * 1.8, 0, 0, Math.PI * 2); ctx.fill();
        const barsY = H - 14; const barCount = 12; const barSpacing = W / (barCount + 2);
        for (let i = 0; i < barCount; i++) {
          const bx = barSpacing + i * barSpacing;
          const h = 3 + Math.abs(Math.sin(t.current * 2 + i * 0.5)) * 8;
          ctx.fillStyle = "#3b82f6" + "90";
          ctx.fillRect(bx - 1.5, barsY - h, 3, h);
        }
      } else {
        ctx.fillStyle = "#374151"; ctx.font = "24px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🎤", W / 2, H / 2 + 8);
        ctx.fillStyle = "#6b7280"; ctx.font = "9px sans-serif";
        ctx.fillText("Muted", W / 2, H / 2 + 24);
      }
      t.current += 0.05;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [muted]);
  return <canvas ref={ref} width={180} height={120} className="w-full h-full object-cover" />;
}

/* ─── Main page ──────────────────────────────── */
type CallState = "idle" | "connecting" | "active" | "ended";

interface ChatMsg { id: number; from: "me" | "expert"; text: string; time: string; }

const INITIAL_MSGS: ChatMsg[] = [
  { id: 1, from: "expert", text: "مرحباً! أنا هنا لمساعدتك في تشخيص المشكلة. ما هو الرمز المشفر الذي تواجهه؟", time: "الآن" },
];

export default function RemoteExpert() {
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MSGS);
  const [chatInput, setChatInput] = useState("");
  const [quality, setQuality] = useState(95);
  const [activeTab, setActiveTab] = useState<"chat" | "dtc" | "data">("dtc");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { activeVehicle } = useActiveVehicle();
  const { data: vehicles } = useListVehicles();
  const { data: sessions } = useListDiagnosticSessions(
    activeVehicle ? { vehicleId: activeVehicle.id } : {},
    { query: { enabled: !!activeVehicle } } as any
  );
  const lastSession = sessions?.[0];
  const { data: dtcs } = useListDtcCodes(
    lastSession ? { sessionId: lastSession.id } : { sessionId: 0 },
    { query: { enabled: !!lastSession } } as any
  );

  useEffect(() => {
    if (callState !== "active") return;
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, [callState]);

  useEffect(() => {
    if (callState !== "active") return;
    const iv = setInterval(() => {
      setQuality(q => Math.max(60, Math.min(99, q + Math.round((Math.random() - 0.5) * 4))));
    }, 3000);
    return () => clearInterval(iv);
  }, [callState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60); const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const startCall = () => {
    if (!selectedExpert) return;
    setCallState("connecting");
    setTimeout(() => {
      setCallState("active");
      setMessages(msgs => [...msgs, {
        id: Date.now(), from: "expert",
        text: `أهلاً! وصلني ملف التشخيص. ${dtcs?.length ? `أرى ${dtcs.length} رموز خطأ — سنبدأ بالأهم.` : "أخبرني بالمشكلة التي تواجهها."}`,
        time: "الآن"
      }]);
    }, 2500);
  };

  const endCall = () => {
    setCallState("ended");
    setElapsed(0);
    setTimeout(() => setCallState("idle"), 3000);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMsg = { id: Date.now(), from: "me", text: chatInput, time: "الآن" };
    setMessages(m => [...m, newMsg]);
    setChatInput("");
    setTimeout(() => {
      const replies = [
        "فهمت المشكلة. أنصح بفحص الحساس أولاً قبل الاستبدال.",
        "هذا الرمز شائع في هذا الموديل — تحقق من صمام VVT.",
        "هل جربت مسح الأخطاء وإعادة الاختبار؟",
        "أرسل لي قراءة البيانات الحية لأتمكن من التحليل.",
        "هذا يشير إلى مشكلة في الضغط — اختبر نظام الوقود.",
      ];
      setMessages(m => [...m, {
        id: Date.now() + 1, from: "expert",
        text: replies[Math.floor(Math.random() * replies.length)],
        time: "الآن"
      }]);
    }, 1800);
  };

  const vehicleInfo = vehicles?.find(v => v.id === activeVehicle?.id);

  return (
    <div className="h-screen flex flex-col bg-[#080b12] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-white/[0.06] bg-[#0a0e1a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Remote Expert</h1>
            <p className="text-[11px] text-slate-500">استشارة فنية مباشرة مع خبراء معتمدين</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {callState === "active" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-mono text-sm font-bold">{formatElapsed(elapsed)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Signal className={cn("w-3.5 h-3.5", quality > 80 ? "text-green-400" : quality > 60 ? "text-yellow-400" : "text-red-400")} />
            <span>{quality}% جودة</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-blue-400 font-medium">الدعم الفني العالمي</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Expert selection + call */}
        <div className="w-[340px] shrink-0 border-r border-white/[0.05] flex flex-col overflow-y-auto">
          {/* Expert list */}
          <div className="p-4 border-b border-white/[0.05]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">الخبراء المتاحون</div>
            <div className="space-y-2">
              {EXPERTS.map(expert => (
                <button
                  key={expert.id}
                  onClick={() => callState === "idle" && setSelectedExpert(expert)}
                  disabled={callState !== "idle"}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all",
                    selectedExpert?.id === expert.id
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
                    !expert.online && "opacity-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: expert.color + "22", border: `2px solid ${expert.color}44` }}>
                        {expert.flagCode}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#080b12]",
                        expert.online ? "bg-green-400" : "bg-slate-600"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white truncate">{expert.nameAr}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-[10px] text-yellow-400 font-bold">{expert.rating}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{expert.specialtyAr}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] text-slate-600">{expert.sessions.toLocaleString()} جلسة</span>
                        {expert.online && (
                          <span className="text-[9px] text-green-500">يرد في {expert.responseMs}ث</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {expert.certifications.slice(0, 2).map(c => (
                          <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-500 border border-white/[0.06]">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Call controls */}
          <div className="p-4 space-y-3">
            {callState === "idle" && (
              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white gap-2 text-sm font-bold rounded-xl"
                disabled={!selectedExpert}
                onClick={startCall}
              >
                <Phone className="w-4 h-4" />
                {selectedExpert ? `اتصل بـ ${selectedExpert.nameAr.split(" ")[1]}` : "اختر خبيراً للاتصال"}
              </Button>
            )}

            {callState === "connecting" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-14 h-14 rounded-full border-2 border-blue-500/50 flex items-center justify-center animate-pulse">
                  <Phone className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-sm text-slate-400">جارٍ الاتصال بـ {selectedExpert?.nameAr}...</p>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {callState === "active" && (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setMuted(v => !v)}
                  className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs",
                    muted ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  )}>
                  {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  {muted ? "كتم" : "ميكروفون"}
                </button>
                <button onClick={() => setCameraOff(v => !v)}
                  className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs",
                    cameraOff ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  )}>
                  {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  {cameraOff ? "كاميرا" : "فيديو"}
                </button>
                <button onClick={() => setSharing(v => !v)}
                  className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs",
                    sharing ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  )}>
                  <Share2 className="w-5 h-5" />
                  {sharing ? "تشارك" : "مشاركة"}
                </button>
                <button
                  onClick={endCall}
                  className="col-span-3 flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-bold"
                >
                  <PhoneOff className="w-4 h-4" />
                  إنهاء المكالمة
                </button>
              </div>
            )}

            {callState === "ended" && (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <p className="text-sm text-green-400 font-bold">انتهت المكالمة</p>
                <p className="text-xs text-slate-500">شكراً لاستخدامك Remote Expert</p>
              </div>
            )}

            {/* Vehicle info card */}
            {vehicleInfo && (
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">المركبة المشاركة</div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Radio className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}</div>
                    <div className="text-[10px] text-slate-500">{vehicleInfo.vin || "VIN غير متاح"}</div>
                  </div>
                </div>
                {(dtcs?.length ?? 0) > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] text-yellow-400">{dtcs!.length} رمز خطأ مشارك مع الخبير</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Video */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative p-4">
            {/* Main video */}
            <div className="h-full rounded-2xl overflow-hidden border border-white/[0.08] relative"
              style={{ background: "#0a0d14", boxShadow: "0 0 60px rgba(59,130,246,0.05)" }}>
              {callState === "active" && selectedExpert ? (
                <ExpertVideoCanvas expert={selectedExpert} active={true} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  {callState === "idle" && (
                    <>
                      <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Users className="w-12 h-12 text-blue-500/50" />
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 font-medium">{selectedExpert ? `جاهز للاتصال بـ ${selectedExpert.nameAr}` : "اختر خبيراً من القائمة"}</p>
                        <p className="text-slate-600 text-sm mt-1">الفيديو سيظهر هنا عند بدء المكالمة</p>
                      </div>
                    </>
                  )}
                  {callState === "connecting" && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center animate-pulse">
                        <span className="text-4xl">{selectedExpert?.flagCode}</span>
                      </div>
                      <p className="text-blue-400 font-bold animate-pulse">جارٍ الاتصال...</p>
                    </div>
                  )}
                  {callState === "ended" && (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle2 className="w-16 h-16 text-green-400" />
                      <p className="text-white font-bold text-lg">انتهت المكالمة بنجاح</p>
                    </div>
                  )}
                </div>
              )}

              {/* Self-view */}
              {callState === "active" && (
                <div className="absolute bottom-4 right-4 w-36 h-24 rounded-xl overflow-hidden border border-white/20 shadow-2xl">
                  {!cameraOff ? (
                    <SelfViewCanvas muted={muted} />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <VideoOff className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                </div>
              )}

              {/* Sharing badge */}
              {sharing && callState === "active" && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold animate-pulse">
                  <Monitor className="w-3 h-3" />
                  مشاركة الشاشة نشطة
                </div>
              )}

              {/* Protocol info overlay */}
              {callState === "active" && (
                <div className="absolute bottom-4 left-4 text-[9px] font-mono text-slate-700 space-y-0.5">
                  <div>WebRTC · AES-256 · P2P Encrypted</div>
                  <div>Codec: VP9 · {quality}% Quality</div>
                </div>
              )}
            </div>
          </div>

          {/* Stats bar */}
          {callState === "active" && (
            <div className="shrink-0 px-4 pb-3 grid grid-cols-4 gap-2">
              {[
                { label: "جودة الاتصال", value: quality + "%", color: quality > 80 ? "text-green-400" : "text-yellow-400" },
                { label: "التأخر", value: "18ms", color: "text-blue-400" },
                { label: "معدل الإطارات", value: "30fps", color: "text-purple-400" },
                { label: "البروتوكول", value: "WebRTC", color: "text-cyan-400" },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg border border-white/[0.05] bg-white/[0.02] text-center">
                  <div className={`font-mono font-bold text-sm ${s.color}`}>{s.value}</div>
                  <div className="text-[9px] text-slate-600">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Chat + DTC panel */}
        <div className="w-[320px] shrink-0 border-l border-white/[0.05] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.05]">
            {(["dtc", "chat", "data"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2.5 text-[11px] font-bold transition-all",
                  activeTab === tab
                    ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                    : "text-slate-600 hover:text-slate-400"
                )}>
                {tab === "chat" ? "💬 دردشة" : tab === "dtc" ? "⚠️ الأخطاء" : "📊 بيانات"}
              </button>
            ))}
          </div>

          {/* DTC panel */}
          {activeTab === "dtc" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                الأخطاء المشاركة مع الخبير
              </div>
              {(dtcs?.length ?? 0) > 0 ? dtcs!.map(d => (
                <div key={d.id} className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-white">{d.code}</span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                      d.severity === "critical" ? "bg-red-500/20 text-red-400" :
                        d.severity === "warning" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-blue-500/20 text-blue-400"
                    )}>{d.severity}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">{d.description}</p>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-600">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد أخطاء مشاركة</p>
                  <p className="text-xs mt-1">افتح جلسة تشخيص أولاً</p>
                </div>
              )}
            </div>
          )}

          {/* Data panel */}
          {activeTab === "data" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                البيانات الحية المشاركة
              </div>
              {[
                { label: "سرعة المحرك", value: "850 RPM", color: "text-blue-400" },
                { label: "حرارة المبرد", value: "87°C", color: "text-red-400" },
                { label: "جهد البطارية", value: "14.1V", color: "text-yellow-400" },
                { label: "حمل المحرك", value: "22%", color: "text-green-400" },
                { label: "موضع الخانق", value: "15%", color: "text-purple-400" },
                { label: "ضغط المنفستو", value: "97 kPa", color: "text-cyan-400" },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between p-2 rounded-lg border border-white/[0.05] bg-white/[0.02]">
                  <span className="text-[11px] text-slate-400">{d.label}</span>
                  <span className={cn("font-mono text-xs font-bold", d.color)}>{d.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chat panel */}
          {activeTab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex", msg.from === "me" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed",
                      msg.from === "me"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white/[0.06] text-slate-300 rounded-bl-none border border-white/[0.06]"
                    )}>
                      {msg.text}
                      <div className={cn("text-[9px] mt-1 opacity-60", msg.from === "me" ? "text-right" : "text-left")}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-white/[0.05]">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="اكتب رسالة..."
                    disabled={callState !== "active"}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 disabled:opacity-40"
                  />
                  <button onClick={sendMessage} disabled={callState !== "active" || !chatInput.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
