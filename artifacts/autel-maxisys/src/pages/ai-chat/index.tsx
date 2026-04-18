import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, Mic, MicOff, Trash2, Sparkles, AlertTriangle,
  Car, ChevronRight, Zap, Clock, Copy, Check, RefreshCw,
  MessageSquare, BookOpen, DollarSign, ListOrdered, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useActiveVehicle } from "@/lib/vehicle-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
  isStreaming?: boolean;
}

const DEMO_DTCS = [
  { code: "P0300", desc: "Random/Multiple Cylinder Misfire", descAr: "اشتعال عشوائي في أسطوانات متعددة", severity: "critical" },
  { code: "P0234", desc: "Turbocharger Overboost Condition", descAr: "ضغط مبالغ في التوربو", severity: "high" },
  { code: "P0420", desc: "Catalyst System Efficiency Below Threshold", descAr: "كفاءة المحفز أقل من الحد", severity: "medium" },
  { code: "B0083", desc: "Front Impact Sensor LH – Circuit Short", descAr: "قصر في مستشعر تأثير أمامي", severity: "high" },
];

const QUICK_ACTIONS = [
  { icon: Sparkles, labelAr: "شخّص جميع الأعطال", labelEn: "Diagnose all faults", color: "text-blue-400" },
  { icon: DollarSign, labelAr: "قدّر تكلفة الإصلاح", labelEn: "Estimate repair cost", color: "text-emerald-400" },
  { icon: ListOrdered, labelAr: "رتّب الأعطال بالأولوية", labelEn: "Prioritize repairs", color: "text-amber-400" },
  { icon: BookOpen, labelAr: "خطوات الإصلاح التفصيلية", labelEn: "Step-by-step repair guide", color: "text-violet-400" },
];

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="bg-white/10 px-1 rounded text-blue-300 font-mono text-[11px]">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-white font-bold text-[13px] mt-3 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-white font-bold text-[14px] mt-3 mb-1">{line.slice(2)}</h2>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-white text-[12px]">{line.slice(2, -2)}</p>;
        if (line.startsWith("- ") || line.startsWith("• ")) return (
          <div key={i} className="flex gap-2 text-[12px] text-slate-300">
            <span className="text-primary mt-0.5 shrink-0">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        if (/^\d+\./.test(line)) {
          const match = line.match(/^(\d+)\.\s*(.*)/);
          if (match) return (
            <div key={i} className="flex gap-2 text-[12px] text-slate-300">
              <span className="text-primary font-bold shrink-0 w-4">{match[1]}.</span>
              <span><InlineMarkdown text={match[2]} /></span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-[12px] text-slate-300 leading-relaxed"><InlineMarkdown text={line} /></p>
        );
      })}
    </div>
  );
}

