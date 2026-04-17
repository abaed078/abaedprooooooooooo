import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Sparkles, AlertTriangle, ChevronDown, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useActiveVehicle } from "@/lib/vehicle-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const QUICK_PROMPTS_AR = [
  "ما معنى كود P0300؟",
  "اشرح لي أعراض عطل ABS",
  "كيف أعيد ضبط مستشعر الأكسجين؟",
  "ما أسباب ارتفاع درجة حرارة المحرك؟",
];
const QUICK_PROMPTS_EN = [
  "What does P0300 mean?",
  "Explain ABS fault symptoms",
  "How do I reset O2 sensor?",
  "What causes engine overheating?",
];

export default function AiAssistant() {
  const { lang, dir } = useI18n();
  const { activeVehicle } = useActiveVehicle();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAr = lang === "ar";
  const quickPrompts = isAr ? QUICK_PROMPTS_AR : QUICK_PROMPTS_EN;

  useEffect(() => {
    if (open && !minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, minimized]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const vehicleCtx = activeVehicle
      ? `Vehicle context: ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}${activeVehicle.engineCode ? ` (${activeVehicle.engineCode})` : ""}. `
      : "";

    const systemPrompt = isAr
      ? `أنت مساعد تشخيص سيارات متخصص لجهاز Autel MaxiSYS MS Ultra S2. ${vehicleCtx}أجب بشكل واضح ومختصر باللغة العربية. ركز على الحلول العملية.`
      : `You are an expert automotive diagnostic assistant for the Autel MaxiSYS MS Ultra S2. ${vehicleCtx}Provide clear, concise technical answers. Focus on practical solutions.`;

    try {
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          systemPrompt,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantMsg: Message = { role: "assistant", content: "", ts: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const json = JSON.parse(data);
              const delta = json.delta?.text ?? json.choices?.[0]?.delta?.content ?? "";
              assistantText += delta;
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantText } : m
              ));
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: isAr ? "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." : "Connection error. Please try again.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl",
            "bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500/40 shadow-2xl shadow-blue-900/60",
            "text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all",
            dir === "rtl" ? "left-6" : "right-6"
          )}
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span>{isAr ? "مساعد الذكاء الاصطناعي" : "AI Diagnostic"}</span>
          <Sparkles className="w-3.5 h-3.5 opacity-70" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-4 z-50 flex flex-col rounded-2xl overflow-hidden",
            "bg-[#0d1117] border border-white/[0.08] shadow-2xl shadow-black/80",
            "transition-all duration-300",
            minimized ? "h-12 w-72" : "w-[420px] h-[580px]",
            dir === "rtl" ? "left-4" : "right-4"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-900/60 to-[#0d1117] border-b border-white/[0.06] shrink-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/30">
              <Bot className="w-4 h-4 text-blue-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0d1117] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">
                {isAr ? "مساعد التشخيص AI" : "AI Diagnostic Assistant"}
              </p>
              {!minimized && (
                <p className="text-[10px] text-blue-400/70 leading-tight">
                  {isAr ? "مدعوم بـ Claude · Autel MaxiSYS" : "Powered by Claude · Autel MaxiSYS"}
                </p>
              )}
            </div>
            <button onClick={() => setMinimized(!minimized)} className="text-slate-500 hover:text-white transition-colors p-1">
              <ChevronDown className={cn("w-4 h-4 transition-transform", minimized ? "rotate-180" : "")} />
            </button>
            <button onClick={() => { setOpen(false); setMinimized(false); }} className="text-slate-500 hover:text-red-400 transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Active Vehicle Context */}
              {activeVehicle && (
                <div className="px-4 py-2 bg-blue-500/5 border-b border-white/[0.04] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-[11px] text-blue-300/70">
                    {isAr ? "المركبة النشطة:" : "Active vehicle:"}{" "}
                    <span className="font-semibold text-blue-300">{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</span>
                  </span>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth" dir={dir}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                      <Bot className="w-7 h-7 text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white mb-1">
                        {isAr ? "مساعدك التشخيصي الذكي" : "Your Smart Diagnostic Assistant"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isAr ? "اسأل عن أي كود خطأ أو عطل أو إجراء صيانة" : "Ask about any fault code, symptom, or repair procedure"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 w-full">
                      {quickPrompts.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => send(p)}
                          className="text-left px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-blue-500/30 text-xs text-slate-400 hover:text-slate-200 transition-all"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-2", m.role === "user" ? (dir === "rtl" ? "flex-row" : "flex-row-reverse") : "flex-row")}>
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-white/[0.05] border border-white/[0.07] text-slate-200 rounded-tl-sm"
                    )}>
                      {m.content || (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-xs">{isAr ? "يكتب..." : "Typing..."}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-white/[0.06] bg-[#0d1117] shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-blue-500/50 transition-colors">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder={isAr ? "اسأل عن أي عطل أو كود..." : "Ask about any fault or code..."}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none min-w-0"
                    dir={dir}
                    disabled={loading}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                  >
                    {loading
                      ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      : <Send className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 text-center mt-1.5">
                  {isAr ? "Claude AI · Autel MaxiSYS MS Ultra S2" : "Claude AI · Autel MaxiSYS MS Ultra S2"}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
