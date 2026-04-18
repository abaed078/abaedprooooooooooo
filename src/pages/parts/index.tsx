import { useState, useMemo } from "react";
import {
  ShoppingCart, Search, Filter, Star, Package, Truck,
  CheckCircle2, AlertTriangle, ExternalLink, ChevronDown, Tag, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Part {
  id: number;
  nameAr: string;
  nameEn: string;
  category: string;
  oem: string;
  aftermarket: string;
  brand: string;
  price: { min: number; max: number };
  availability: "in_stock" | "order" | "rare";
  rating: number;
  reviews: number;
  compatibility: string[];
  condition: "new" | "oem" | "reman";
}

const PARTS: Part[] = [
  { id:1, nameAr:"فلتر زيت محرك",       nameEn:"Engine Oil Filter",       category:"engine",   oem:"11427541827",   aftermarket:"MANN HU713/1x",  brand:"Mann",    price:{min:18,max:45},   availability:"in_stock", rating:4.8, reviews:2340, compatibility:["BMW N20","BMW N26","BMW N13"],      condition:"oem"  },
  { id:2, nameAr:"فلتر هواء",           nameEn:"Air Filter",              category:"engine",   oem:"13718576428",   aftermarket:"MANN C27006",    brand:"Mann",    price:{min:22,max:60},   availability:"in_stock", rating:4.7, reviews:1890, compatibility:["BMW N20","VW EA888"],              condition:"oem"  },
  { id:3, nameAr:"شمعة إشعال",          nameEn:"Spark Plug",              category:"engine",   oem:"12120037582",   aftermarket:"NGK ILZKR7B11",  brand:"NGK",     price:{min:12,max:32},   availability:"in_stock", rating:4.9, reviews:4200, compatibility:["BMW N20","Mercedes M274"],          condition:"new"  },
  { id:4, nameAr:"تيل فرامل أمامي",     nameEn:"Front Brake Pads",       category:"brakes",   oem:"34116797462",   aftermarket:"Brembo P06012",  brand:"Brembo",  price:{min:55,max:140},  availability:"in_stock", rating:4.8, reviews:3120, compatibility:["BMW 3 Series","BMW 5 Series"],     condition:"new"  },
  { id:5, nameAr:"قرص فرامل أمامي",     nameEn:"Front Brake Disc",       category:"brakes",   oem:"34116793246",   aftermarket:"Zimmermann",     brand:"Zimmermann",price:{min:85,max:200}, availability:"in_stock", rating:4.6, reviews:980,  compatibility:["BMW 520i","BMW 530i"],             condition:"new"  },
  { id:6, nameAr:"مساعد أمامي",         nameEn:"Front Shock Absorber",   category:"suspension",oem:"31316750417",  aftermarket:"Bilstein B4",    brand:"Bilstein",price:{min:120,max:280}, availability:"in_stock", rating:4.7, reviews:560,  compatibility:["BMW 5 Series E60","E61"],          condition:"new"  },
  { id:7, nameAr:"فلتر وقود",           nameEn:"Fuel Filter",            category:"engine",   oem:"16126765834",   aftermarket:"Hengst H70WK09", brand:"Hengst",  price:{min:28,max:75},   availability:"in_stock", rating:4.5, reviews:1200, compatibility:["BMW Diesel","Mercedes Diesel"],    condition:"oem"  },
  { id:8, nameAr:"ثرموستات تبريد",       nameEn:"Cooling Thermostat",     category:"cooling",  oem:"11517509227",   aftermarket:"Wahler 3063.80", brand:"Wahler",  price:{min:35,max:95},   availability:"in_stock", rating:4.6, reviews:870,  compatibility:["BMW N52","N53","N54"],             condition:"new"  },
  { id:9, nameAr:"حساس الأكسجين",       nameEn:"O2 Lambda Sensor",       category:"sensors",  oem:"11787558073",   aftermarket:"Bosch 0258006205",brand:"Bosch", price:{min:45,max:110},  availability:"in_stock", rating:4.7, reviews:1560, compatibility:["BMW N20","Mini Cooper"],           condition:"new"  },
  { id:10,nameAr:"بطارية 95Ah",         nameEn:"Car Battery 95Ah",       category:"electrical",oem:"61219351335",  aftermarket:"Varta Silver",   brand:"Varta",   price:{min:150,max:290}, availability:"in_stock", rating:4.8, reviews:2100, compatibility:["BMW 5 Series","7 Series"],         condition:"new"  },
  { id:11,nameAr:"مضخة ماء",            nameEn:"Water Pump",             category:"cooling",  oem:"11517632426",   aftermarket:"Graf PA1170",    brand:"Graf",    price:{min:65,max:180},  availability:"order",    rating:4.4, reviews:430,  compatibility:["BMW N20 2012-2016"],               condition:"new"  },
  { id:12,nameAr:"حزام المحرك الإطاري", nameEn:"Timing Belt Kit",        category:"engine",   oem:"11317549071",   aftermarket:"Gates K015645XS",brand:"Gates",   price:{min:180,max:420}, availability:"in_stock", rating:4.9, reviews:2900, compatibility:["VW TSI","Audi TFSI"],             condition:"new"  },
  { id:13,nameAr:"حزام الملحقات",       nameEn:"Accessory Belt",         category:"engine",   oem:"11288637634",   aftermarket:"Continental",    brand:"Continental",price:{min:25,max:65}, availability:"in_stock", rating:4.6, reviews:780,  compatibility:["BMW N20","N55","S55"],             condition:"new"  },
  { id:14,nameAr:"حساس ضغط الإطار TPMS",nameEn:"TPMS Sensor",           category:"sensors",  oem:"36236781847",   aftermarket:"Schrader EZ-sensor",brand:"Schrader",price:{min:35,max:85}, availability:"in_stock", rating:4.5, reviews:1340, compatibility:["Universal 315/433 MHz"],           condition:"new"  },
  { id:15,nameAr:"وسادة هوائية محرك",   nameEn:"Engine Mount",           category:"suspension",oem:"22116760478",  aftermarket:"Lemforder",      brand:"Lemforder",price:{min:45,max:120},  availability:"in_stock", rating:4.5, reviews:620,  compatibility:["BMW 5 Series F10","F11"],          condition:"new"  },
  { id:16,nameAr:"حقنة وقود",           nameEn:"Fuel Injector",          category:"engine",   oem:"13537585261",   aftermarket:"Bosch 0261500073",brand:"Bosch",  price:{min:85,max:220},  availability:"order",    rating:4.7, reviews:890,  compatibility:["BMW N20","N26 High Pressure"],     condition:"reman"},
  { id:17,nameAr:"صمام EGR",            nameEn:"EGR Valve",              category:"emissions",oem:"11717807329",   aftermarket:"Pierburg 7.24809.09",brand:"Pierburg",price:{min:120,max:310},availability:"order",   rating:4.3, reviews:340,  compatibility:["BMW N47 Diesel"],                  condition:"new"  },
  { id:18,nameAr:"مرشح الكابينة",       nameEn:"Cabin Air Filter",       category:"hvac",     oem:"64316945585",   aftermarket:"Mann CU2939",    brand:"Mann",    price:{min:15,max:40},   availability:"in_stock", rating:4.6, reviews:2800, compatibility:["BMW 5 Series","3 Series"],         condition:"oem"  },
];

const CATEGORIES = [
  { id: "all",        label: "الكل" },
  { id: "engine",     label: "المحرك" },
  { id: "brakes",     label: "الفرامل" },
  { id: "suspension", label: "التعليق" },
  { id: "cooling",    label: "التبريد" },
  { id: "sensors",    label: "الحساسات" },
  { id: "electrical", label: "الكهرباء" },
  { id: "emissions",  label: "العوادم" },
  { id: "hvac",       label: "تكييف" },
];

const AVAIL_CONFIG: Record<Part["availability"], { label: string; color: string; icon: any }> = {
  in_stock: { label: "متوفر",   color: "text-green-400",  icon: CheckCircle2  },
  order:    { label: "طلب",     color: "text-yellow-400", icon: Truck          },
  rare:     { label: "نادر",    color: "text-red-400",    icon: AlertTriangle  },
};

const COND_CONFIG: Record<Part["condition"], { label: string; color: string }> = {
  new:   { label: "جديد",    color: "text-green-400"   },
  oem:   { label: "OEM",     color: "text-blue-400"    },
  reman: { label: "مجدّد",  color: "text-orange-400"  },
};

function PartCard({ part }: { part: Part }) {
  const av = AVAIL_CONFIG[part.availability];
  const cond = COND_CONFIG[part.condition];
  const AvIcon = av.icon;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 hover:border-white/20 transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-bold text-sm">{part.nameAr}</div>
          <div className="text-[10px] text-muted-foreground">{part.nameEn}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-bold", cond.color,
            part.condition === "oem" ? "border-blue-500/30 bg-blue-500/10" :
            part.condition === "new" ? "border-green-500/30 bg-green-500/10" :
            "border-orange-500/30 bg-orange-500/10"
          )}>{cond.label}</span>
        </div>
      </div>

      {/* Codes */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-1.5 rounded-lg bg-black/40 border border-border">
          <div className="text-[8px] text-muted-foreground">OEM</div>
          <div className="text-[9px] font-mono text-foreground">{part.oem}</div>
        </div>
        <div className="p-1.5 rounded-lg bg-black/40 border border-border">
          <div className="text-[8px] text-muted-foreground">Aftermarket</div>
          <div className="text-[9px] font-mono text-foreground truncate">{part.aftermarket}</div>
        </div>
      </div>

      {/* Brand + rating */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Tag className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-bold">{part.brand}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(n => (
            <Star key={n} className={cn("w-2.5 h-2.5", n <= Math.round(part.rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
          ))}
          <span className="text-[9px] text-muted-foreground mr-1">({part.reviews.toLocaleString()})</span>
        </div>
      </div>

      {/* Compatibility */}
      <div className="flex flex-wrap gap-1">
        {part.compatibility.slice(0,3).map(c => (
          <span key={c} className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/80">{c}</span>
        ))}
        {part.compatibility.length > 3 && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted/20 border border-border text-muted-foreground">+{part.compatibility.length - 3}</span>
        )}
      </div>

      {/* Price + availability + action */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div>
          <div className="text-lg font-black text-primary">${part.price.min}–${part.price.max}</div>
          <div className={cn("flex items-center gap-1 text-[9px] font-bold", av.color)}>
            <AvIcon className="w-2.5 h-2.5" /> {av.label}
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/25 transition-all">
          <ShoppingCart className="w-3 h-3" /> أضف للطلب
        </button>
      </div>
    </div>
  );
}

