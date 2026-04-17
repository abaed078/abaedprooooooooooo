export type AdapterType = "bluetooth" | "serial" | "wifi";

export interface ObdAdapter {
  type: AdapterType;
  send(cmd: string): Promise<string>;
  close(): void;
}

const PROMPT = ">";
const CRLF = "\r";
const TIMEOUT_MS = 5000;

function trimResponse(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && l !== ">" && l !== "OK" && !l.startsWith("SEARCHING") && !l.startsWith("BUS"))
    .join(" ")
    .trim();
}

/* ─── WebBluetooth adapter ─────────────────────────────────────────────── */

const BT_UUIDS = {
  SERVICE:   "0000fff0-0000-1000-8000-00805f9b34fb",
  WRITE_CH:  "0000fff2-0000-1000-8000-00805f9b34fb",
  NOTIFY_CH: "0000fff1-0000-1000-8000-00805f9b34fb",
  NORDIC_SERVICE: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  NORDIC_TX:      "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  NORDIC_RX:      "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
};

export async function connectBluetooth(): Promise<ObdAdapter> {
  const nav = navigator as any;
  if (!nav.bluetooth) throw new Error("WebBluetooth not supported in this browser");

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      BT_UUIDS.SERVICE,
      BT_UUIDS.NORDIC_SERVICE,
      "0000ffe0-0000-1000-8000-00805f9b34fb",
    ],
  });

  const server = await device.gatt.connect();

  let writeChar: any;
  let notifyChar: any;
  let buffer = "";

  const tryGetChars = async (svcUuid: string, txUuid: string, rxUuid: string) => {
    const svc = await server.getPrimaryService(svcUuid);
    const w = await svc.getCharacteristic(txUuid);
    const n = await svc.getCharacteristic(rxUuid);
    return { w, n };
  };

  const services = [
    [BT_UUIDS.SERVICE, BT_UUIDS.WRITE_CH, BT_UUIDS.NOTIFY_CH],
    [BT_UUIDS.NORDIC_SERVICE, BT_UUIDS.NORDIC_TX, BT_UUIDS.NORDIC_RX],
    ["0000ffe0-0000-1000-8000-00805f9b34fb", "0000ffe1-0000-1000-8000-00805f9b34fb", "0000ffe1-0000-1000-8000-00805f9b34fb"],
  ];

  for (const [svc, tx, rx] of services) {
    try {
      const { w, n } = await tryGetChars(svc, tx, rx);
      writeChar = w;
      notifyChar = n;
      break;
    } catch { continue; }
  }

  if (!writeChar! || !notifyChar!) throw new Error("Compatible GATT service not found on adapter");

  await notifyChar.startNotifications();

  const resolvers: Array<{ resolve: (v: string) => void; reject: (e: Error) => void }> = [];

  notifyChar.addEventListener("characteristicvaluechanged", (evt: any) => {
    const view = evt.target.value as DataView;
    const chunk = new TextDecoder().decode(view);
    buffer += chunk;
    if (buffer.includes(PROMPT)) {
      const res = buffer;
      buffer = "";
      const r = resolvers.shift();
      if (r) r.resolve(res);
    }
  });

  const send = (cmd: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = resolvers.findIndex(r => r.resolve === resolve);
        if (idx !== -1) resolvers.splice(idx, 1);
        reject(new Error(`OBD timeout: ${cmd}`));
      }, TIMEOUT_MS);
      resolvers.push({
        resolve: (v) => { clearTimeout(timer); resolve(trimResponse(v)); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      const encoded = new TextEncoder().encode(cmd + CRLF);
      writeChar.writeValue(encoded).catch(reject);
    });

  return {
    type: "bluetooth",
    send,
    close: () => device.gatt?.disconnect(),
  };
}

/* ─── WebSerial adapter ─────────────────────────────────────────────────── */
// Supported baud rates (highest priority first)
// vLinker FS / MC+: 115200 — Classic ELM327 clones: 38400 — OBDLINK: 115200
const SERIAL_BAUD_RATES = [115200, 38400, 57600, 9600];

async function openSerialPort(port: any, baudRate: number) {
  if (port.readable) {
    try { await port.close(); } catch { /* ignore */ }
  }
  await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: "none" });
}

