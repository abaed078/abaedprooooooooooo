import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ActiveVehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  mileage?: number;
  engineCode?: string;
}

interface VehicleContextValue {
  activeVehicle: ActiveVehicle | null;
  setActiveVehicle: (v: ActiveVehicle | null) => void;
  clearActiveVehicle: () => void;
}

const VehicleContext = createContext<VehicleContextValue>({
  activeVehicle: null,
  setActiveVehicle: () => {},
  clearActiveVehicle: () => {},
});

const STORAGE_KEY = "autel_active_vehicle";

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [activeVehicle, setActiveVehicleState] = useState<ActiveVehicle | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveVehicle = (v: ActiveVehicle | null) => {
    setActiveVehicleState(v);
    if (v) localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const clearActiveVehicle = () => setActiveVehicle(null);

  return (
    <VehicleContext.Provider value={{ activeVehicle, setActiveVehicle, clearActiveVehicle }}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useActiveVehicle() {
  return useContext(VehicleContext);
}
