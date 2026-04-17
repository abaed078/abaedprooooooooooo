export interface PidDef {
  pid: string;
  name: string;
  nameAr: string;
  bytes: number;
  unit: string;
  min: number;
  max: number;
  decode: (data: number[]) => number;
  category: "engine" | "fuel" | "temperature" | "emissions" | "electrical" | "exhaust";
}

export const PIDS: PidDef[] = [
  {
    pid: "04", name: "Engine Load", nameAr: "حمل المحرك",
    bytes: 1, unit: "%", min: 0, max: 100, category: "engine",
    decode: ([A]) => (A * 100) / 255,
  },
  {
    pid: "05", name: "Coolant Temp", nameAr: "درجة حرارة المبرد",
    bytes: 1, unit: "°C", min: -40, max: 215, category: "temperature",
    decode: ([A]) => A - 40,
  },
  {
    pid: "06", name: "Short Fuel Trim B1", nameAr: "ضبط الوقود القصير B1",
    bytes: 1, unit: "%", min: -100, max: 99.2, category: "fuel",
    decode: ([A]) => (A / 1.28) - 100,
  },
  {
    pid: "07", name: "Long Fuel Trim B1", nameAr: "ضبط الوقود الطويل B1",
    bytes: 1, unit: "%", min: -100, max: 99.2, category: "fuel",
    decode: ([A]) => (A / 1.28) - 100,
  },
  {
    pid: "0B", name: "Intake Manifold Pressure", nameAr: "ضغط مشعب السحب",
    bytes: 1, unit: "kPa", min: 0, max: 255, category: "engine",
    decode: ([A]) => A,
  },
  {
    pid: "0C", name: "Engine RPM", nameAr: "دورات المحرك",
    bytes: 2, unit: "RPM", min: 0, max: 16383.75, category: "engine",
    decode: ([A, B]) => ((A * 256) + B) / 4,
  },
  {
    pid: "0D", name: "Vehicle Speed", nameAr: "سرعة المركبة",
    bytes: 1, unit: "km/h", min: 0, max: 255, category: "engine",
    decode: ([A]) => A,
  },
  {
    pid: "0E", name: "Timing Advance", nameAr: "تقديم الإشعال",
    bytes: 1, unit: "°", min: -64, max: 63.5, category: "engine",
    decode: ([A]) => (A / 2) - 64,
  },
  {
    pid: "0F", name: "Intake Air Temp", nameAr: "درجة حرارة هواء السحب",
    bytes: 1, unit: "°C", min: -40, max: 215, category: "temperature",
    decode: ([A]) => A - 40,
  },
  {
    pid: "10", name: "MAF Air Flow Rate", nameAr: "معدل تدفق هواء MAF",
    bytes: 2, unit: "g/s", min: 0, max: 655.35, category: "engine",
    decode: ([A, B]) => ((A * 256) + B) / 100,
  },
  {
    pid: "11", name: "Throttle Position", nameAr: "موضع الخانق",
    bytes: 1, unit: "%", min: 0, max: 100, category: "engine",
    decode: ([A]) => (A * 100) / 255,
  },
  {
    pid: "14", name: "O2 Sensor 1 Voltage", nameAr: "جهد حساس O2 (1)",
    bytes: 2, unit: "V", min: 0, max: 1.275, category: "emissions",
    decode: ([A]) => A / 200,
  },
  {
    pid: "1F", name: "Run Time Since Start", nameAr: "وقت التشغيل",
    bytes: 2, unit: "s", min: 0, max: 65535, category: "engine",
    decode: ([A, B]) => (A * 256) + B,
  },
  {
    pid: "21", name: "Distance (MIL on)", nameAr: "المسافة مع ضوء العطل",
    bytes: 2, unit: "km", min: 0, max: 65535, category: "emissions",
    decode: ([A, B]) => (A * 256) + B,
  },
  {
    pid: "2C", name: "EGR Command", nameAr: "أمر EGR",
    bytes: 1, unit: "%", min: 0, max: 100, category: "emissions",
    decode: ([A]) => (A * 100) / 255,
  },
  {
    pid: "2F", name: "Fuel Level", nameAr: "مستوى الوقود",
    bytes: 1, unit: "%", min: 0, max: 100, category: "fuel",
    decode: ([A]) => (A * 100) / 255,
  },
  {
    pid: "31", name: "Distance Since Codes Cleared", nameAr: "المسافة بعد مسح الأكواد",
    bytes: 2, unit: "km", min: 0, max: 65535, category: "emissions",
    decode: ([A, B]) => (A * 256) + B,
  },
  {
    pid: "33", name: "Barometric Pressure", nameAr: "الضغط الجوي",
    bytes: 1, unit: "kPa", min: 0, max: 255, category: "engine",
    decode: ([A]) => A,
  },
  {
    pid: "42", name: "Control Module Voltage", nameAr: "جهد وحدة التحكم",
    bytes: 2, unit: "V", min: 0, max: 65.535, category: "electrical",
    decode: ([A, B]) => ((A * 256) + B) / 1000,
  },
  {
    pid: "43", name: "Absolute Load Value", nameAr: "الحمل المطلق",
    bytes: 2, unit: "%", min: 0, max: 25700, category: "engine",
    decode: ([A, B]) => ((A * 256) + B) * 100 / 255,
  },
  {
    pid: "46", name: "Ambient Air Temp", nameAr: "درجة الحرارة المحيطة",
    bytes: 1, unit: "°C", min: -40, max: 215, category: "temperature",
    decode: ([A]) => A - 40,
  },
  {
    pid: "49", name: "Accelerator Pedal D", nameAr: "دواسة التسارع D",
    bytes: 1, unit: "%", min: 0, max: 100, category: "engine",
    decode: ([A]) => (A * 100) / 255,
  },
  {
    pid: "4C", name: "Commanded Throttle Actuator", nameAr: "الخانق المُؤمَر",
    bytes: 1, unit: "%", min: 0, max: 100, category: "engine",
    decode: ([A]) => (A * 100) / 255,
  },
  {
    pid: "5C", name: "Oil Temperature", nameAr: "درجة حرارة الزيت",
    bytes: 1, unit: "°C", min: -40, max: 215, category: "temperature",
    decode: ([A]) => A - 40,
  },
  {
    pid: "5E", name: "Fuel Rate", nameAr: "معدل استهلاك الوقود",
    bytes: 2, unit: "L/h", min: 0, max: 3276.75, category: "fuel",
    decode: ([A, B]) => ((A * 256) + B) * 0.05,
  },
];

export const PID_MAP: Record<string, PidDef> = Object.fromEntries(PIDS.map(p => [p.pid, p]));

export const DTC_PREFIXES: Record<string, string> = {
  "0": "P0", "1": "P1", "2": "P2", "3": "P3",
  "4": "C0", "5": "C1", "6": "C2", "7": "C3",
  "8": "B0", "9": "B1", "A": "B2", "B": "B3",
  "C": "U0", "D": "U1", "E": "U2", "F": "U3",
};

export function parseDtcFromBytes(high: number, low: number): string {
  const nibble = (high >> 4) & 0x0F;
  const prefix = DTC_PREFIXES[nibble.toString(16).toUpperCase()] || "P0";
  const code = ((high & 0x3F) * 256 + low).toString(16).toUpperCase().padStart(4, "0");
  return prefix.charAt(0) + code;
}