export async function connectSerial(): Promise<ObdAdapter> {
  const nav = navigator as any;
  if (!nav.serial) throw new Error("WebSerial not supported in this browser");

  const port = await nav.serial.requestPort();

  // Auto-detect baud rate — try common rates starting with 115200 (vLinker FS default)
  let opened = false;
  for (const baud of SERIAL_BAUD_RATES) {
    try {
      await openSerialPort(port, baud);
      opened = true;
      break;
    } catch { /* try next */ }
  }
  if (!opened) throw new Error("Could not open serial port at any baud rate");

  const writer = port.writable.getWriter();
  const reader = port.readable.getReader();

  let buffer = "";
  let waitResolve: ((v: string) => void) | null = null;

  (async () => {
    while (true) {
      try {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += new TextDecoder().decode(value);
        if (buffer.includes(PROMPT) && waitResolve) {
          const res = buffer;
          buffer = "";
          const fn = waitResolve as (v: string) => void;
          waitResolve = null;
          fn(trimResponse(res));
        }
      } catch { break; }
    }
  })();

  const send = (cmd: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waitResolve = null;
        reject(new Error(`OBD timeout: ${cmd}`));
      }, TIMEOUT_MS);
      waitResolve = (v) => { clearTimeout(timer); resolve(v); };
      writer.write(new TextEncoder().encode(cmd + CRLF)).catch(reject);
    });

  return {
    type: "serial",
    send,
    close: () => { writer.close(); reader.cancel(); port.close(); },
  };
}

/* ─── WebSocket → TCP WiFi adapter (proxy via API server) ──────────────── */

export async function connectWifi(host: string, port: number): Promise<ObdAdapter> {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${proto}//${location.host}/api/obd/wifi?host=${encodeURIComponent(host)}&port=${port}`;

  const ws = new WebSocket(wsUrl);

  let buffer = "";
  let waitResolve: ((v: string) => void) | null = null;
  let connected = false;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WiFi proxy connection timed out")), 8000);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "connected") {
          connected = true;
          clearTimeout(timer);
          resolve();
        } else if (msg.type === "error") {
          clearTimeout(timer);
          reject(new Error(msg.message ?? "WiFi TCP error"));
        }
        return;
      } catch { /* not JSON — raw ELM327 data */ }

      buffer += e.data as string;
      if (buffer.includes(PROMPT) && waitResolve) {
        const res = buffer;
        buffer = "";
        const fn = waitResolve;
        waitResolve = null;
        fn(trimResponse(res));
      }
    };

    ws.onerror = () => { clearTimeout(timer); reject(new Error("WebSocket error")); };
    ws.onclose = () => { if (!connected) { clearTimeout(timer); reject(new Error("WebSocket closed")); } };
  });

  // After handshake, all messages are raw ELM327
  ws.onmessage = (e) => {
    buffer += e.data as string;
    if (buffer.includes(PROMPT) && waitResolve) {
      const res = buffer;
      buffer = "";
      const fn = waitResolve;
      waitResolve = null;
      fn(trimResponse(res));
    }
  };

  const send = (cmd: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waitResolve = null;
        reject(new Error(`OBD timeout: ${cmd}`));
      }, TIMEOUT_MS);
      waitResolve = (v) => { clearTimeout(timer); resolve(v); };
      ws.send(cmd + CRLF);
    });

  return {
    type: "wifi",
    send,
    close: () => { try { ws.close(); } catch { /* ignore */ } },
  };
}

/* ─── ELM327 initializer ────────────────────────────────────────────────── */

export interface Elm327Info {
  version: string;
  protocol: string;
  vin: string;
}

export async function initElm327(adapter: ObdAdapter): Promise<Elm327Info> {
  await adapter.send("ATZ");
  await delay(500);
  await adapter.send("ATE0");
  await adapter.send("ATL0");
  await adapter.send("ATS0");
  await adapter.send("ATH0");
  await adapter.send("ATSP0");

  const version  = await adapter.send("ATI").catch(() => "ELM327 v1.x");
  const protocol = await adapter.send("ATDPN").catch(() => "Auto");
  const vin      = await readVin(adapter);

  return { version, protocol, vin };
}

