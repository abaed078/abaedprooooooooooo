import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  RotateCcw, Wrench, Search, Zap, Activity, ShieldAlert,
  ArrowRight, ArrowDown, ClipboardList, Info, Car, Target, Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type StepType = "intro" | "measure" | "inspect" | "test" | "conclusion";
type ConclusionSeverity = "replace" | "repair" | "inspect" | "reprogram" | "ok";

interface DiagStep {
  id: string;
  type: StepType;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  toolAr?: string;
  toolEn?: string;
  passId?: string;
  failId?: string;
  passAr?: string;
  passEn?: string;
  failAr?: string;
  failEn?: string;
  conclusion?: {
    severity: ConclusionSeverity;
    titleAr: string;
    titleEn: string;
    repairAr: string;
    repairEn: string;
    partsAr?: string;
    partsEn?: string;
    timeAr?: string;
    timeEn?: string;
  };
}

interface DiagTree {
  dtc: string;
  titleAr: string;
  titleEn: string;
  systemAr: string;
  systemEn: string;
  color: string;
  icon: any;
  cautionAr?: string;
  cautionEn?: string;
  steps: DiagStep[];
  startId: string;
}

/* ─────────────────────────────────────────────
   Diagnostic Trees
───────────────────────────────────────────── */
const TREES: DiagTree[] = [

  /* ── P0171 — System Too Lean Bank 1 ─────── */
  {
    dtc: "P0171",
    titleAr: "النظام فقير جداً (بنك 1)",
    titleEn: "System Too Lean — Bank 1",
    systemAr: "إدارة الوقود",
    systemEn: "Fuel Management",
    color: "#f97316",
    icon: Activity,
    cautionAr: "افحص أولاً إذا كانت هناك أكواد أخرى تتعلق بحساس MAF أو O2",
    cautionEn: "First check if any MAF or O2 sensor codes are also present",
    startId: "p171_s1",
    steps: [
      {
        id: "p171_s1", type: "measure",
        titleAr: "قياس ضغط الوقود",
        titleEn: "Measure Fuel Pressure",
        bodyAr: "وصّل مقياس ضغط الوقود على خط الوقود الرئيسي. اشغّل المحرك وقرأ الضغط عند الخمول.",
        bodyEn: "Connect a fuel pressure gauge to the main fuel rail. Start the engine and read pressure at idle.",
        toolAr: "مقياس ضغط وقود",
        toolEn: "Fuel pressure gauge",
        passAr: "280–400 kPa (سليم)", passEn: "280–400 kPa (normal)",
        failAr: "أقل من 280 kPa",     failEn: "Below 280 kPa",
        passId: "p171_s2", failId: "p171_c_pump",
      },
      {
        id: "p171_s2", type: "measure",
        titleAr: "قراءة جهد MAF عند الخمول",
        titleEn: "Read MAF Voltage at Idle",
        bodyAr: "باستخدام جهاز الفحص، راقب جهد مستشعر MAF عند الخمول (دورات 700-800 في الدقيقة).",
        bodyEn: "Using scanner live data, monitor MAF sensor voltage at idle (700–800 RPM).",
        toolAr: "جهاز تشخيص / أوسيلوسكوب",
        toolEn: "Diagnostic scanner / oscilloscope",
        passAr: "0.8–1.2V (سليم)", passEn: "0.8–1.2V (normal)",
        failAr: "أقل من 0.6V",     failEn: "Below 0.6V",
        passId: "p171_s3", failId: "p171_c_maf",
      },
      {
        id: "p171_s3", type: "inspect",
        titleAr: "اختبار تسريب الهواء (Smoke Test)",
        titleEn: "Perform Smoke Test for Vacuum Leaks",
        bodyAr: "أغلق مدخل هواء المحرك وضخّ دخان (أو هواء مضغوط) في نظام الهواء. افحص بصرياً لأي تسريب.",
        bodyEn: "Block the intake and pump smoke into the intake system. Visually inspect all hoses and gaskets for leaks.",
        toolAr: "جهاز الدخان / Smoke Machine",
        toolEn: "Smoke machine / vacuum leak detector",
        passAr: "لا تسريب",         passEn: "No leak found",
        failAr: "وجود تسريب",       failEn: "Leak detected",
        passId: "p171_s4", failId: "p171_c_vac",
      },
      {
        id: "p171_s4", type: "measure",
        titleAr: "مراقبة موجة مستشعر O2 الأمامي",
        titleEn: "Monitor Front O2 Sensor Waveform",
        bodyAr: "باستخدام الأوسيلوسكوب، راقب موجة مستشعر O2 الأمامي. يجب أن تتذبذب بسرعة بين 0.1V و0.9V.",
        bodyEn: "Using oscilloscope, monitor upstream O2 sensor waveform. Should oscillate rapidly between 0.1V and 0.9V.",
        toolAr: "أوسيلوسكوب / جهاز تشخيص",
        toolEn: "Oscilloscope / scanner",
        passAr: "تذبذب سريع 0.1–0.9V", passEn: "Fast oscillation 0.1–0.9V",
        failAr: "ثابت أو بطيء",         failEn: "Flat or lazy waveform",
        passId: "p171_c_ecu", failId: "p171_c_o2",
      },
      // Conclusions
      {
        id: "p171_c_pump", type: "conclusion",
        titleAr: "نتيجة: خلل في نظام الوقود",
        titleEn: "Conclusion: Fuel System Issue",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "مضخة وقود ضعيفة أو مرشح مسدود",
          titleEn: "Weak Fuel Pump or Clogged Filter",
          repairAr: "1. استبدل مرشح الوقود أولاً وأعد الاختبار\n2. إذا استمر الانخفاض، استبدل مضخة الوقود\n3. افحص تعليمات الضغط الموصى به للمركبة",
          repairEn: "1. Replace fuel filter first and retest\n2. If pressure still low, replace fuel pump\n3. Check vehicle-specific pressure spec",
          partsAr: "مضخة وقود، مرشح وقود",
          partsEn: "Fuel pump, fuel filter",
          timeAr: "2-4 ساعات", timeEn: "2–4 hrs",
        }
      },
      {
        id: "p171_c_maf", type: "conclusion",
        titleAr: "نتيجة: مستشعر MAF متسخ أو معطل",
        titleEn: "Conclusion: Dirty or Failed MAF Sensor",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "repair",
          titleAr: "تنظيف أو استبدال مستشعر MAF",
          titleEn: "Clean or Replace MAF Sensor",
          repairAr: "1. نظّف مستشعر MAF بمنظف MAF المتخصص\n2. أعد الاختبار بعد التنظيف\n3. إذا استمر الانخفاض، استبدل المستشعر",
          repairEn: "1. Clean MAF sensor with MAF-specific cleaner\n2. Retest after cleaning\n3. If reading still low, replace sensor",
          partsAr: "مستشعر MAF",
          partsEn: "MAF sensor",
          timeAr: "30 دقيقة – 1 ساعة", timeEn: "30 min – 1 hr",
        }
      },
      {
        id: "p171_c_vac", type: "conclusion",
        titleAr: "نتيجة: تسريب هواء",
        titleEn: "Conclusion: Vacuum / Intake Leak",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "repair",
          titleAr: "إصلاح تسريب الهواء",
          titleEn: "Repair the Air Leak",
          repairAr: "1. حدّد موقع التسريب بدقة بجهاز الدخان\n2. استبدل الخرطوم أو الحشوة المعيبة\n3. أعد الاختبار وامسح الكود",
          repairEn: "1. Pinpoint leak with smoke machine\n2. Replace faulty hose or gasket\n3. Retest and clear code",
          partsAr: "خراطيم هواء، حشوات المنفستو",
          partsEn: "Intake hoses, manifold gaskets",
          timeAr: "1-3 ساعات", timeEn: "1–3 hrs",
        }
      },
      {
        id: "p171_c_o2", type: "conclusion",
        titleAr: "نتيجة: مستشعر O2 كسول أو معطل",
        titleEn: "Conclusion: Lazy or Failed O2 Sensor",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال مستشعر O2 الأمامي",
          titleEn: "Replace Upstream O2 Sensor",
          repairAr: "1. استبدل مستشعر O2 الأمامي (قبل المحول الحفازي)\n2. امسح الكود وقد دورة عمل كاملة\n3. تحقق من غياب الكود عند إعادة الظهور",
          repairEn: "1. Replace upstream (pre-cat) O2 sensor\n2. Clear code and drive a full trip cycle\n3. Confirm code does not return",
          partsAr: "مستشعر O2 الأمامي",
          partsEn: "Upstream O2 sensor",
          timeAr: "1-2 ساعات", timeEn: "1–2 hrs",
        }
      },
      {
        id: "p171_c_ecu", type: "conclusion",
        titleAr: "نتيجة: تحديث برنامج ECU أو ملف محرك",
        titleEn: "Conclusion: ECU Software / Tune Issue",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "reprogram",
          titleAr: "فحص وتحديث برنامج ECU",
          titleEn: "Check and Update ECU Software",
          repairAr: "1. ابحث عن تحديثات TSB من الشركة المصنّعة\n2. فلّش آخر إصدار من برنامج ECU\n3. إذا استمر الكود، افحص الحاقنات بجهاز محلل الحاقن",
          repairEn: "1. Check manufacturer TSB for ECU updates\n2. Flash latest ECU software calibration\n3. If code persists, test injectors with injector analyzer",
          partsAr: "—",
          partsEn: "—",
          timeAr: "30-60 دقيقة", timeEn: "30–60 min",
        }
      },
    ]
  },

  /* ── P0300 — Random Misfire ─────────────── */
  {
    dtc: "P0300",
    titleAr: "حريق عشوائي في الأسطوانات",
    titleEn: "Random / Multiple Cylinder Misfire",
    systemAr: "نظام الاشتعال",
    systemEn: "Ignition System",
    color: "#ef4444",
    icon: Zap,
    startId: "p300_s1",
    steps: [
      {
        id: "p300_s1", type: "inspect",
        titleAr: "فحص شمعات الإشعال",
        titleEn: "Inspect Spark Plugs",
        bodyAr: "افحص شمعات الإشعال لأي تلف: فحم، تآكل القطب، تشقق الغلاف، أو لون غير طبيعي.",
        bodyEn: "Remove and inspect all spark plugs for carbon fouling, electrode wear, cracked insulator, or abnormal color.",
        toolAr: "مجموعة أدوات إزالة الشمعات",
        toolEn: "Spark plug socket set",
        passAr: "سليمة",           passEn: "Plugs look good",
        failAr: "تالفة أو متسخة", failEn: "Fouled or worn",
        passId: "p300_s2", failId: "p300_c_plugs",
      },
      {
        id: "p300_s2", type: "test",
        titleAr: "اختبار تبادل الملفات (Coil Swap Test)",
        titleEn: "Ignition Coil Swap Test",
        bodyAr: "بدّل ملفات الإشعال بين الأسطوانات المشبوهة والسليمة. افحص إذا انتقل كود العطل مع الملف.",
        bodyEn: "Swap ignition coils between suspected and healthy cylinders. Check if misfire code moves with the coil.",
        toolAr: "جهاز تشخيص لمراقبة الأسطوانات",
        toolEn: "Scanner with cylinder misfire monitoring",
        passAr: "الحريق ثابت لم ينتقل", passEn: "Misfire stays in same cylinder",
        failAr: "الحريق انتقل مع الملف",   failEn: "Misfire moved with coil",
        passId: "p300_s3", failId: "p300_c_coil",
      },
      {
        id: "p300_s3", type: "measure",
        titleAr: "اختبار ضغط الأسطوانات",
        titleEn: "Cylinder Compression Test",
        bodyAr: "افصل شمعات الإشعال وأدخل مقياس الضغط في كل أسطوانة. اضغط المحرك وسجّل القراءات.",
        bodyEn: "Remove spark plugs and perform a compression test on all cylinders. Record readings for each cylinder.",
        toolAr: "مقياس ضغط أسطوانات",
        toolEn: "Compression tester",
        passAr: "> 150 psi (10.3 bar)", passEn: "> 150 psi (10.3 bar)",
        failAr: "< 120 psi في أسطوانة",  failEn: "< 120 psi in any cylinder",
        passId: "p300_s4", failId: "p300_c_compression",
      },
      {
        id: "p300_s4", type: "measure",
        titleAr: "فحص نبضة الحاقن",
        titleEn: "Check Injector Pulse Width",
        bodyAr: "باستخدام الأوسيلوسكوب أو جهاز فحص الحاقنات، افحص نبضة كل حاقن للتأكد من الاتساق.",
        bodyEn: "Using an oscilloscope or injector tester, check each injector pulse width for consistency and pattern.",
        toolAr: "أوسيلوسكوب / محلل حاقنات",
        toolEn: "Oscilloscope / injector analyzer",
        passAr: "نبضات متساوية جميع الحاقنات", passEn: "Equal pulse width all injectors",
        failAr: "نبضة غير منتظمة أو مفقودة",    failEn: "Irregular or missing pulse",
        passId: "p300_c_fuel", failId: "p300_c_injector",
      },
      {
        id: "p300_c_plugs", type: "conclusion",
        titleAr: "نتيجة: شمعات إشعال متهالكة",
        titleEn: "Conclusion: Worn Spark Plugs",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال جميع شمعات الإشعال",
          titleEn: "Replace All Spark Plugs",
          repairAr: "1. استبدل جميع الشمعات بالمواصفات الأصلية\n2. افحص عزم الربط الصحيح حسب المواصفة\n3. امسح الكود وتحقق من الاختفاء",
          repairEn: "1. Replace all plugs with OEM specification\n2. Torque to specification\n3. Clear code and verify misfire is gone",
          partsAr: "شمعات إشعال (مجموعة كاملة)",
          partsEn: "Spark plugs (full set)",
          timeAr: "1-2 ساعات", timeEn: "1–2 hrs",
        }
      },
      {
        id: "p300_c_coil", type: "conclusion",
        titleAr: "نتيجة: ملف إشعال معطل",
        titleEn: "Conclusion: Failed Ignition Coil",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال ملف الإشعال المعطل",
          titleEn: "Replace the Faulty Ignition Coil",
          repairAr: "1. احرص على تحديد الأسطوانة المعطلة بدقة\n2. استبدل ملف الإشعال بقطعة أصلية أو معادلة\n3. يُوصى باستبدال الشمعة المقابلة أيضاً",
          repairEn: "1. Confirm which cylinder's coil failed\n2. Replace ignition coil with OEM or equivalent\n3. Also replace the corresponding spark plug",
          partsAr: "ملف إشعال، شمعة إشعال",
          partsEn: "Ignition coil, spark plug",
          timeAr: "30-60 دقيقة", timeEn: "30–60 min",
        }
      },
      {
        id: "p300_c_compression", type: "conclusion",
        titleAr: "نتيجة: تلف ميكانيكي داخلي",
        titleEn: "Conclusion: Internal Mechanical Damage",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "inspect",
          titleAr: "فحص شامل للمحرك",
          titleEn: "Full Engine Internal Inspection",
          repairAr: "1. أجرِ اختبار ضغط رطب لتحديد سبب الانخفاض\n2. افحص الصمامات وحلقات المكبس\n3. قد يتطلب فتح المحرك أو استبداله",
          repairEn: "1. Perform wet compression test to isolate cause\n2. Check valves, piston rings\n3. May require engine teardown or replacement",
          partsAr: "حسب نتيجة الفحص",
          partsEn: "Depends on inspection result",
          timeAr: "8-20 ساعة", timeEn: "8–20 hrs",
        }
      },
      {
        id: "p300_c_injector", type: "conclusion",
        titleAr: "نتيجة: حاقن وقود معطل",
        titleEn: "Conclusion: Faulty Fuel Injector",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال الحاقن المعطل",
          titleEn: "Replace the Faulty Injector",
          repairAr: "1. حدّد الحاقن المعطل بدقة بالأوسيلوسكوب\n2. استبدله بحاقن أصلي أو محترف المعايرة\n3. يُنصح بتنظيف جميع الحاقنات بالموجات فوق الصوتية",
          repairEn: "1. Pinpoint faulty injector with oscilloscope\n2. Replace with OEM or precisely matched injector\n3. Consider ultrasonic cleaning of all injectors",
          partsAr: "حاقن وقود",
          partsEn: "Fuel injector",
          timeAr: "1-3 ساعات", timeEn: "1–3 hrs",
        }
      },
      {
        id: "p300_c_fuel", type: "conclusion",
        titleAr: "نتيجة: وقود ملوّث أو تحديث ECU",
        titleEn: "Conclusion: Fuel Contamination or ECU Update",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "inspect",
          titleAr: "فحص جودة الوقود وتحديث ECU",
          titleEn: "Check Fuel Quality and ECU Calibration",
          repairAr: "1. افحص جودة الوقود (نسبة الكحول أو تلوث الماء)\n2. ابحث عن تحديثات TSB من الوكيل\n3. فلّش آخر إصدار ECU إذا أوصت الشركة",
          repairEn: "1. Check fuel quality (ethanol content or water contamination)\n2. Search for manufacturer TSB updates\n3. Flash latest ECU calibration if recommended",
          partsAr: "—",
          partsEn: "—",
          timeAr: "1-2 ساعات", timeEn: "1–2 hrs",
        }
      },
    ]
  },

  /* ── P0420 — Catalyst Below Threshold ────── */
  {
    dtc: "P0420",
    titleAr: "كفاءة المحول الحفازي منخفضة (بنك 1)",
    titleEn: "Catalyst System Efficiency Below Threshold",
    systemAr: "نظام العادم",
    systemEn: "Exhaust System",
    color: "#84cc16",
    icon: Activity,
    cautionAr: "لا تستبدل المحول الحفازي قبل استبعاد الأسباب الأخرى",
    cautionEn: "Do not replace catalytic converter before ruling out other causes",
    startId: "p420_s1",
    steps: [
      {
        id: "p420_s1", type: "inspect",
        titleAr: "فحص تسريب العادم قبل المحول",
        titleEn: "Inspect Exhaust for Leaks Before Cat",
        bodyAr: "ابحث عن أي تسريب في نظام العادم بين المحرك والمحول الحفازي. استمع للأصوات غير الطبيعية عند الاشتغال.",
        bodyEn: "Inspect the entire exhaust system between engine and catalytic converter for cracks, loose flanges, or blown gaskets.",
        toolAr: "فحص بصري / سماعي",
        toolEn: "Visual / auditory inspection",
        passAr: "لا تسريب",       passEn: "No exhaust leak",
        failAr: "وجود تسريب",     failEn: "Exhaust leak found",
        passId: "p420_s2", failId: "p420_c_leak",
      },
      {
        id: "p420_s2", type: "measure",
        titleAr: "مقارنة موجات O2 الأمامي والخلفي",
        titleEn: "Compare Front vs Rear O2 Sensor Waveforms",
        bodyAr: "افتح قراءات مستشعري O2 الأمامي والخلفي في وقت واحد. المحول السليم يُظهر الخلفي ثابتاً والأمامي متذبذباً.",
        bodyEn: "Open both front and rear O2 sensor live data simultaneously. Healthy cat shows rear sensor stable, front oscillating.",
        toolAr: "أوسيلوسكوب قناتين / جهاز تشخيص",
        toolEn: "Dual-channel oscilloscope / scanner",
        passAr: "خلفي ثابت، أمامي متذبذب", passEn: "Rear stable, front oscillating",
        failAr: "الخلفي يشبه الأمامي",      failEn: "Rear mirrors front waveform",
        passId: "p420_s3", failId: "p420_c_cat",
      },
      {
        id: "p420_s3", type: "inspect",
        titleAr: "فحص استهلاك زيت المحرك",
        titleEn: "Check Engine Oil Consumption",
        bodyAr: "تحقق من مستوى الزيت مقارنةً بالتاريخ السابق. هل يستهلك الزيت بشكل غير طبيعي؟ هل هناك دخان أزرق؟",
        bodyEn: "Compare oil level to previous reading. Is oil being burned excessively? Is there blue smoke from exhaust?",
        toolAr: "قياس مستوى الزيت",
        toolEn: "Oil level dipstick check",
        passAr: "استهلاك طبيعي، لا دخان", passEn: "Normal consumption, no blue smoke",
        failAr: "استهلاك مرتفع أو دخان أزرق", failEn: "Excessive consumption or blue smoke",
        passId: "p420_s4", failId: "p420_c_oil",
      },
      {
        id: "p420_s4", type: "inspect",
        titleAr: "فحص استهلاك سائل التبريد",
        titleEn: "Check Coolant Consumption",
        bodyAr: "افحص مستوى سائل التبريد وغطاء الرديتير. هل هناك بخار أبيض كثيف؟ هل مستوى التبريد ينخفض دون تسريب خارجي؟",
        bodyEn: "Check coolant level and radiator cap. Is there heavy white steam from exhaust? Coolant dropping with no external leak?",
        toolAr: "فحص مستوى التبريد + غاز العوادم",
        toolEn: "Coolant level + combustion gas detector",
        passAr: "مستوى ثابت، لا بخار", passEn: "Level stable, no white steam",
        failAr: "انخفاض التبريد أو بخار أبيض", failEn: "Coolant dropping or white steam",
        passId: "p420_c_cat_poisoned", failId: "p420_c_gasket",
      },
      {
        id: "p420_c_leak", type: "conclusion",
        titleAr: "نتيجة: تسريب في العادم",
        titleEn: "Conclusion: Exhaust Leak",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "repair",
          titleAr: "إصلاح تسريب العادم أولاً",
          titleEn: "Repair Exhaust Leak First",
          repairAr: "1. أصلح التسريب (حشوة أو فلنجة مكسورة)\n2. امسح الكود وقد دورة قيادة كاملة\n3. أعد الاختبار — قد يختفي الكود P0420",
          repairEn: "1. Fix leak (gasket or cracked flange)\n2. Clear code and drive a full trip cycle\n3. Retest — P0420 may clear after repair",
          partsAr: "حشوة عادم، فلنجة",
          partsEn: "Exhaust gasket, flange",
          timeAr: "1-3 ساعات", timeEn: "1–3 hrs",
        }
      },
      {
        id: "p420_c_cat", type: "conclusion",
        titleAr: "نتيجة: محول حفازي متدهور",
        titleEn: "Conclusion: Failed Catalytic Converter",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال المحول الحفازي",
          titleEn: "Replace Catalytic Converter",
          repairAr: "1. استبدل المحول الحفازي بقطعة مطابقة للمواصفات الانبعاثية\n2. افحص سبب تعطّل المحول (زيت، وقود) قبل التركيب\n3. امسح الكود ونفذ دورة OBDII كاملة",
          repairEn: "1. Replace cat with emissions-compliant unit\n2. Investigate root cause (oil, fuel) before installing new cat\n3. Clear code and run complete OBDII drive cycle",
          partsAr: "محول حفازي",
          partsEn: "Catalytic converter",
          timeAr: "1-3 ساعات", timeEn: "1–3 hrs",
        }
      },
      {
        id: "p420_c_oil", type: "conclusion",
        titleAr: "نتيجة: حرق زيت يُتلف المحول",
        titleEn: "Conclusion: Oil Burning Damaging Catalyst",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "repair",
          titleAr: "إصلاح خلل حرق الزيت أولاً",
          titleEn: "Fix Oil Burning Issue First",
          repairAr: "1. افحص مانعات تسريب الصمامات وحلقات المكابس\n2. أصلح مصدر حرق الزيت\n3. استبدل المحول الحفازي بعد الإصلاح فقط",
          repairEn: "1. Check valve stem seals and piston rings\n2. Fix oil burning source\n3. Only then replace catalytic converter",
          partsAr: "مانعات الصمامات أو مجموعة حلقات المكبس",
          partsEn: "Valve stem seals or piston ring set",
          timeAr: "6-20 ساعة", timeEn: "6–20 hrs",
        }
      },
      {
        id: "p420_c_gasket", type: "conclusion",
        titleAr: "نتيجة: تسريب حشوة الرأس",
        titleEn: "Conclusion: Head Gasket Leak",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "repair",
          titleAr: "إصلاح حشوة الرأس — أولوية قصوى",
          titleEn: "Head Gasket Repair — Critical Priority",
          repairAr: "1. تأكد بجهاز كشف غاز الاحتراق في سائل التبريد\n2. أصلح حشوة الرأس قبل أي شيء آخر\n3. استبدل المحول الحفازي بعد الإصلاح",
          repairEn: "1. Confirm with combustion gas detector in coolant\n2. Repair head gasket first — this is the priority\n3. Replace catalytic converter after head gasket fix",
          partsAr: "حشوة رأس الأسطوانات",
          partsEn: "Head gasket",
          timeAr: "8-16 ساعة", timeEn: "8–16 hrs",
        }
      },
      {
        id: "p420_c_cat_poisoned", type: "conclusion",
        titleAr: "نتيجة: محول حفازي مسموم",
        titleEn: "Conclusion: Poisoned Catalytic Converter",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال المحول الحفازي",
          titleEn: "Replace Catalytic Converter",
          repairAr: "1. استبدل المحول بقطعة عالية الجودة\n2. تحقق من عدم وجود مشاكل حاقنات تسبب التسميم بالوقود\n3. امسح الكود ونفّذ دورة OBDII",
          repairEn: "1. Replace cat with high-quality unit\n2. Check for injector issues causing fuel-related poisoning\n3. Clear code and run OBDII drive cycle",
          partsAr: "محول حفازي",
          partsEn: "Catalytic converter",
          timeAr: "1-3 ساعات", timeEn: "1–3 hrs",
        }
      },
    ]
  },

  /* ── C0040 — Wheel Speed Sensor ─────────── */
  {
    dtc: "C0040",
    titleAr: "مستشعر سرعة العجلة الأمامية اليمنى",
    titleEn: "Right Front Wheel Speed Sensor Fault",
    systemAr: "نظام ABS",
    systemEn: "ABS System",
    color: "#3b82f6",
    icon: Target,
    startId: "c040_s1",
    steps: [
      {
        id: "c040_s1", type: "inspect",
        titleAr: "فحص مستشعر السرعة وسلكه",
        titleEn: "Inspect Sensor and Wiring",
        bodyAr: "افحص مستشعر سرعة العجلة الأمامية اليمنى والسلك وصولاً للموصّل. ابحث عن أضرار ميكانيكية أو صدأ.",
        bodyEn: "Physically inspect the right front wheel speed sensor, its wiring harness, and connector for damage, corrosion, or chafing.",
        toolAr: "فحص بصري",
        toolEn: "Visual inspection",
        passAr: "سليم بصرياً",   passEn: "Visually intact",
        failAr: "تلف واضح",      failEn: "Visible damage",
        passId: "c040_s2", failId: "c040_c_wiring",
      },
      {
        id: "c040_s2", type: "measure",
        titleAr: "قياس مقاومة المستشعر",
        titleEn: "Measure Sensor Resistance",
        bodyAr: "افصل الموصل وقس المقاومة بين طرفَي المستشعر. قيمة مستشعرات VR النموذجية: 800–2000 Ω.",
        bodyEn: "Disconnect the sensor connector and measure resistance across the sensor terminals. Typical VR-type: 800–2000 Ω.",
        toolAr: "مقياس متعدد (Multimeter)",
        toolEn: "Digital multimeter",
        passAr: "800–2000 Ω", passEn: "800–2000 Ω",
        failAr: "فتح دائرة / قصر",   failEn: "Open circuit or short",
        passId: "c040_s3", failId: "c040_c_sensor",
      },
      {
        id: "c040_s3", type: "inspect",
        titleAr: "فحص حلقة تروس ABS (Tone Ring)",
        titleEn: "Inspect ABS Tone Ring",
        bodyAr: "افحص حلقة التروس (Reluctor Ring) على الوصلة أو محور العجلة. تحقق من الأسنان المكسورة أو الصدأ الشديد.",
        bodyEn: "Inspect the ABS reluctor ring (tone ring) on the axle or hub. Check for broken, missing, or severely rusted teeth.",
        toolAr: "فحص بصري / مرآة فحص",
        toolEn: "Visual inspection / inspection mirror",
        passAr: "حلقة سليمة",      passEn: "Ring intact",
        failAr: "أسنان مكسورة",    failEn: "Broken or missing teeth",
        passId: "c040_s4", failId: "c040_c_ring",
      },
      {
        id: "c040_s4", type: "measure",
        titleAr: "فحص موجة الإشارة بالأوسيلوسكوب",
        titleEn: "Check Signal Waveform on Oscilloscope",
        bodyAr: "وصّل الأوسيلوسكوب على خرج مستشعر السرعة. ادفع المركبة ببطء وراقب موجة النبضات — يجب أن تكون منتظمة.",
        bodyEn: "Connect oscilloscope to the sensor output. Slowly push the vehicle and observe the signal — should be regular square pulses.",
        toolAr: "أوسيلوسكوب",
        toolEn: "Oscilloscope",
        passAr: "نبضات منتظمة",         passEn: "Regular square pulses",
        failAr: "إشارة ضعيفة أو منقطعة", failEn: "Weak or intermittent signal",
        passId: "c040_c_abs", failId: "c040_c_sensor",
      },
      {
        id: "c040_c_wiring", type: "conclusion",
        titleAr: "نتيجة: تلف في الأسلاك أو الموصل",
        titleEn: "Conclusion: Wiring Harness Damage",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "repair",
          titleAr: "إصلاح أو استبدال حزمة الأسلاك",
          titleEn: "Repair or Replace Wiring Harness",
          repairAr: "1. أصلح القطعة التالفة أو استبدل حزمة الأسلاك بالكامل\n2. استخدم موصلات مقاومة للماء\n3. امسح الكود وتحقق",
          repairEn: "1. Repair damaged section or replace full harness\n2. Use weatherproof connectors\n3. Clear code and verify",
          partsAr: "حزمة أسلاك، موصلات",
          partsEn: "Wiring harness, connectors",
          timeAr: "1-2 ساعات", timeEn: "1–2 hrs",
        }
      },
      {
        id: "c040_c_sensor", type: "conclusion",
        titleAr: "نتيجة: مستشعر سرعة معطل",
        titleEn: "Conclusion: Failed Wheel Speed Sensor",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال مستشعر السرعة",
          titleEn: "Replace Wheel Speed Sensor",
          repairAr: "1. استبدل المستشعر بقطعة أصلية أو ما يعادلها\n2. تحقق من الفجوة بين المستشعر والحلقة (0.5-1.5mm)\n3. امسح الكود واختبر عند القيادة",
          repairEn: "1. Replace sensor with OEM or equivalent\n2. Check sensor-to-ring air gap (0.5–1.5mm)\n3. Clear code and test while driving",
          partsAr: "مستشعر سرعة عجلة ABS",
          partsEn: "ABS wheel speed sensor",
          timeAr: "30-60 دقيقة", timeEn: "30–60 min",
        }
      },
      {
        id: "c040_c_ring", type: "conclusion",
        titleAr: "نتيجة: حلقة تروس تالفة",
        titleEn: "Conclusion: Damaged Tone Ring",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال حلقة تروس ABS",
          titleEn: "Replace ABS Tone Ring",
          repairAr: "1. استبدل حلقة تروس ABS (قد تكون مدمجة مع الوصلة)\n2. فحص الوصلة للتأكد من سلامتها\n3. امسح الكود واختبر",
          repairEn: "1. Replace ABS tone ring (may be integrated with axle)\n2. Check axle for damage\n3. Clear code and test",
          partsAr: "حلقة تروس ABS / وصلة",
          partsEn: "ABS tone ring / axle",
          timeAr: "2-4 ساعات", timeEn: "2–4 hrs",
        }
      },
      {
        id: "c040_c_abs", type: "conclusion",
        titleAr: "نتيجة: مشكلة في وحدة ABS",
        titleEn: "Conclusion: ABS Module Issue",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "reprogram",
          titleAr: "فحص وحدة ABS / EBCM",
          titleEn: "Inspect ABS / EBCM Module",
          repairAr: "1. المستشعر والحلقة سليمان — ابحث في وحدة ABS\n2. افحص جهد التغذية والأرضي لوحدة ABS\n3. قد تحتاج وحدة ABS إلى استبدال أو برمجة",
          repairEn: "1. Sensor and ring are OK — suspect ABS module\n2. Check ABS module power and ground\n3. ABS module may need replacement or recoding",
          partsAr: "وحدة ABS / EBCM",
          partsEn: "ABS / EBCM module",
          timeAr: "2-4 ساعات", timeEn: "2–4 hrs",
        }
      },
    ]
  },

  /* ── B0001 — Driver Airbag ───────────────── */
  {
    dtc: "B0001",
    titleAr: "خلل في وسادة هوائية السائق",
    titleEn: "Driver Airbag Squib Circuit Open",
    systemAr: "نظام SRS",
    systemEn: "SRS Airbag System",
    color: "#a855f7",
    icon: ShieldAlert,
    cautionAr: "⚠ قبل أي فحص: افصل البطارية وانتظر 5 دقائق لتفريغ مكثفات SRS",
    cautionEn: "⚠ Before inspection: disconnect battery and wait 5 minutes for SRS capacitors to discharge",
    startId: "b001_s1",
    steps: [
      {
        id: "b001_s1", type: "inspect",
        titleAr: "فحص سلك دوّامة عجلة القيادة",
        titleEn: "Inspect Steering Wheel Clock Spring",
        bodyAr: "بعد فصل البطارية وانتظار 5 دقائق: افحص وصّال دوّامة عجلة القيادة للتأكد من سلامتها وعدم وجود كسر.",
        bodyEn: "After disconnecting battery and waiting 5 min: inspect steering wheel clock spring connector for damage or visible breaks.",
        toolAr: "فحص بصري",
        toolEn: "Visual inspection",
        passAr: "سليم",       passEn: "Intact",
        failAr: "تالف",      failEn: "Damaged",
        passId: "b001_s2", failId: "b001_c_clock",
      },
      {
        id: "b001_s2", type: "measure",
        titleAr: "قياس مقاومة دائرة الوسادة الهوائية",
        titleEn: "Measure Airbag Squib Resistance",
        bodyAr: "باستخدام مقياس SRS المتخصص (ليس الميزان العادي)، قس مقاومة دائرة الوسادة الهوائية بين طرفَي الموصل في عمود التوجيه.",
        bodyEn: "Using a dedicated SRS ohmmeter (NOT regular multimeter), measure airbag squib resistance at the steering column connector.",
        toolAr: "مقياس SRS متخصص",
        toolEn: "SRS-rated ohmmeter",
        passAr: "2–4 Ω (حسب المواصفة)", passEn: "2–4 Ω (per spec)",
        failAr: "فتح دائرة / قصر",       failEn: "Open or short circuit",
        passId: "b001_s3", failId: "b001_c_squib",
      },
      {
        id: "b001_s3", type: "inspect",
        titleAr: "فحص موصلات وحدة SRS",
        titleEn: "Inspect SRS Module Connectors",
        bodyAr: "افحص موصلات وحدة SRS (تحت المقعد عادةً) للتأكد من الأقفال السليمة والخلو من الصدأ أو التلف.",
        bodyEn: "Inspect SRS module connectors (usually under seat) for secure locking, corrosion, or damage to yellow SRS connectors.",
        toolAr: "فحص بصري",
        toolEn: "Visual inspection",
        passAr: "موصلات سليمة",    passEn: "Connectors secure",
        failAr: "صدأ أو موصل فضفاض", failEn: "Corrosion or loose connector",
        passId: "b001_c_module", failId: "b001_c_connector",
      },
      {
        id: "b001_c_clock", type: "conclusion",
        titleAr: "نتيجة: دوّامة عجلة القيادة تالفة",
        titleEn: "Conclusion: Clock Spring Damaged",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال دوّامة عجلة القيادة",
          titleEn: "Replace Steering Wheel Clock Spring",
          repairAr: "1. استبدل مجموعة دوّامة عجلة القيادة\n2. تأكد من الفصل الكامل للبطارية قبل العمل\n3. امسح الكود وأجرِ اختبار SRS",
          repairEn: "1. Replace clock spring assembly\n2. Ensure full battery disconnection before work\n3. Clear code and run SRS self-test",
          partsAr: "دوّامة عجلة القيادة",
          partsEn: "Steering wheel clock spring",
          timeAr: "1-2 ساعات", timeEn: "1–2 hrs",
        }
      },
      {
        id: "b001_c_squib", type: "conclusion",
        titleAr: "نتيجة: مفجّر الوسادة الهوائية معطل",
        titleEn: "Conclusion: Airbag Squib / Inflator Fault",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "replace",
          titleAr: "استبدال وحدة الوسادة الهوائية",
          titleEn: "Replace Airbag Module",
          repairAr: "1. استبدل مجموعة الوسادة الهوائية بعجلة القيادة\n2. يجب أن تتم عملية الاستبدال من قبل فني SRS مؤهل\n3. امسح الكود وتحقق من نجاح الاختبار الذاتي",
          repairEn: "1. Replace steering wheel airbag assembly\n2. Must be performed by a certified SRS technician\n3. Clear code and verify successful self-test",
          partsAr: "وحدة وسادة هوائية للسائق",
          partsEn: "Driver airbag module",
          timeAr: "1-2 ساعات", timeEn: "1–2 hrs",
        }
      },
      {
        id: "b001_c_connector", type: "conclusion",
        titleAr: "نتيجة: موصل SRS تالف أو متأكسد",
        titleEn: "Conclusion: Corroded or Loose SRS Connector",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "repair",
          titleAr: "تنظيف أو استبدال موصل SRS",
          titleEn: "Clean or Replace SRS Connector",
          repairAr: "1. نظّف الموصل بمزيل صدأ إلكتروني\n2. تأكد من قفل الموصل الأصفر بشكل صحيح\n3. امسح الكود وتحقق",
          repairEn: "1. Clean connector with electronic contact cleaner\n2. Ensure yellow SRS connector locks correctly\n3. Clear code and verify",
          partsAr: "موصل SRS",
          partsEn: "SRS connector",
          timeAr: "30-60 دقيقة", timeEn: "30–60 min",
        }
      },
      {
        id: "b001_c_module", type: "conclusion",
        titleAr: "نتيجة: وحدة SRS معطلة",
        titleEn: "Conclusion: SRS Module Fault",
        bodyAr: "", bodyEn: "",
        conclusion: {
          severity: "reprogram",
          titleAr: "فحص وحدة SRS / استبدالها",
          titleEn: "Inspect and Possibly Replace SRS Module",
          repairAr: "1. تحقق من التغذية والأرضي لوحدة SRS\n2. ابحث عن تحديثات برامج TSB\n3. إذا لزم، استبدل وحدة SRS وأعد برمجتها (VIN تعلّم)",
          repairEn: "1. Check SRS module power and ground supply\n2. Search for TSB software updates\n3. If needed, replace SRS module and recode (VIN learning)",
          partsAr: "وحدة SRS",
          partsEn: "SRS module",
          timeAr: "2-4 ساعات", timeEn: "2–4 hrs",
        }
      },
    ]
  },
];

