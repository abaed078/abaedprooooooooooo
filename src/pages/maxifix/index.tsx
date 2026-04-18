import { useState } from "react";
import { Search, ThumbsUp, MessageCircle, BookOpen, Star, TrendingUp, Filter, ChevronRight, Badge, Tag, Clock, User, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const POSTS = [
  {
    id:1, votes:247, replies:18, views:3420, verified:true, saved:true,
    dtc:"P0171",  title:"Toyota Camry 2018 — P0171 System Too Lean Bank 1",
    vehicle:"Toyota Camry 2.5L 2AR-FE 2018",
    symptom:"خشونة عند التشغيل البارد، أوكسجين يقرأ 0.1–0.2V باستمرار",
    fix:"استبدال MAF sensor + تنظيف throttle body + تحقق من تسريبات intake manifold gasket",
    parts:["MAF Sensor — Denso 197400-2030","Intake Gasket Set"],
    cost:"$85–$140", time:"1.5 ساعة", difficulty:"متوسط",
    author:"Ahmad_Tech", date:"2025-12-14", tags:["Toyota","Lean","MAF"],
  },
  {
    id:2, votes:189, replies:12, views:2180, verified:true, saved:false,
    dtc:"P0300",  title:"Honda CR-V 2020 — P0300 Random Misfire",
    vehicle:"Honda CR-V 1.5T L15B7 2020",
    symptom:"اهتزاز عند أكثر من 2500 RPM، استهلاك وقود مرتفع",
    fix:"استبدال شمعات الإشعال + كابلات عالية الجهد + فحص injector #3",
    parts:["NGK Iridium Plugs — SILZKR7B-11S x4","Injector Cleaner"],
    cost:"$60–$120", time:"2 ساعة", difficulty:"سهل",
    author:"KSA_Workshop", date:"2025-11-28", tags:["Honda","Misfire","Plugs"],
  },
  {
    id:3, votes:312, replies:31, views:5600, verified:true, saved:false,
    dtc:"C0035",  title:"GM Silverado 2019 — ABS Wheel Speed Sensor FL",
    vehicle:"Chevrolet Silverado 5.3L EcoTec3 2019",
    symptom:"تحذير ABS، عجلة أمامية يسرى لا تقرأ سرعة تحت 20 km/h",
    fix:"استبدال مستشعر WSS أمامي أيسر — فحص الحلقة المسننة (tone ring) من الصدأ",
    parts:["WSS Sensor — ACDelco 20860261","Tone Ring Inspect"],
    cost:"$45–$95", time:"1 ساعة", difficulty:"سهل",
    author:"Detroit_Diag", date:"2025-10-05", tags:["GM","ABS","WSS"],
  },
  {
    id:4, votes:98, replies:7, views:890, verified:false, saved:false,
    dtc:"B0012",  title:"BMW 3 Series 2016 — SRS Passenger Airbag Stage 1",
    vehicle:"BMW 320i F30 B48 2016",
    symptom:"مصباح وسادة هوائية يضيء، رمز B0012 ثابت",
    fix:"فحص connector الوسادة تحت المقعد الأمامي — تأكد من تركيب المقعد الصحيح بعد فكه",
    parts:["SRS Connector Clip","Seat Airbag Harness"],
    cost:"$0–$30", time:"30 دقيقة", difficulty:"سهل",
    author:"Euro_Expert", date:"2025-09-18", tags:["BMW","SRS","Airbag"],
  },
  {
    id:5, votes:445, replies:52, views:8900, verified:true, saved:true,
    dtc:"P0420",  title:"حل نهائي P0420 — محفز مؤكسد ثلاثي",
    vehicle:"جميع الطرازات 2010–2024",
    symptom:"P0420 يعود بعد مسحه، O2 downstream ثابت",
    fix:"1) فحص تسريبات العادم قبل المحفز\n2) اختبار O2 upstream: يجب التذبذب 0.1–0.9V\n3) اختبار O2 downstream: يجب أن يكون ثابتاً عند 0.6V\n4) إذا فشلت الخطوات → استبدال المحفز (OEM أو Bosch)",
    parts:["Catalytic Converter — OEM or Bosch","O2 Sensor Upstream"],
    cost:"$200–$800", time:"2–4 ساعات", difficulty:"متقدم",
    author:"MaxiSYS_Pro", date:"2025-08-02", tags:["Universal","P0420","Catalytic"],
  },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  "سهل": "text-green-400 border-green-500/30 bg-green-500/10",
  "متوسط": "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  "متقدم": "text-red-400 border-red-500/30 bg-red-500/10",
};

function PostCard({ post, onClick }: { post: typeof POSTS[0]; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="rounded-xl border border-border bg-card hover:border-white/20 cursor-pointer transition-all group p-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 flex flex-col items-center gap-1 w-12 text-center">
          <ThumbsUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-black text-primary">{post.votes}</span>
          <span className="text-[9px] text-muted-foreground">تصويت</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-bold">{post.dtc}</span>
            {post.verified && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-400 font-bold">✓ موثّق</span>}
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${DIFFICULTY_COLOR[post.difficulty]}`}>{post.difficulty}</span>
          </div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{post.title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{post.vehicle}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.replies}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.date}</span>
            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{post.cost}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all shrink-0" />
      </div>
    </div>
  );
}

function PostDetail({ post, onClose }: { post: typeof POSTS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0e1a] border border-border rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 px-5 py-4 border-b border-border bg-[#0a0e1a] flex items-center gap-3">
          <span className="font-mono text-sm px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-black">{post.dtc}</span>
          <h2 className="font-bold text-sm flex-1 min-w-0 truncate">{post.title}</h2>
          <button onClick={onClose} className="text-muted-foreground text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4" dir="rtl">
          <div className="flex flex-wrap gap-2">
            {post.verified && <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 font-bold">✓ إصلاح موثّق</span>}
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${DIFFICULTY_COLOR[post.difficulty]}`}>{post.difficulty}</span>
            {post.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">#{t}</span>)}
          </div>
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">الأعراض</div>
            <p className="text-sm">{post.symptom}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
            <div className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">الإصلاح</div>
            <p className="text-sm whitespace-pre-line">{post.fix}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "التكلفة", value: post.cost, color: "text-green-400" },
              { label: "الوقت",   value: post.time, color: "text-blue-400"  },
              { label: "الصعوبة", value: post.difficulty, color:"text-yellow-400"},
            ].map(s => (
              <div key={s.label} className="p-2 rounded-xl border border-border bg-card">
                <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl border border-border bg-card">
            <div className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">قطع الغيار المقترحة</div>
            {post.parts.map((p, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {p}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <ThumbsUp className="w-3.5 h-3.5" /> {post.votes} تصويت
            <MessageCircle className="w-3.5 h-3.5 ml-2" /> {post.replies} رد
            <User className="w-3.5 h-3.5 ml-2" /> {post.author}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaxiFix() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof POSTS[0] | null>(null);
  const [filterTag, setFilterTag] = useState<string>("all");

  const allTags = ["all", ...Array.from(new Set(POSTS.flatMap(p => p.tags)))];
  const filtered = POSTS.filter(p => {
    const matchSearch = !search || p.dtc.includes(search.toUpperCase()) || p.title.toLowerCase().includes(search.toLowerCase()) || p.vehicle.toLowerCase().includes(search.toLowerCase());
    const matchTag = filterTag === "all" || p.tags.includes(filterTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">MaxiFix — قاعدة إصلاحات المجتمع</h1>
          <p className="text-sm text-muted-foreground">حلول موثّقة من فنيين محترفين حول العالم</p>
        </div>
        <div className="mr-auto grid grid-cols-3 gap-2 text-center">
          {[["12K+","حل موثّق"],["4.8★","التقييم"],["95%","نسبة النجاح"]].map(([v,l]) => (
            <div key={l} className="px-3 py-1.5 rounded-lg border border-border bg-card">
              <div className="text-sm font-black text-primary">{v}</div>
              <div className="text-[9px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث برمز DTC أو اسم مركبة..."
            className="w-full bg-card border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-1">
          {allTags.slice(0, 5).map(t => (
            <button key={t} onClick={() => setFilterTag(t)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filterTag === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {t === "all" ? "الكل" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(p => <PostCard key={p.id} post={p} onClick={() => setSelected(p)} />)}
      </div>

      {selected && <PostDetail post={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