export async function readVin(adapter: ObdAdapter): Promise<string> {
  try {
    const raw = await adapter.send("0902");
    const hex = raw.replace(/[^0-9A-Fa-f ]/g, "").trim();
    const bytes = hex.split(" ").filter(b => b.length === 2 && b !== "49" && b !== "02");
    const vin = bytes.map(b => String.fromCharCode(parseInt(b, 16))).join("").replace(/[^\x20-\x7E]/g, "");
    return vin.length >= 10 ? vin : "";
  } catch { return ""; }
}

export async function readSupportedPids(adapter: ObdAdapter): Promise<Set<string>> {
  const supported = new Set<string>();
  const ranges = ["0100", "0120", "0140", "0160"];

  for (const cmd of ranges) {
    try {
      const raw = await adapter.send(cmd);
      const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
      if (hex.length < 8) continue;
      const bits = parseInt(hex.slice(0, 8), 16);
      const base = parseInt(cmd.slice(2), 16);
      for (let i = 0; i < 32; i++) {
        if (bits & (1 << (31 - i))) {
          supported.add((base + i + 1).toString(16).toUpperCase().padStart(2, "0"));
        }
      }
    } catch { break; }
  }

  return supported;
}

export async function readPid(adapter: ObdAdapter, pid: string, bytes: number): Promise<number[] | null> {
  try {
    const raw = await adapter.send(`01${pid}`);
    const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
    if (hex.length < (2 + bytes * 2)) return null;
    const skip = hex.startsWith("41") ? 4 : 0;
    const result: number[] = [];
    for (let i = 0; i < bytes; i++) {
      result.push(parseInt(hex.slice(skip + i * 2, skip + i * 2 + 2), 16));
    }
    return result;
  } catch { return null; }
}

export async function readDtcs(adapter: ObdAdapter): Promise<string[]> {
  try {
    const raw = await adapter.send("03");
    const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
    const dtcs: string[] = [];
    for (let i = 0; i + 4 <= hex.length; i += 4) {
      const high = parseInt(hex.slice(i, i + 2), 16);
      const low  = parseInt(hex.slice(i + 2, i + 4), 16);
      if (high === 0 && low === 0) continue;
      const { parseDtcFromBytes } = await import("./pids");
      dtcs.push(parseDtcFromBytes(high, low));
    }
    return dtcs;
  } catch { return []; }
}

export async function clearDtcs(adapter: ObdAdapter): Promise<boolean> {
  try {
    const res = await adapter.send("04");
    return res.includes("44") || res.includes("OK") || res.toUpperCase().includes("OK");
  } catch { return false; }
}

