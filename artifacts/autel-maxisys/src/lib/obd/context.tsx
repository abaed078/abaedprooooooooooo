import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import {
  ObdAdapter, Elm327Info, connectBluetooth, connectSerial, connectWifi,
  initElm327, readSupportedPids, readPid, readDtcs, clearDtcs, readVin, readFreezeFrame,
  udsIoControl, returnControl, ActuatorResult, readMonitors, MonitorStatus,
} from "./elm327";
import { PIDS, PID_MAP } from "./pids";

export type ConnectionState = "disconnected" | "connecting" | "initializing" | "connected" | "error";

export interface LivePidValue {
  pid: string;
  name: string;
  nameAr: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  category: string;
  history: number[];
}

export interface RealDtc {
  code: string;
  freezeFrame: Record<string, { value: number; unit: string }>;
}

export interface ObdContextValue {
  state: ConnectionState;
  error: string;
  adapterInfo: Elm327Info | null;
  supportedPids: Set<string>;
  livePids: Record<string, LivePidValue>;
  dtcs: RealDtc[];
  scanning: boolean;
  monitors: MonitorStatus | null;
  monitorsLoading: boolean;
  connectBt: () => Promise<void>;
  connectUsb: () => Promise<void>;
  connectWifi: (host: string, port: number) => Promise<void>;
  disconnect: () => void;
  scanDtcs: () => Promise<void>;
  clearAllDtcs: () => Promise<boolean>;
  fetchMonitors: () => Promise<void>;
  startLive: (pids: string[]) => void;
  stopLive: () => void;
  sendActuator: (dataId: string, valueHex?: string) => Promise<ActuatorResult>;
  releaseActuator: (dataId: string) => Promise<void>;
  isConnected: boolean;
}

const Ctx = createContext<ObdContextValue | null>(null);

const MAX_HISTORY = 60;

export function ObdProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState("");
  const [adapterInfo, setAdapterInfo] = useState<Elm327Info | null>(null);
  const [supportedPids, setSupportedPids] = useState<Set<string>>(new Set());
  const [livePids, setLivePids] = useState<Record<string, LivePidValue>>({});
  const [dtcs, setDtcs] = useState<RealDtc[]>([]);
  const [scanning, setScanning] = useState(false);
  const [monitors, setMonitors] = useState<MonitorStatus | null>(null);
  const [monitorsLoading, setMonitorsLoading] = useState(false);

  const adapterRef = useRef<ObdAdapter | null>(null);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePids = useRef<string[]>([]);

  const doConnect = useCallback(async (factory: () => Promise<ObdAdapter>) => {
    setState("connecting");
    setError("");
    try {
      const adapter = await factory();
      adapterRef.current = adapter;
      setState("initializing");
      const info = await initElm327(adapter);
      setAdapterInfo(info);
      const supported = await readSupportedPids(adapter);
      setSupportedPids(supported);
      setState("connected");
    } catch (e: any) {
      setState("error");
      setError(e.message || "Connection failed");
      adapterRef.current?.close();
      adapterRef.current = null;
    }
  }, []);

  const connectBt   = useCallback(() => doConnect(connectBluetooth), [doConnect]);
  const connectUsb  = useCallback(() => doConnect(connectSerial), [doConnect]);
  const connectWifiCb = useCallback((host: string, port: number) => doConnect(() => connectWifi(host, port)), [doConnect]);

  const disconnect = useCallback(() => {
    stopLive();
    adapterRef.current?.close();
    adapterRef.current = null;
    setState("disconnected");
    setAdapterInfo(null);
    setSupportedPids(new Set());
    setLivePids({});
    setDtcs([]);
    setMonitors(null);
    setError("");
  }, []);

  const fetchMonitors = useCallback(async () => {
    if (!adapterRef.current) return;
    setMonitorsLoading(true);
    try {
      const result = await readMonitors(adapterRef.current);
      setMonitors(result);
    } finally {
      setMonitorsLoading(false);
    }
  }, []);

  const scanDtcs = useCallback(async () => {
    if (!adapterRef.current) return;
    setScanning(true);
    try {
      const codes = await readDtcs(adapterRef.current);
      const results: RealDtc[] = [];
      for (const code of codes) {
        const freezeFrame: Record<string, { value: number; unit: string }> = {};
        const priority = ["0C", "05", "11", "0D", "0F", "42"];
        for (const pid of priority) {
          const def = PID_MAP[pid];
          if (!def) continue;
          const raw = await readFreezeFrame(adapterRef.current, pid);
          if (raw && raw.length >= def.bytes) {
            freezeFrame[def.nameAr] = { value: Math.round(def.decode(raw) * 10) / 10, unit: def.unit };
          }
        }
        results.push({ code, freezeFrame });
      }
      setDtcs(results);
    } finally {
      setScanning(false);
    }
  }, []);

  const clearAllDtcs = useCallback(async (): Promise<boolean> => {
    if (!adapterRef.current) return false;
    const ok = await clearDtcs(adapterRef.current);
    if (ok) setDtcs([]);
    return ok;
  }, []);

  const sendActuator = useCallback(async (dataId: string, valueHex = "FF"): Promise<ActuatorResult> => {
    if (!adapterRef.current) return { supported: false, rawResponse: "Not connected" };
    return udsIoControl(adapterRef.current, dataId, 0x03, valueHex);
  }, []);

  const releaseActuator = useCallback(async (dataId: string): Promise<void> => {
    if (!adapterRef.current) return;
    await returnControl(adapterRef.current, dataId);
  }, []);

  const stopLive = useCallback(() => {
    if (liveTimer.current) { clearInterval(liveTimer.current); liveTimer.current = null; }
    activePids.current = [];
  }, []);

  const startLive = useCallback((pids: string[]) => {
    stopLive();
    activePids.current = pids;

    const poll = async () => {
      const adapter = adapterRef.current;
      if (!adapter || state !== "connected") return;
      for (const pid of activePids.current) {
        const def = PID_MAP[pid];
        if (!def) continue;
        const raw = await readPid(adapter, pid, def.bytes);
        if (raw === null) continue;
        const val = Math.round(def.decode(raw) * 100) / 100;
        setLivePids(prev => {
          const existing = prev[pid];
          const hist = [...(existing?.history || []), val].slice(-MAX_HISTORY);
          return {
            ...prev,
            [pid]: { pid, name: def.name, nameAr: def.nameAr, value: val, unit: def.unit, min: def.min, max: def.max, category: def.category, history: hist },
          };
        });
      }
    };

    poll();
    liveTimer.current = setInterval(poll, 1500);
  }, [state]);

  useEffect(() => () => stopLive(), []);

  return (
    <Ctx.Provider value={{
      state, error, adapterInfo, supportedPids, livePids, dtcs, scanning,
      monitors, monitorsLoading,
      connectBt, connectUsb, connectWifi: connectWifiCb, disconnect,
      scanDtcs, clearAllDtcs, fetchMonitors, startLive, stopLive,
      sendActuator, releaseActuator,
      isConnected: state === "connected",
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useObd() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useObd must be inside ObdProvider");
  return ctx;
}
