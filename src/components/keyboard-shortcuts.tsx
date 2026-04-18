import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { X, Keyboard } from "lucide-react";

interface Shortcut { key: string; descEn: string; descAr: string; }

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { key: "?",       descEn: "Show keyboard shortcuts",  descAr: "عرض اختصارات لوحة المفاتيح" },
  { key: "Alt+D",   descEn: "Go to Dashboard",          descAr: "الانتقال إلى الرئيسية" },
  { key: "Alt+S",   descEn: "Go to Live Scan",          descAr: "الانتقال إلى الفحص الحي" },
  { key: "Alt+O",   descEn: "Go to Oscilloscope",       descAr: "الانتقال إلى الأوسيلوسكوب" },
  { key: "Alt+F",   descEn: "Go to Full Scan",          descAr: "الانتقال إلى الفحص الشامل" },
  { key: "Alt+B",   descEn: "Go to Battery Analyzer",   descAr: "الانتقال إلى محلل البطارية" },
  { key: "Alt+M",   descEn: "Go to OBD Monitors",       descAr: "الانتقال إلى مراقبات OBD" },
  { key: "Alt+V",   descEn: "Toggle Voice Commands",     descAr: "تشغيل/إيقاف الأوامر الصوتية" },
  { key: "Esc",     descEn: "Close any open panel",      descAr: "إغلاق أي لوحة مفتوحة" },
];

const PAGE_SHORTCUTS: Record<string, Shortcut[]> = {
  "/live-scan": [
    { key: "Space", descEn: "Pause / Resume live data",  descAr: "إيقاف / استئناف البيانات الحية" },
    { key: "E",     descEn: "Export to Excel",           descAr: "تصدير إلى Excel" },
    { key: "G",     descEn: "Toggle graph mode",         descAr: "تبديل وضع الرسم البياني" },
  ],
  "/oscilloscope": [
    { key: "Space", descEn: "Freeze / Unfreeze waveform",descAr: "تجميد / إلغاء تجميد الموجة" },
    { key: "S",     descEn: "Save reference waveform",   descAr: "حفظ الموجة المرجعية" },
    { key: "C",     descEn: "Toggle CH2",                descAr: "تشغيل/إيقاف القناة الثانية" },
    { key: "F",     descEn: "Toggle fullscreen",         descAr: "تشغيل/إيقاف وضع ملء الشاشة" },
  ],
  "/guided-diag": [
    { key: "Enter", descEn: "Pass — go to next step",   descAr: "ناجح — الانتقال للخطوة التالية" },
    { key: "F",     descEn: "Fail — direct conclusion",  descAr: "فاشل — الانتقال للنتيجة" },
    { key: "Esc",   descEn: "Back one step",             descAr: "رجوع خطوة" },
    { key: "R",     descEn: "Restart diagnostic tree",   descAr: "إعادة بدء شجرة التشخيص" },
  ],
  "/full-scan": [
    { key: "Space", descEn: "Start / Stop scan",         descAr: "بدء / إيقاف الفحص" },
    { key: "E",     descEn: "Expand all systems",        descAr: "توسيع جميع الأنظمة" },
  ],
};

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const { lang } = useI18n();
  const [location] = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?") { e.preventDefault(); setOpen(v => !v); }
      if (e.key === "Escape") setOpen(false);
      // Global nav shortcuts
      if (e.altKey) {
        const navMap: Record<string, string> = {
          d: "/", s: "/live-scan", o: "/oscilloscope",
          f: "/full-scan", b: "/battery", m: "/monitors"
        };
        if (navMap[e.key.toLowerCase()]) {
          e.preventDefault();
          window.location.href = window.location.pathname.split("/autel")[0] + "/autel-maxisys" + navMap[e.key.toLowerCase()];
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  const pageShortcuts = PAGE_SHORTCUTS[location] || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}>
      <div
        className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">
                {lang === "ar" ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}
              </div>
              <div className="text-[10px] text-slate-500">{lang === "ar" ? "اضغط ? مرة أخرى للإغلاق" : "Press ? again to close"}</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              {lang === "ar" ? "اختصارات عامة" : "GLOBAL"}
            </div>
            <div className="space-y-1.5">
              {GLOBAL_SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{lang === "ar" ? s.descAr : s.descEn}</span>
                  <kbd className="px-2 py-0.5 bg-white/[0.07] border border-white/10 rounded-md text-[10px] font-mono text-slate-300">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {pageShortcuts.length > 0 && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                {lang === "ar" ? "الصفحة الحالية" : "CURRENT PAGE"}
              </div>
              <div className="space-y-1.5">
                {pageShortcuts.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{lang === "ar" ? s.descAr : s.descEn}</span>
                    <kbd className="px-2 py-0.5 bg-primary/15 border border-primary/30 rounded-md text-[10px] font-mono text-primary">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
