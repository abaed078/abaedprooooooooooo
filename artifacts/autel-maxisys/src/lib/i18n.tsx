import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type Lang = "en" | "ar";

const translations = {
  en: {
    // Layout / Header
    deviceName: "MaxiSYS MS Ultra S2",
    vci: "VCI",
    connected: "CONNECTED",
    disconnected: "DISCONNECTED",
    connecting: "CONNECTING",

    // Sidebar groups
    navSystem: "System",
    navService: "Service",
    navData: "Data",

    // Nav items
    navDashboard: "Dashboard",
    navVehicles: "Vehicle Management",
    navDiagnostics: "Diagnostics",
    navMaintenance: "Service Resets",
    navProgramming: "ECU Programming",
    navAdas: "ADAS Calibration",
    navDtcLibrary: "DTC Library",
    navReports: "Reports",
    navUpdates: "Updates",
    navSettings: "Settings",

    // Dashboard
    dashTitle: "Mission Control",
    dashSubtitle: "System overview and recent activity",
    dashActiveDtc: "Active DTCs",
    dashActiveDtcSub: "Critical alerts requiring attention",
    dashTotalVehicles: "Total Vehicles",
    dashTotalVehiclesSub: "Managed in system",
    dashTotalSessions: "Total Sessions",
    dashTotalSessionsSub: "Diagnostic scans performed",
    dashClearedCodes: "Cleared Codes",
    dashClearedCodesSub: "Issues resolved successfully",
    dashRecentSessions: "Recent Diagnostic Sessions",
    dashNoSessions: "No recent sessions found.",
    dashSystems: "Systems",

    // Vehicles
    vehiclesTitle: "Vehicle Management",
    vehiclesSubtitle: "Manage and select vehicles for diagnostics",
    vehiclesAdd: "Add Vehicle",
    vehiclesSearch: "Search by make, model, VIN, or license plate...",
    vehiclesAddTitle: "Add New Vehicle",
    vehiclesMake: "Make",
    vehiclesModel: "Model",
    vehiclesYear: "Year",
    vehiclesVin: "VIN",
    vehiclesPlate: "License Plate",
    vehiclesOdometer: "Odometer",
    vehiclesSave: "Save Vehicle",
    vehiclesSaving: "Adding...",
    vehiclesFailed: "Failed to add vehicle",
    vehiclesAdded: "Vehicle added successfully",
    vehiclesDeleted: "Vehicle deleted",
    vehiclesDeleteConfirm: "Delete this vehicle?",
    vehiclesLabelPlate: "Plate",
    vehiclesLabelOdo: "Odo",
    vehiclesLabelLastScan: "Last Scan",
    vehiclesNever: "Never",
    vehiclesStartScan: "Start Scan",
    vehiclesViewDetails: "View Details",
    vehiclesDelete: "Delete",
    vehiclesEmpty: "No vehicles found",
    vehiclesEmptySub: "Adjust your search or add a new vehicle",
    vehiclesNoVin: "NO VIN",

    // Diagnostics
    diagTitle: "Diagnostics Hub",
    diagSubtitle: "Start scans and review diagnostic sessions",
    diagStartScan: "Start New Scan",
    diagConfigTitle: "Configure Diagnostic Scan",
    diagSelectVehicle: "Select Vehicle",
    diagChooseVehicle: "Choose a vehicle",
    diagScanType: "Scan Type",
    diagFullScan: "Auto Scan (All Systems)",
    diagQuickScan: "Quick Scan (Engine/Trans/ABS/SRS)",
    diagSystemScan: "Control Unit (Select System)",
    diagBeginDiagnosis: "Begin Diagnosis",
    diagStarting: "Starting...",
    diagRecentSessions: "Recent Sessions",
    diagRecentSubtitle: "Review past diagnostic scans and reports",
    diagNoSessions: "No diagnostic sessions found.",
    diagSystems: "Systems",
    diagFaults: "Faults",
    diagStatus: "Status",
    diagViewDetails: "View Details",
    diagScanStarted: "Scan started successfully",

    // Session Detail
    sessionDiagnosticScan: "Diagnostic Scan",
    sessionTroubleCodes: "Trouble Codes",
    sessionLiveData: "Live Data Stream",
    sessionNoDtc: "No Trouble Codes Found",
    sessionNoDtcSub: "Systems operating normally",
    sessionNoLive: "No live data stream available for this session.",
    sessionPossibleCauses: "Possible Causes",
    sessionClearCode: "Clear Code",
    sessionCleared: "DTC Cleared successfully",

    // ADAS
    adasTitle: "ADAS Calibration",
    adasSubtitle: "Advanced Driver Assistance Systems",
    adasStart: "Start Calibration",
    adasConfigTitle: "Configure ADAS Calibration",
    adasSystem: "ADAS System",
    adasChooseSystem: "Choose a system",
    adasCalibrationType: "Calibration Type",
    adasStatic: "Static (Target Board)",
    adasDynamic: "Dynamic (Road Test)",
    adasBoth: "Both",
    adasBegin: "Begin Calibration",
    adasStarting: "Starting...",
    adasHistory: "Calibration History",
    adasNoHistory: "No ADAS calibrations recorded.",
    adasSupported: "Supported Systems",
    adasTargetBoard: "Target Board",
    adasLevel: "Level",
    adasStarted: "Calibration started successfully",
    adasSelectVehicle: "Select Vehicle",

    // Maintenance
    maintTitle: "Service Resets",
    maintSubtitle: "Maintenance resets, adaptations, and initializations",
    maintPerform: "Perform Reset",
    maintPerformTitle: "Perform Service Reset",
    maintSelectVehicle: "Select Vehicle",
    maintChooseVehicle: "Choose a vehicle",
    maintResetType: "Reset Type",
    maintChooseReset: "Choose reset type",
    maintExecute: "Execute Reset",
    maintExecuting: "Performing...",
    maintAvailable: "Available Reset Functions",
    maintSearch: "Search resets (e.g. Oil, Brake, Steering)...",
    maintHistory: "Recent History",
    maintNoHistory: "No reset history found.",
    maintSuccess: "Service reset performed successfully",
    maintSelectBoth: "Please select vehicle and reset type",

    // DTC Library
    dtcTitle: "DTC Code Library",
    dtcSubtitle: "Search diagnostic trouble codes",
    dtcSearch: "Search by code (P0171), keyword (lean), or system (Engine)...",
    dtcClear: "Clear",
    dtcResults: "results",
    dtcResult: "result",
    dtcFor: "for",
    dtcIn: "in",
    dtcNoResults: "No codes found",
    dtcNoResultsSub: "Try a different code or keyword",
    dtcViewDetails: "View Details →",
    dtcVeryCommon: "Very Common",
    dtcCommon: "Common",
    dtcUncommon: "Uncommon",
    dtcAll: "All",

    // DTC Detail Modal
    dtcModalCauses: "Possible Causes",
    dtcModalCausesHint: "(Most likely first)",
    dtcModalSymptoms: "Symptoms",
    dtcModalRecommendations: "Diagnostic Steps",
    dtcModalComponents: "Affected Components",
    dtcModalCategory: "Category",
    dtcModalSystem: "System",

    // Severity labels
    sevCritical: "CRITICAL",
    sevWarning: "WARNING",
    sevInfo: "INFO",

    // Status labels
    statusCompleted: "completed",
    statusRunning: "running",
    statusFailed: "failed",
    statusActive: "active",
    statusCleared: "cleared",
    statusPending: "pending",
    statusSuccess: "success",
    statusPass: "PASS",

    // General
    loading: "Loading...",
    noVin: "No VIN",
    unknown: "UNKNOWN",
  },

  ar: {
    // Layout / Header
    deviceName: "MaxiSYS MS Ultra S2",
    vci: "VCI",
    connected: "متصل",
    disconnected: "غير متصل",
    connecting: "جارٍ الاتصال",

    // Sidebar groups
    navSystem: "النظام",
    navService: "الخدمة",
    navData: "البيانات",

    // Nav items
    navDashboard: "لوحة التحكم",
    navVehicles: "إدارة المركبات",
    navDiagnostics: "التشخيص",
    navMaintenance: "إعادة الضبط",
    navProgramming: "برمجة وحدات ECU",
    navAdas: "معايرة ADAS",
    navDtcLibrary: "مكتبة أكواد DTC",
    navReports: "التقارير",
    navUpdates: "التحديثات",
    navSettings: "الإعدادات",

    // Dashboard
    dashTitle: "لوحة المراقبة",
    dashSubtitle: "نظرة عامة على النظام والنشاط الأخير",
    dashActiveDtc: "أكواد DTC النشطة",
    dashActiveDtcSub: "تنبيهات حرجة تحتاج اهتماماً",
    dashTotalVehicles: "إجمالي المركبات",
    dashTotalVehiclesSub: "مسجلة في النظام",
    dashTotalSessions: "إجمالي جلسات التشخيص",
    dashTotalSessionsSub: "جلسات تشخيص منجزة",
    dashClearedCodes: "الأكواد المُصفّاة",
    dashClearedCodesSub: "مشاكل تم حلها بنجاح",
    dashRecentSessions: "جلسات التشخيص الأخيرة",
    dashNoSessions: "لا توجد جلسات حديثة.",
    dashSystems: "أنظمة",

    // Vehicles
    vehiclesTitle: "إدارة المركبات",
    vehiclesSubtitle: "إضافة وإدارة المركبات للتشخيص",
    vehiclesAdd: "إضافة مركبة",
    vehiclesSearch: "بحث بالشركة، الموديل، رقم الهيكل، أو اللوحة...",
    vehiclesAddTitle: "إضافة مركبة جديدة",
    vehiclesMake: "الشركة المصنّعة",
    vehiclesModel: "الموديل",
    vehiclesYear: "سنة الصنع",
    vehiclesVin: "رقم الهيكل (VIN)",
    vehiclesPlate: "رقم اللوحة",
    vehiclesOdometer: "عداد المسافة",
    vehiclesSave: "حفظ المركبة",
    vehiclesSaving: "جارٍ الإضافة...",
    vehiclesFailed: "فشل إضافة المركبة",
    vehiclesAdded: "تمت إضافة المركبة بنجاح",
    vehiclesDeleted: "تم حذف المركبة",
    vehiclesDeleteConfirm: "هل تريد حذف هذه المركبة؟",
    vehiclesLabelPlate: "اللوحة",
    vehiclesLabelOdo: "العداد",
    vehiclesLabelLastScan: "آخر فحص",
    vehiclesNever: "لم يُفحص",
    vehiclesStartScan: "بدء الفحص",
    vehiclesViewDetails: "عرض التفاصيل",
    vehiclesDelete: "حذف",
    vehiclesEmpty: "لم يتم العثور على مركبات",
    vehiclesEmptySub: "غيّر كلمة البحث أو أضف مركبة جديدة",
    vehiclesNoVin: "بدون VIN",

    // Diagnostics
    diagTitle: "مركز التشخيص",
    diagSubtitle: "بدء جلسات الفحص ومراجعة النتائج",
    diagStartScan: "بدء فحص جديد",
    diagConfigTitle: "إعداد جلسة التشخيص",
    diagSelectVehicle: "اختر المركبة",
    diagChooseVehicle: "اختر مركبة",
    diagScanType: "نوع الفحص",
    diagFullScan: "فحص شامل (جميع الأنظمة)",
    diagQuickScan: "فحص سريع (المحرك / ناقل الحركة / ABS / الوسادات)",
    diagSystemScan: "وحدة تحكم (اختر النظام)",
    diagBeginDiagnosis: "بدء التشخيص",
    diagStarting: "جارٍ البدء...",
    diagRecentSessions: "الجلسات الأخيرة",
    diagRecentSubtitle: "مراجعة جلسات التشخيص السابقة والتقارير",
    diagNoSessions: "لا توجد جلسات تشخيص.",
    diagSystems: "أنظمة",
    diagFaults: "أعطال",
    diagStatus: "الحالة",
    diagViewDetails: "عرض التفاصيل",
    diagScanStarted: "تم بدء الفحص بنجاح",

    // Session Detail
    sessionDiagnosticScan: "جلسة التشخيص",
    sessionTroubleCodes: "أكواد الأعطال",
    sessionLiveData: "البيانات الحية",
    sessionNoDtc: "لا توجد أكواد أعطال",
    sessionNoDtcSub: "الأنظمة تعمل بشكل طبيعي",
    sessionNoLive: "لا تتوفر بيانات حية لهذه الجلسة.",
    sessionPossibleCauses: "الأسباب المحتملة",
    sessionClearCode: "مسح الكود",
    sessionCleared: "تم مسح كود DTC بنجاح",

    // ADAS
    adasTitle: "معايرة أنظمة ADAS",
    adasSubtitle: "أنظمة مساعدة السائق المتقدمة",
    adasStart: "بدء المعايرة",
    adasConfigTitle: "إعداد معايرة ADAS",
    adasSystem: "نظام ADAS",
    adasChooseSystem: "اختر النظام",
    adasCalibrationType: "نوع المعايرة",
    adasStatic: "ثابتة (لوحة هدف)",
    adasDynamic: "ديناميكية (اختبار الطريق)",
    adasBoth: "كلاهما",
    adasBegin: "بدء المعايرة",
    adasStarting: "جارٍ البدء...",
    adasHistory: "سجل المعايرة",
    adasNoHistory: "لا يوجد سجل معايرة.",
    adasSupported: "الأنظمة المدعومة",
    adasTargetBoard: "لوحة هدف",
    adasLevel: "مستوى",
    adasStarted: "تم بدء المعايرة بنجاح",
    adasSelectVehicle: "اختر المركبة",

    // Maintenance
    maintTitle: "إعادة ضبط الخدمة",
    maintSubtitle: "إعادة الضبط والتكيّف والتهيئة",
    maintPerform: "تنفيذ إعادة الضبط",
    maintPerformTitle: "تنفيذ إعادة ضبط الخدمة",
    maintSelectVehicle: "اختر المركبة",
    maintChooseVehicle: "اختر مركبة",
    maintResetType: "نوع إعادة الضبط",
    maintChooseReset: "اختر نوع الإعادة",
    maintExecute: "تنفيذ",
    maintExecuting: "جارٍ التنفيذ...",
    maintAvailable: "وظائف إعادة الضبط المتاحة",
    maintSearch: "بحث (مثال: زيت، فرامل، توجيه)...",
    maintHistory: "السجل الأخير",
    maintNoHistory: "لا يوجد سجل لإعادة الضبط.",
    maintSuccess: "تم تنفيذ إعادة الضبط بنجاح",
    maintSelectBoth: "يرجى اختيار المركبة ونوع إعادة الضبط",

    // DTC Library
    dtcTitle: "مكتبة أكواد DTC",
    dtcSubtitle: "ابحث في أكواد الأعطال التشخيصية",
    dtcSearch: "ابحث بالكود (P0171)، أو الكلمة المفتاحية، أو النظام...",
    dtcClear: "مسح",
    dtcResults: "نتائج",
    dtcResult: "نتيجة",
    dtcFor: "لـ",
    dtcIn: "في",
    dtcNoResults: "لم يتم العثور على أكواد",
    dtcNoResultsSub: "جرّب كلمة بحث أو كوداً مختلفاً",
    dtcViewDetails: "← عرض التفاصيل",
    dtcVeryCommon: "شائع جداً",
    dtcCommon: "شائع",
    dtcUncommon: "نادر",
    dtcAll: "الكل",

    // DTC Detail Modal
    dtcModalCauses: "الأسباب المحتملة",
    dtcModalCausesHint: "(الأكثر شيوعاً أولاً)",
    dtcModalSymptoms: "الأعراض",
    dtcModalRecommendations: "خطوات التشخيص",
    dtcModalComponents: "المكونات المتأثرة",
    dtcModalCategory: "الفئة",
    dtcModalSystem: "النظام",

    // Severity labels
    sevCritical: "حرج",
    sevWarning: "تحذير",
    sevInfo: "معلومة",

    // Status labels
    statusCompleted: "مكتمل",
    statusRunning: "قيد التشغيل",
    statusFailed: "فشل",
    statusActive: "نشط",
    statusCleared: "تم المسح",
    statusPending: "معلق",
    statusSuccess: "نجاح",
    statusPass: "ناجح",

    // General
    loading: "جارٍ التحميل...",
    noVin: "لا VIN",
    unknown: "غير معروف",
  },
};

export type TranslationKey = keyof typeof translations.en;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  dir: "ltr",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem("lang") as Lang) || "en"; } catch { return "en"; }
  });

  const dir = lang === "ar" ? "rtl" : "ltr";

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const t = (key: TranslationKey): string => {
    return (translations[lang] as any)[key] ?? (translations.en as any)[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
