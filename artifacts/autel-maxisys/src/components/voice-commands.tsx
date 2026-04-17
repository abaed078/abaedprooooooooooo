import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Mic, MicOff, X, Volume2, Loader2, Radio } from "lucide-react";

interface VoiceCommand { patterns: string[]; action: () => void; labelAr: string; labelEn: string; }

export function VoiceCommandsButton() {
  const { lang } = useI18n();
  const [, navigate] = useLocation();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [heyMaxMode, setHeyMaxMode] = useState(false);
  const [heyMaxReady, setHeyMaxReady] = useState(false);
  const recognitionRef = useRef<any>(null);
  const heyMaxRecRef = useRef<any>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  };

  const COMMANDS: VoiceCommand[] = [
    { patterns: ["dashboard","الرئيسية","رئيسية"],      action: () => navigate("/"),               labelAr: "افتح الرئيسية",         labelEn: "Open Dashboard"     },
    { patterns: ["vehicles","مركبات","السيارات"],        action: () => navigate("/vehicles"),       labelAr: "افتح المركبات",         labelEn: "Open Vehicles"      },
    { patterns: ["live scan","فحص حي","فحص مباشر"],     action: () => navigate("/live-scan"),      labelAr: "افتح الفحص الحي",       labelEn: "Open Live Scan"     },
    { patterns: ["oscilloscope","أوسيلوسكوب"],          action: () => navigate("/oscilloscope"),   labelAr: "افتح الأوسيلوسكوب",    labelEn: "Open Oscilloscope"  },
    { patterns: ["battery","بطارية","البطارية"],        action: () => navigate("/battery"),        labelAr: "افتح محلل البطارية",    labelEn: "Open Battery"       },
    { patterns: ["full scan","فحص شامل","فحص كامل"],   action: () => navigate("/full-scan"),      labelAr: "افتح الفحص الشامل",    labelEn: "Open Full Scan"     },
    { patterns: ["adas","تعادس"],                        action: () => navigate("/adas"),           labelAr: "افتح ADAS",             labelEn: "Open ADAS"          },
    { patterns: ["maintenance","صيانة","الصيانة"],      action: () => navigate("/maintenance"),    labelAr: "افتح الصيانة",          labelEn: "Open Maintenance"   },
    { patterns: ["reports","تقارير","التقارير"],        action: () => navigate("/reports"),        labelAr: "افتح التقارير",         labelEn: "Open Reports"       },
    { patterns: ["settings","إعدادات","الإعدادات"],     action: () => navigate("/settings"),       labelAr: "افتح الإعدادات",        labelEn: "Open Settings"      },
    { patterns: ["statistics","إحصائيات","احصائيات"],  action: () => navigate("/stats"),          labelAr: "افتح الإحصائيات",      labelEn: "Open Statistics"    },
    { patterns: ["monitors","مراقبات","مراقب"],         action: () => navigate("/monitors"),       labelAr: "افتح مراقبات OBD",     labelEn: "Open OBD Monitors"  },
    { patterns: ["predictive","تنبؤية","توقع"],         action: () => navigate("/predictive"),     labelAr: "افتح الصيانة التنبؤية", labelEn: "Open Predictive AI" },
    { patterns: ["dtc","أكواد","كود خطأ"],              action: () => navigate("/dtc-lookup"),     labelAr: "افتح مكتبة الأكواد",   labelEn: "Open DTC Library"   },
    { patterns: ["inspection","فحص","كاميرا"],          action: () => navigate("/inspection"),     labelAr: "افتح كاميرا الفحص",    labelEn: "Open Inspection"    },
    { patterns: ["tpms","إطارات","ضغط"],               action: () => navigate("/tpms"),           labelAr: "افتح TPMS",            labelEn: "Open TPMS"          },
    { patterns: ["topology","شبكة","ecu map"],          action: () => navigate("/topology"),       labelAr: "افتح خريطة ECU",       labelEn: "Open Topology"      },
    { patterns: ["ev","كهربائي","electric"],            action: () => navigate("/ev-diagnostics"), labelAr: "افتح تشخيص EV",        labelEn: "Open EV Diagnostics"},
    { patterns: ["wiring","أسلاك","دوائر"],             action: () => navigate("/wiring"),         labelAr: "افتح رسومات الأسلاك",  labelEn: "Open Wiring"        },
    { patterns: ["dvi","فحص شامل للسيارة"],             action: () => navigate("/dvi"),            labelAr: "افتح فحص DVI",         labelEn: "Open DVI"           },
    { patterns: ["parts","قطع غيار","قطع"],             action: () => navigate("/parts"),          labelAr: "افتح قطع الغيار",      labelEn: "Open Parts Catalog" },
    { patterns: ["key","مفاتيح","برمجة مفاتيح"],       action: () => navigate("/key-programming"),labelAr: "افتح برمجة المفاتيح",  labelEn: "Open Key Prog."     },
  ];

  const processTranscript = (text: string) => {
    const lower = text.toLowerCase();
    for (const cmd of COMMANDS) {
      if (cmd.patterns.some(p => lower.includes(p))) {
        cmd.action();
        showFeedback(lang === "ar" ? `✓ ${cmd.labelAr}` : `✓ ${cmd.labelEn}`);
        return;
      }
    }
    showFeedback(lang === "ar" ? `لم أفهم: "${text}"` : `Not recognized: "${text}"`);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showFeedback(lang === "ar" ? "المتصفح لا يدعم الأوامر الصوتية" : "Browser does not support speech recognition");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === "ar" ? "ar-SA" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) processTranscript(t);
    };
    recognition.onend = () => { setListening(false); setTranscript(""); };
    recognition.onerror = () => { setListening(false); setTranscript(""); };
    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  // Hey Max continuous background listener
  const startHeyMax = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = lang === "ar" ? "ar-SA" : "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript.toLowerCase();
      if (text.includes("hey max") || text.includes("هي ماكس") || text.includes("ماكس")) {
        setHeyMaxReady(true);
        showFeedback(lang === "ar" ? "🎙️ نعم؟ ماذا تريد؟" : "🎙️ Yes? What would you like?");
        setTimeout(() => {
          setHeyMaxReady(false);
          startListening();
        }, 500);
      }
    };
    rec.onend = () => { if (heyMaxMode) rec.start(); };
    rec.start();
    heyMaxRecRef.current = rec;
    setHeyMaxMode(true);
  };

  const stopHeyMax = () => {
    heyMaxRecRef.current?.stop();
    setHeyMaxMode(false);
    setHeyMaxReady(false);
  };

  useEffect(() => { return () => { stopListening(); stopHeyMax(); }; }, []);

  return (
    <>
      {/* Hey Max pulse indicator */}
      {heyMaxMode && (
        <div className={cn("fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full border shadow-2xl transition-all",
          heyMaxReady ? "bg-primary/30 border-primary text-primary animate-pulse" : "bg-[#0a0e1a]/90 border-border/60 text-muted-foreground"
        )}>
          <Radio className={cn("w-3.5 h-3.5", heyMaxMode && !heyMaxReady ? "animate-pulse" : "")} />
          <span className="text-[10px] font-bold">{heyMaxReady ? 'استمع...' : 'قل "Hey Max" للتفعيل'}</span>
        </div>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div className="fixed bottom-20 right-4 z-50 px-4 py-2 rounded-xl bg-[#0a0e1a]/95 border border-border text-xs font-bold shadow-2xl animate-in slide-in-from-bottom-4">
          {feedback}
        </div>
      )}

      {/* Listening overlay */}
      {listening && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0a0e1a]/95 border border-primary/40 shadow-2xl backdrop-blur">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-primary font-bold">{transcript || (lang === "ar" ? "جارٍ الاستماع..." : "Listening...")}</span>
          </div>
        </div>
      )}

      {/* Voice panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-sm bg-[#0a0e1a] border border-border rounded-2xl p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">الأوامر الصوتية</div>
                <div className="text-[10px] text-muted-foreground">Voice Commands · "Hey Max" Mode</div>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hey Max toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2">
                <Radio className={cn("w-4 h-4", heyMaxMode ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-xs font-bold">وضع "Hey Max"</div>
                  <div className="text-[9px] text-muted-foreground">استمع تلقائياً بكلمة تفعيل</div>
                </div>
              </div>
              <button onClick={heyMaxMode ? stopHeyMax : startHeyMax}
                className={cn("relative w-10 h-5 rounded-full transition-all", heyMaxMode ? "bg-primary" : "bg-muted")}>
                <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", heyMaxMode ? "left-5" : "left-0.5")} />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground mb-2">أوامر متاحة</div>
              <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto">
                {COMMANDS.map(cmd => (
                  <button key={cmd.labelAr} onClick={() => { cmd.action(); setShowPanel(false); }}
                    className="text-right px-3 py-2 rounded-lg border border-border bg-background text-[10px] hover:border-primary/40 hover:bg-primary/5 transition-all">
                    {lang === "ar" ? cmd.labelAr : cmd.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { listening ? stopListening() : startListening(); }}
                className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                  listening ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25"
                )}>
                {listening ? <><MicOff className="w-3.5 h-3.5" /> إيقاف</> : <><Mic className="w-3.5 h-3.5" /> استمع الآن</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger button in top bar */}
      <button onClick={() => setShowPanel(true)}
        className={cn("relative flex items-center justify-center w-8 h-8 rounded-xl transition-all border",
          heyMaxMode ? "bg-primary/20 border-primary/50 text-primary" : listening ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
        )}>
        {listening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        {heyMaxMode && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />}
      </button>
    </>
  );
}