export async function readFreezeFrame(adapter: ObdAdapter, pid: string): Promise<number[] | null> {
  try {
    const raw = await adapter.send(`0200${pid}`);
    const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
    if (!hex || hex.length < 4) return null;
    const skip = 4;
    const result: number[] = [];
    for (let i = skip; i + 2 <= hex.length; i += 2) {
      result.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return result;
  } catch { return null; }
}

/* ─── UDS IO Control (Service 2F — ISO 14229) ────────────────────────────
 *  dataId     : 2-byte Data Identifier (e.g. 0x1234)
 *  controlOption: 03 = shortTermAdjustment, 00 = returnControl
 *  controlRecord: 1-byte value (0x00–0xFF)  – ignored when returning control
 */
export interface ActuatorResult {
  supported: boolean;
  rawResponse: string;
  value?: number;
  unit?: string;
}

export async function udsIoControl(
  adapter: ObdAdapter,
  dataId: string,     // 4-char hex e.g. "1234"
  controlRecord: number = 0x03,
  valueHex: string = "FF",
): Promise<ActuatorResult> {
  try {
    // Select ECU header (functional address 7DF for broadcast)
    await adapter.send("ATSH7DF");
    const cmd = `2F${dataId}${controlRecord.toString(16).padStart(2, "0").toUpperCase()}${valueHex}`;
    const raw = await adapter.send(cmd);
    const clean = raw.replace(/[^0-9A-Fa-f\s]/g, "").trim();
    if (clean.startsWith("6F") || clean.includes("6F")) {
      const bytes = clean.replace(/\s/g, "");
      const fb = bytes.length > 8 ? parseInt(bytes.slice(8, 10), 16) : 0;
      return { supported: true, rawResponse: raw, value: fb };
    }
    if (raw.includes("NO DATA") || raw.includes("7F")) {
      return { supported: false, rawResponse: raw };
    }
    return { supported: false, rawResponse: raw };
  } catch (e: any) {
    return { supported: false, rawResponse: e.message || "Timeout" };
  }
}

/* ─── OBD-II Mode 08 — On-Board Test Control ─────────────────────────────
 *  tid: Test ID (1 byte hex)  e.g. "01" = Rich/Lean oxygen sensor
 */
export async function obdMode08(adapter: ObdAdapter, tid: string): Promise<ActuatorResult> {
  try {
    const raw = await adapter.send(`08${tid}`);
    const clean = raw.replace(/[^0-9A-Fa-f]/g, "");
    if (clean.startsWith("48") || clean.length > 4) {
      return { supported: true, rawResponse: raw };
    }
    return { supported: false, rawResponse: raw };
  } catch (e: any) {
    return { supported: false, rawResponse: e.message || "Timeout" };
  }
}

/* ─── Return actuator control to ECU ──────────────────────────────────────*/
export async function returnControl(adapter: ObdAdapter, dataId: string): Promise<void> {
  try {
    await adapter.send("ATSH7DF");
    await adapter.send(`2F${dataId}0000`);
  } catch { /* silent */ }
}

/* ─── OBD-II Mode 01 PID 01 — Readiness Monitor Status ──────────────────
 *  Returns real monitor ready/incomplete bits directly from the ECU.
 *  Byte A: bit7=MIL, bits6-0=DTC count
 *  Byte B: continuous monitors supported/complete (misfire, fuel, comp.)
 *  Byte C: non-continuous supported flags
 *  Byte D: non-continuous ready flags (0 bit = complete)
 */
export interface MonitorStatus {
  milOn: boolean;
  confirmedDtcCount: number;
  misfire:      { supported: boolean; complete: boolean };
  fuelSystem:   { supported: boolean; complete: boolean };
  component:    { supported: boolean; complete: boolean };
  catalyst:     { supported: boolean; complete: boolean };
  heatedCat:    { supported: boolean; complete: boolean };
  evap:         { supported: boolean; complete: boolean };
  secondaryAir: { supported: boolean; complete: boolean };
  acRefrig:     { supported: boolean; complete: boolean };
  o2Sensor:     { supported: boolean; complete: boolean };
  o2SensorHeat: { supported: boolean; complete: boolean };
  egrVvt:       { supported: boolean; complete: boolean };
}

export async function readMonitors(adapter: ObdAdapter): Promise<MonitorStatus | null> {
  try {
    const raw = await adapter.send("0101");
    const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
    if (hex.length < 8) return null;

    // Strip "4101" header if present
    const start = hex.toUpperCase().startsWith("4101") ? 4 : 0;
    if (hex.length - start < 8) return null;

    const A = parseInt(hex.slice(start,     start + 2), 16);
    const B = parseInt(hex.slice(start + 2, start + 4), 16);
    const C = parseInt(hex.slice(start + 4, start + 6), 16);
    const D = parseInt(hex.slice(start + 6, start + 8), 16);

    const bit = (byte: number, n: number) => !!(byte & (1 << n));

    // Byte B: continuous monitors
    const misfireSupported  = bit(B, 0);
    const fuelSupported     = bit(B, 1);
    const compSupported     = bit(B, 2);
    const misfireComplete   = bit(B, 4);
    const fuelComplete      = bit(B, 5);
    const compComplete      = bit(B, 6);

    // Byte C = supported mask, Byte D = incomplete mask (0=complete)
    const nonCont = (bit: number) => ({
      supported: !!(C & (1 << bit)),
      complete:  !!(C & (1 << bit)) && !(D & (1 << bit)),
    });

    return {
      milOn: bit(A, 7),
      confirmedDtcCount: A & 0x7F,
      misfire:      { supported: misfireSupported,  complete: misfireSupported && misfireComplete },
      fuelSystem:   { supported: fuelSupported,     complete: fuelSupported && fuelComplete },
      component:    { supported: compSupported,     complete: compSupported && compComplete },
      catalyst:     nonCont(0),
      heatedCat:    nonCont(1),
      evap:         nonCont(2),
      secondaryAir: nonCont(3),
      acRefrig:     nonCont(4),
      o2Sensor:     nonCont(5),
      o2SensorHeat: nonCont(6),
      egrVvt:       nonCont(7),
    };
  } catch { return null; }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
