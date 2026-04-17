import { useState, useEffect } from "react";

export interface WorkshopBrand {
  shopName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  logoDataUrl: string;
  primaryColor: string;
  accentColor: string;
  technicianName: string;
  licenseNumber: string;
}

const DEFAULT_BRAND: WorkshopBrand = {
  shopName: "MaxiSYS Diagnostic Center",
  tagline: "Professional Automotive Diagnostics",
  phone: "",
  email: "",
  address: "",
  website: "",
  logoDataUrl: "",
  primaryColor: "#0a0f1e",
  accentColor: "#3b82f6",
  technicianName: "",
  licenseNumber: "",
};

const STORAGE_KEY = "workshop-brand";

export function getWorkshopBrand(): WorkshopBrand {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_BRAND, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_BRAND };
}

export function saveWorkshopBrand(brand: Partial<WorkshopBrand>): void {
  const current = getWorkshopBrand();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...brand }));
}

export function useWorkshopBrand() {
  const [brand, setBrand] = useState<WorkshopBrand>(getWorkshopBrand);

  useEffect(() => {
    const onStorage = () => setBrand(getWorkshopBrand());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateBrand = (partial: Partial<WorkshopBrand>) => {
    saveWorkshopBrand(partial);
    setBrand(getWorkshopBrand());
  };

  return { brand, updateBrand };
}
