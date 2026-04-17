import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Technician {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  avatar: string;
  color: string;
}

export const TECHNICIANS: Technician[] = [
  { id: "tech1", name: "Ahmad Al-Mahmoud", nameAr: "أحمد المحمود", role: "Senior Diagnostics Specialist", roleAr: "أخصائي تشخيص أول", avatar: "أ", color: "bg-blue-600" },
  { id: "tech2", name: "Khalid Al-Rashid",  nameAr: "خالد الراشد",  role: "ECU Programming Engineer", roleAr: "مهندس برمجة وحدات ECU", avatar: "خ", color: "bg-green-600" },
  { id: "tech3", name: "Saeed Al-Otaibi",   nameAr: "سعيد العتيبي", role: "ADAS Calibration Technician", roleAr: "فني معايرة أنظمة ADAS", avatar: "س", color: "bg-purple-600" },
  { id: "tech4", name: "Omar Al-Dosari",    nameAr: "عمر الدوسري",  role: "Electrical Systems Expert", roleAr: "خبير الأنظمة الكهربائية", avatar: "ع", color: "bg-orange-600" },
];

interface TechnicianContextValue {
  current: Technician;
  setCurrent: (t: Technician) => void;
  all: Technician[];
}

const TechnicianContext = createContext<TechnicianContextValue>({
  current: TECHNICIANS[0],
  setCurrent: () => {},
  all: TECHNICIANS,
});

export function TechnicianProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Technician>(() => {
    try {
      const saved = localStorage.getItem("autel_technician");
      if (saved) {
        const found = TECHNICIANS.find(t => t.id === saved);
        if (found) return found;
      }
    } catch (e) {
      console.warn("Failed to load technician", e);
    }
    return TECHNICIANS[0];
  });

  const handleSet = (t: Technician) => {
    setCurrent(t);
    try { localStorage.setItem("autel_technician", t.id); } catch (e) {
      console.warn("Failed to save technician", e);
    }
  };

  return (
    <TechnicianContext.Provider value={{ current, setCurrent: handleSet, all: TECHNICIANS }}>
      {children}
    </TechnicianContext.Provider>
  );
}

export function useTechnician() {
  return useContext(TechnicianContext);
}