export default function AiChatPage() {
  const { lang, dir } = useI18n();
  const { activeVehicle } = useActiveVehicle();
  const isAr = lang === "ar";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingTextRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem("autel-ai-chat-v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Message[];
        setMessages(parsed.slice(-20).map(m => ({ ...m, isStreaming: false })));
      } catch {}
    }
    return () => {
      abortRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.some(m => m.isStreaming)) return;
    localStorage.setItem("autel-ai-chat-v2", JSON.stringify(messages.slice(-20)));
  }, [messages]);

  const buildSystemPrompt = useCallback(() => {
    const vehiclePart = activeVehicle
      ? `المركبة: ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}${activeVehicle.vin ? ` (VIN: ${activeVehicle.vin})` : ""}.`
      : "";
    const dtcPart = DEMO_DTCS.map(d => `${d.code}: ${isAr ? d.descAr : d.desc} [${d.severity}]`).join(", ");
    return isAr
      ? `أنت مساعد تشخيص سيارات خبير لجهاز Autel MaxiSYS MS Ultra S2. ${vehiclePart} الأعطال النشطة: ${dtcPart}. أجب بالعربية بشكل عملي ومباشر. ابدأ بالسبب الأرجح، ثم خطوات الفحص، ثم مستوى الخطورة، ثم تقدير الوقت والتكلفة عند الحاجة. لا تطل إذا كان السؤال بسيطاً.`
      : `You are an expert automotive diagnostic AI for Autel MaxiSYS MS Ultra S2. ${vehiclePart} Active DTCs: ${dtcPart}. Be practical and direct. Start with the most likely cause, then test steps, urgency, and time/cost when useful. Keep simple questions concise.`;
  }, [activeVehicle, isAr]);

  const flushStreamingText = useCallback(() => {
    rafRef.current = null;
    const nextText = pendingTextRef.current;
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 ? { ...m, content: nextText } : m
    ));
  }, []);

  const queueStreamingText = useCallback((text: string) => {
    pendingTextRef.current = text;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushStreamingText);
    }
  }, [flushStreamingText]);

  function stopResponse() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStatus("");
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 && m.role === "assistant" ? { ...m, isStreaming: false } : m
    ));
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setStatus(isAr ? "تحليل سريع للبيانات..." : "Analyzing data...");

    const userMsg: Message = { role: "user", content: msg, ts: Date.now() };
    const assistantMsg: Message = { role: "assistant", content: "", ts: Date.now() + 1, isStreaming: true };
    const prompt = buildSystemPrompt();
    const cacheKey = JSON.stringify({ msg, prompt, lang }).toLowerCase().replace(/\s+/g, " ");
    const cached = cacheRef.current.get(cacheKey);

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    if (cached) {
      setStatus(isAr ? "تم جلب رد محفوظ عالي السرعة" : "Loaded high-speed cached answer");
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: cached, isStreaming: false } : m
      ));
      setLoading(false);
      setTimeout(() => setStatus(""), 900);
      return;
    }

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch(`${BASE}/api/ai/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: msg,
          systemPrompt: prompt,
          history: messages.filter(m => !m.isStreaming).slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let buf = "";
      setStatus(isAr ? "الرد يصل الآن..." : "Streaming answer...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line || line === "[DONE]") continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.delta?.text) {
              aiText += parsed.delta.text;
              queueStreamingText(aiText);
            }
          } catch {}
        }
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingTextRef.current = aiText;
      cacheRef.current.set(cacheKey, aiText);
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: aiText, isStreaming: false } : m
      ));
      setStatus(isAr ? "تم التحليل" : "Analysis complete");
      setTimeout(() => setStatus(""), 900);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, content: isAr ? "تعذر الاتصال بخدمة التشخيص الآن. أعد المحاولة أو استخدم أحد الأكواد السريعة من القائمة." : "The diagnostic service is unavailable. Please retry or use a quick DTC action from the list.", isStreaming: false }
          : m
      ));
    } finally {
      abortRef.current = null;
      setLoading(false);
      if (!status) setStatus("");
    }
  }

  function handleQuickAction(idx: number) {
    const prompts = isAr
      ? [
          `شخّص جميع الأعطال النشطة (${DEMO_DTCS.map(d => d.code).join(", ")}) وأعطِ تقييماً شاملاً لحالة المركبة`,
          `قدّر تكلفة إصلاح جميع الأعطال النشطة بالريال السعودي مع ذكر أسعار القطع والعمالة`,
          `رتّب الأعطال النشطة حسب الخطورة والأولوية، وابدأ بالأكثر تأثيراً على سلامة المركبة`,
          `أعطِني دليلاً تفصيلياً خطوة بخطوة لإصلاح أهم عطل في القائمة`,
        ]
      : [
          `Diagnose all active DTCs (${DEMO_DTCS.map(d => d.code).join(", ")}) and give a comprehensive vehicle assessment`,
          `Estimate repair costs for all active faults in SAR with parts and labor breakdown`,
          `Prioritize all active DTCs by urgency and safety impact, starting with the most critical`,
          `Give me a detailed step-by-step repair guide for the most critical fault`,
        ];
    send(prompts[idx]);
  }

  function copyMessage(content: string, idx: number) {
    navigator.clipboard.writeText(content);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = isAr ? "ar-SA" : "en-US";
    recognitionRef.current.continuous = false;
    recognitionRef.current.onstart = () => setListening(true);
    recognitionRef.current.onend = () => setListening(false);
    recognitionRef.current.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) setInput(transcript);
    };
    recognitionRef.current.start();
  }

  const severityColor = (s: string) =>
    s === "critical" ? "text-red-400 bg-red-500/10 border-red-500/20"
    : s === "high" ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
    : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <div className="flex h-full" dir={dir}>
      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-72 shrink-0 bg-[#0d1117] border-e border-white/[0.07] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-white">{isAr ? "مساعد التشخيص الذكي" : "AI Diagnostic Assistant"}</div>
              <div className="text-[9px] text-blue-400 font-mono">CLAUDE • AUTEL MAXISYS</div>
            </div>
          </div>
        </div>

        {/* Vehicle context */}
        <div className="px-3 py-2.5 border-b border-white/[0.05]">
          <div className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-2">
            {isAr ? "المركبة النشطة" : "ACTIVE VEHICLE"}
          </div>
          {activeVehicle ? (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Car className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-white">{activeVehicle.year} {activeVehicle.make}</div>
                <div className="text-[10px] text-slate-400">{activeVehicle.model}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[10px] text-amber-400">{isAr ? "لا توجد مركبة محددة" : "No vehicle selected"}</span>
            </div>
          )}
        </div>

        {/* Active DTCs */}
        <div className="px-3 py-2.5 border-b border-white/[0.05] flex-1 overflow-auto">
          <div className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-2">
            {isAr ? "الأعطال النشطة" : "ACTIVE DTCs"} ({DEMO_DTCS.length})
          </div>
          <div className="flex flex-col gap-1.5">
            {DEMO_DTCS.map(dtc => (
              <button
                key={dtc.code}
                onClick={() => setInput(isAr ? `ما هو عطل ${dtc.code} وكيف أصلحه؟` : `What is ${dtc.code} and how to fix it?`)}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all text-start w-full"
              >
                <span className={cn("text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border", severityColor(dtc.severity))}>
                  {dtc.code}
                </span>
                <span className="text-[10px] text-slate-400 line-clamp-1 flex-1">
                  {isAr ? dtc.descAr : dtc.desc}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-3 py-2.5">
          <div className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-2">
            {isAr ? "إجراءات سريعة" : "QUICK ACTIONS"}
          </div>
          <div className="flex flex-col gap-1">
            {QUICK_ACTIONS.map((a, i) => {
              const QIcon = a.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleQuickAction(i)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all w-full disabled:opacity-40"
                >
                  <QIcon className={cn("w-3.5 h-3.5 shrink-0", a.color)} />
                  <span className="text-[10px] font-medium text-slate-300">{isAr ? a.labelAr : a.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 shrink-0 flex items-center justify-between px-5 bg-[#0d1117]/60 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-[12px] font-bold text-white">
              {isAr ? "محادثة التشخيص بالذكاء الاصطناعي" : "AI Diagnostic Chat"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-mono">
              HIGH PERFORMANCE
            </span>
            {status && <span className="text-[9px] text-slate-500">{status}</span>}
          </div>
          <div className="flex items-center gap-2">
          {loading && (
            <button
              onClick={stopResponse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/15 transition-all"
            >
              <X className="w-3 h-3" />
              {isAr ? "إيقاف" : "Stop"}
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/15 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              {isAr ? "مسح" : "Clear"}
            </button>
          )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-[16px] font-bold text-white mb-2">
                {isAr ? "مساعد التشخيص الذكي" : "AI Diagnostic Assistant"}
              </h2>
              <p className="text-[12px] text-slate-500 max-w-sm leading-relaxed mb-6">
                {isAr
                  ? "اسألني عن أي عطل، وسأشخّصه وأقدّم لك خطوات الإصلاح وتكاليف القطع بدقة احترافية"
                  : "Ask me about any fault code and I'll diagnose it, provide repair steps, and estimate costs with professional accuracy"
                }
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {(isAr ? [
                  "ما معنى كود P0300 وكيف أصلحه؟",
                  "ما هي أعراض مشكلة التوربو؟",
                  "كيف أتحقق من حساس الأكسجين؟",
                  "ما تكلفة إصلاح المحفز الحراري؟",
                ] : [
                  "What does P0300 mean and how to fix it?",
                  "What are symptoms of a turbo problem?",
                  "How do I test an O2 sensor?",
                  "What's the cost to fix a catalytic converter?",
                ]).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-blue-500/30 hover:bg-blue-500/5 text-[11px] text-slate-400 hover:text-white transition-all text-start"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
                {/* Avatar */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  msg.role === "assistant" ? "bg-blue-500/15 border border-blue-500/30" : "bg-primary/15 border border-primary/30"
                )}>
                  {msg.role === "assistant"
                    ? <Bot className="w-4 h-4 text-blue-400" />
                    : <span className="text-[10px] font-bold text-primary">أ</span>
                  }
                </div>

                {/* Bubble */}
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 relative group",
                  msg.role === "assistant"
                    ? "bg-white/[0.03] border border-white/[0.07]"
                    : "bg-primary/10 border border-primary/20"
                )}>
                  {msg.role === "assistant"
                    ? <MarkdownText text={msg.content || (msg.isStreaming ? "..." : "")} />
                    : <p className="text-[12px] text-white leading-relaxed">{msg.content}</p>
                  }

                  {msg.isStreaming && (
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}

                  {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.content, idx)}
                      className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10"
                    >
                      {copied === idx
                        ? <Check className="w-3 h-3 text-emerald-400" />
                        : <Copy className="w-3 h-3 text-slate-500" />
                      }
                    </button>
                  )}

                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[9px] text-slate-600">
                      {new Date(msg.ts).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.role === "assistant" && !msg.isStreaming && (
                      <span className="text-[9px] text-blue-500/60 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 bg-[#0d1117]/60 border-t border-white/[0.06]">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={isAr ? "اسأل عن أي عطل أو مشكلة في المركبة..." : "Ask about any fault code or vehicle issue..."}
                rows={1}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-[12px] text-white placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] transition-all"
                style={{ minHeight: 44, maxHeight: 120 }}
                dir={dir}
              />
            </div>
            <button
              onClick={listening ? () => recognitionRef.current?.stop() : startVoice}
              className={cn(
                "w-11 h-11 rounded-xl border flex items-center justify-center transition-all shrink-0",
                listening
                  ? "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse"
                  : "bg-white/[0.04] border-white/[0.1] text-slate-400 hover:text-white hover:border-white/20"
              )}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0"
            >
              {loading
                ? <RefreshCw className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
          <p className="text-[9px] text-slate-700 mt-1.5 text-center">
            {isAr ? "Enter للإرسال • Shift+Enter لسطر جديد • يدعم الصوت" : "Enter to send • Shift+Enter for new line • Voice supported"}
          </p>
        </div>
      </div>
    </div>
  );
}