/* ─────────────────────────────────────────────
   Step type config
───────────────────────────────────────────── */
const STEP_TYPE_CONFIG: Record<StepType, { icon: any; colorAr: string; colorEn: string; color: string }> = {
  intro:      { icon: ClipboardList, colorAr: "مقدمة",    colorEn: "Intro",   color: "#64748b" },
  measure:    { icon: Activity,      colorAr: "قياس",     colorEn: "Measure", color: "#3b82f6" },
  inspect:    { icon: Search,        colorAr: "فحص",      colorEn: "Inspect", color: "#a855f7" },
  test:       { icon: Zap,           colorAr: "اختبار",   colorEn: "Test",    color: "#eab308" },
  conclusion: { icon: CheckCircle2,  colorAr: "النتيجة",  colorEn: "Result",  color: "#22c55e" },
};

const SEVERITY_CONFIG: Record<ConclusionSeverity, { icon: any; colorClass: string; labelAr: string; labelEn: string }> = {
  replace:   { icon: Wrench,        colorClass: "border-red-500/40 bg-red-500/8",     labelAr: "استبدال القطعة",  labelEn: "Replace Part"    },
  repair:    { icon: Wrench,        colorClass: "border-yellow-500/40 bg-yellow-500/8", labelAr: "إصلاح",         labelEn: "Repair"          },
  inspect:   { icon: Search,        colorClass: "border-blue-500/40 bg-blue-500/8",   labelAr: "فحص إضافي",     labelEn: "Further Inspect" },
  reprogram: { icon: Zap,           colorClass: "border-violet-500/40 bg-violet-500/8", labelAr: "برمجة / تحديث", labelEn: "Reprogram/Update"},
  ok:        { icon: CheckCircle2,  colorClass: "border-green-500/40 bg-green-500/8", labelAr: "لا إجراء",       labelEn: "No Action"      },
};

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function GuidedDiag() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [selectedTree, setSelectedTree] = useState<DiagTree>(TREES[0]);
  const [currentStepId, setCurrentStepId] = useState<string>(TREES[0].startId);
  const [path, setPath] = useState<{ stepId: string; choice: "pass" | "fail" }[]>([]);
  const [animKey, setAnimKey] = useState(0);

  const stepMap = useMemo(() => Object.fromEntries(selectedTree.steps.map(s => [s.id, s])), [selectedTree]);
  const currentStep = stepMap[currentStepId];

  const handleChoice = useCallback((choice: "pass" | "fail") => {
    if (!currentStep || currentStep.type === "conclusion") return;
    const nextId = choice === "pass" ? currentStep.passId : currentStep.failId;
    if (!nextId) return;
    setPath(prev => [...prev, { stepId: currentStepId, choice }]);
    setCurrentStepId(nextId);
    setAnimKey(k => k + 1);
  }, [currentStep, currentStepId]);

  const handleUndo = useCallback(() => {
    if (path.length === 0) return;
    const newPath = [...path];
    const prev = newPath.pop()!;
    setPath(newPath);
    setCurrentStepId(prev.stepId);
    setAnimKey(k => k + 1);
  }, [path]);

  const reset = useCallback((tree: DiagTree) => {
    setSelectedTree(tree);
    setCurrentStepId(tree.startId);
    setPath([]);
    setAnimKey(k => k + 1);
  }, []);

  const isConclusion = currentStep?.type === "conclusion";
  const stepConfig = currentStep ? STEP_TYPE_CONFIG[currentStep.type] : null;
  const concl = currentStep?.conclusion;
  const sevConfig = concl ? SEVERITY_CONFIG[concl.severity] : null;
  const StepIcon = stepConfig?.icon ?? Activity;
  const SevIcon = sevConfig?.icon ?? Wrench;
  const totalSteps = selectedTree.steps.filter(s => s.type !== "conclusion").length;
  const currentStepNum = path.length + 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isConclusion) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleChoice("pass");
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "f" || e.key === "F") {
        handleChoice("fail");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentStepId, isConclusion, handleChoice, handleUndo]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#080b12]">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-violet-400" />
          <h1 className="text-lg font-black text-white">{isAr ? "التشخيص الموجّه خطوة بخطوة" : "Guided Diagnostic Tree"}</h1>
        </div>

        {/* DTC selector */}
        <div className="flex gap-2 flex-wrap">
          {TREES.map(tree => {
            const Icon = tree.icon;
            return (
              <button
                key={tree.dtc}
                onClick={() => reset(tree)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all",
                  selectedTree.dtc === tree.dtc
                    ? "border-white/20 bg-white/[0.08] text-white"
                    : "border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                )}
              >
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: tree.color + "22", color: tree.color }}>
                  {tree.dtc}
                </span>
                <span className="hidden sm:block">{isAr ? tree.titleAr.split(" ")[0] : tree.titleEn.split(" ").slice(0, 2).join(" ")}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Keyboard hint */}
          {!isConclusion && (
            <div className="hidden md:flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-400">Enter</span>
              <span>=Pass</span>
              <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-400 ml-1">F</span>
              <span>=Fail</span>
              <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-400 ml-1">Esc</span>
              <span>=Back</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={path.length === 0}
            className="gap-1.5 text-slate-500 hover:text-violet-300 disabled:opacity-20 h-7 text-xs">
            <Undo2 className="w-3 h-3" />{isAr ? "تراجع" : "Undo"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => reset(selectedTree)} className="gap-1.5 text-slate-500 hover:text-white h-7 text-xs">
            <RotateCcw className="w-3 h-3" />{isAr ? "إعادة" : "Restart"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: path trail */}
        <div className="w-[220px] shrink-0 border-r border-white/[0.05] flex flex-col overflow-y-auto bg-[#070a10]">
          <div className="p-4">
            {/* DTC info */}
            <div className="mb-4 p-3 rounded-xl border" style={{ borderColor: selectedTree.color + "44", backgroundColor: selectedTree.color + "0a" }}>
              <div className="font-mono text-lg font-black" style={{ color: selectedTree.color }}>{selectedTree.dtc}</div>
              <div className="text-xs font-bold text-white mt-0.5">{isAr ? selectedTree.titleAr : selectedTree.titleEn}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{isAr ? selectedTree.systemAr : selectedTree.systemEn}</div>
            </div>

            {/* Caution */}
            {selectedTree.cautionAr && (
              <div className="mb-4 flex gap-2 p-2.5 rounded-lg bg-yellow-500/8 border border-yellow-500/25">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                  {isAr ? selectedTree.cautionAr : selectedTree.cautionEn}
                </p>
              </div>
            )}

            {/* Progress */}
            {!isConclusion && (
              <div className="mb-4">
                <div className="flex justify-between text-[9px] text-slate-600 mb-2">
                  <span>{isAr ? "التقدم" : "Progress"}</span>
                  <span className="font-mono" style={{ color: selectedTree.color }}>{currentStepNum}/{totalSteps}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: i < currentStepNum ? selectedTree.color : "rgba(255,255,255,0.05)",
                        boxShadow: i === currentStepNum - 1 ? `0 0 4px ${selectedTree.color}` : "none",
                      }} />
                  ))}
                </div>
              </div>
            )}

            {/* Path taken */}
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">
              {isAr ? "المسار المتبع" : "Path Taken"}
            </div>
            {path.length === 0 ? (
              <p className="text-[10px] text-slate-600">{isAr ? "لم تبدأ بعد" : "Not started yet"}</p>
            ) : (
              <div className="space-y-1.5">
                {path.map((p, i) => {
                  const s = stepMap[p.stepId];
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold",
                        p.choice === "pass" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                        {p.choice === "pass" ? "✓" : "✗"}
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {isAr ? s?.titleAr : s?.titleEn}
                      </span>
                    </div>
                  );
                })}
                {isConclusion && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 text-violet-400" />
                    </div>
                    <span className="text-[10px] text-violet-400 font-bold">{isAr ? "النتيجة النهائية" : "Final Result"}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: current step */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          {currentStep && (
            <div key={animKey} className="w-full max-w-xl space-y-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">

              {/* Step card */}
              {!isConclusion && (
                <>
                  {/* Step header */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (stepConfig?.color ?? "#64748b") + "22", border: `1px solid ${stepConfig?.color ?? "#64748b"}44` }}>
                      <StepIcon className="w-4 h-4" style={{ color: stepConfig?.color }} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: stepConfig?.color }}>
                        {isAr ? stepConfig?.colorAr : stepConfig?.colorEn} — {isAr ? `الخطوة ${currentStepNum}` : `Step ${currentStepNum}`}
                      </div>
                      <h2 className="text-lg font-black text-white leading-tight">
                        {isAr ? currentStep.titleAr : currentStep.titleEn}
                      </h2>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {isAr ? currentStep.bodyAr : currentStep.bodyEn}
                    </p>
                    {currentStep.toolAr && (
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                        <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-xs text-slate-500">
                          {isAr ? "الأداة المطلوبة: " : "Tool needed: "}
                          <span className="text-slate-300 font-medium">
                            {isAr ? currentStep.toolAr : currentStep.toolEn}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pass / Fail */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleChoice("pass")}
                      className="group relative flex flex-col items-center gap-2.5 p-5 rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))", border: "1px solid rgba(34,197,94,0.3)" }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.15), transparent 70%)" }} />
                      <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ background: "rgba(34,197,94,0.12)", boxShadow: "0 0 20px rgba(34,197,94,0.2)" }}>
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="relative text-center">
                        <span className="font-black text-green-400 text-base block">{isAr ? "ناجح / صحيح" : "Pass / OK"}</span>
                        {currentStep.passAr && (
                          <span className="text-[11px] text-green-400/60 leading-tight block mt-0.5">
                            {isAr ? currentStep.passAr : currentStep.passEn}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center gap-1.5 text-[11px] text-green-400/60 font-medium">
                        <ArrowRight className="w-3 h-3" />
                        <span>{isAr ? "الخطوة التالية" : "Next step"}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleChoice("fail")}
                      className="group relative flex flex-col items-center gap-2.5 p-5 rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.15), transparent 70%)" }} />
                      <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ background: "rgba(239,68,68,0.12)", boxShadow: "0 0 20px rgba(239,68,68,0.2)" }}>
                        <XCircle className="w-6 h-6 text-red-400" />
                      </div>
                      <div className="relative text-center">
                        <span className="font-black text-red-400 text-base block">{isAr ? "فاشل / خطأ" : "Fail / Fault"}</span>
                        {currentStep.failAr && (
                          <span className="text-[11px] text-red-400/60 leading-tight block mt-0.5">
                            {isAr ? currentStep.failAr : currentStep.failEn}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center gap-1.5 text-[11px] text-red-400/60 font-medium">
                        <ArrowDown className="w-3 h-3" />
                        <span>{isAr ? "النتيجة المباشرة" : "Direct conclusion"}</span>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* Conclusion card */}
              {isConclusion && concl && sevConfig && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-400 text-sm font-bold mb-3">
                      <CheckCircle2 className="w-4 h-4" />
                      {isAr ? "تم التشخيص!" : "Diagnosis Complete!"}
                    </div>
                    <h2 className="text-xl font-black text-white">{isAr ? concl.titleAr : concl.titleEn}</h2>
                  </div>

                  <div className={cn("p-5 rounded-2xl border space-y-4", sevConfig.colorClass)}>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <SevIcon className="w-4 h-4" />
                      {isAr ? sevConfig.labelAr : sevConfig.labelEn}
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                        {isAr ? "خطوات الإصلاح" : "Repair Steps"}
                      </div>
                      <div className="space-y-1.5">
                        {(isAr ? concl.repairAr : concl.repairEn).split("\n").map((line, i) => (
                          <div key={i} className="flex gap-2 text-sm text-slate-300">
                            <span className="text-slate-500 shrink-0">{line.split(".")[0]}.</span>
                            <span>{line.split(".").slice(1).join(".").trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {concl.partsAr && concl.partsAr !== "—" && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                        <div>
                          <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{isAr ? "القطع المحتملة" : "Possible Parts"}</div>
                          <div className="text-xs text-slate-300 font-medium">{isAr ? concl.partsAr : concl.partsEn}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{isAr ? "وقت العمل المقدّر" : "Est. Labor Time"}</div>
                          <div className="text-xs text-slate-300 font-bold font-mono">{isAr ? concl.timeAr : concl.timeEn}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button onClick={() => reset(selectedTree)} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
                    <RotateCcw className="w-4 h-4" />
                    {isAr ? "إعادة التشخيص من البداية" : "Restart Diagnostic"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: tree overview */}
        <div className="w-[200px] shrink-0 border-l border-white/[0.05] flex flex-col overflow-y-auto bg-[#070a10] p-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
            {isAr ? "خريطة الشجرة" : "Tree Map"}
          </div>
          <div className="space-y-1">
            {selectedTree.steps.map((step, i) => {
              const sc = STEP_TYPE_CONFIG[step.type];
              const ScIcon = sc.icon;
              const isActive = step.id === currentStepId;
              const wasVisited = path.some(p => p.stepId === step.id);
              return (
                <div key={step.id} className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] transition-all",
                  isActive ? "bg-white/[0.07] text-white" : wasVisited ? "text-slate-400" : "text-slate-600"
                )}>
                  <ScIcon className="w-3 h-3 shrink-0" style={{ color: isActive ? sc.color : undefined }} />
                  <span className="truncate">{isAr ? step.titleAr.slice(0, 20) : step.titleEn.slice(0, 20)}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-white ml-auto shrink-0 animate-pulse" />}
                  {wasVisited && !isActive && <div className="w-1 h-1 rounded-full bg-green-500 ml-auto shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">
              {isAr ? "الأكواد المتاحة" : "Available DTCs"}
            </div>
            {TREES.map(t => (
              <button key={t.dtc} onClick={() => reset(t)}
                className={cn("w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] transition-all",
                  selectedTree.dtc === t.dtc ? "bg-white/[0.06] text-white" : "text-slate-600 hover:text-slate-400")}>
                <span className="font-mono font-bold" style={{ color: t.color }}>{t.dtc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