export default function PartsCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"rating"|"price_asc"|"price_desc">("rating");

  const filtered = useMemo(() => {
    let list = PARTS.filter(p => {
      const matchSearch = !search || p.nameAr.includes(search) || p.nameEn.toLowerCase().includes(search.toLowerCase()) || p.oem.includes(search) || p.brand.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "all" || p.category === category;
      return matchSearch && matchCat;
    });
    if (sortBy === "rating") list = list.sort((a,b) => b.rating - a.rating);
    else if (sortBy === "price_asc") list = list.sort((a,b) => a.price.min - b.price.min);
    else list = list.sort((a,b) => b.price.max - a.price.max);
    return list;
  }, [search, category, sortBy]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-[#0a0c13]">
        <div className="p-2 rounded-xl bg-primary/15 border border-primary/30">
          <Package className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-black">كتالوج قطع الغيار</h1>
          <p className="text-[10px] text-muted-foreground">{PARTS.length} قطعة · OEM + Aftermarket</p>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm mr-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث باسم القطعة أو رقم OEM أو العلامة..."
              className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-border bg-card text-xs placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs outline-none">
          <option value="rating">الأعلى تقييماً</option>
          <option value="price_asc">الأرخص أولاً</option>
          <option value="price_desc">الأغلى أولاً</option>
        </select>
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 px-5 py-2 border-b border-border overflow-x-auto">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className={cn("shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
              category === c.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Package className="w-10 h-10 opacity-30" />
            <p className="text-sm">لا توجد قطع تطابق البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(p => <PartCard key={p.id} part={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
