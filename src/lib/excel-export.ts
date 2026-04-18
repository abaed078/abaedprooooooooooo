import * as XLSX from "xlsx";

export interface LiveSensorRow {
  pid: string;
  nameEn: string;
  nameAr: string;
  value: number | string;
  unit: string;
  min?: number;
  max?: number;
  timestamp: string;
}

export function exportLiveDataToExcel(sensors: LiveSensorRow[], vehicleInfo?: string): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Sensor data
  const rows = sensors.map(s => ({
    "PID": s.pid,
    "Parameter (EN)": s.nameEn,
    "Parameter (AR)": s.nameAr,
    "Value": s.value,
    "Unit": s.unit,
    "Min": s.min ?? "",
    "Max": s.max ?? "",
    "Timestamp": s.timestamp,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Live Data");

  // Sheet 2: Info
  const infoWs = XLSX.utils.aoa_to_sheet([
    ["Autel MaxiSYS MS Ultra S2"],
    ["Export Date", new Date().toISOString()],
    vehicleInfo ? ["Vehicle", vehicleInfo] : ["Vehicle", "Unknown"],
    ["Total Parameters", sensors.length.toString()],
  ]);
  XLSX.utils.book_append_sheet(wb, infoWs, "Info");

  const filename = `MaxiSYS_LiveData_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportDtcReport(dtcs: { code: string; name: string; system: string; severity: string }[], vehicleInfo?: string): void {
  const wb = XLSX.utils.book_new();

  const rows = dtcs.map(d => ({
    "DTC Code": d.code,
    "Description": d.name,
    "System": d.system,
    "Severity": d.severity,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "DTC Report");

  XLSX.writeFile(wb, `MaxiSYS_DTC_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
