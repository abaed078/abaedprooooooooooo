export interface VinInfo {
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  manufacturer: string;
  plantCountry: string;
  engineType?: string;
  bodyClass?: string;
  driveType?: string;
  fuelType?: string;
  transmissionStyle?: string;
  error?: string;
}

export async function decodeVin(vin: string): Promise<VinInfo> {
  const clean = vin.trim().toUpperCase();
  if (clean.length !== 17) throw new Error("VIN must be 17 characters");

  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${clean}?format=json`
  );
  if (!res.ok) throw new Error("VIN lookup failed");

  const data = await res.json();
  const results: any[] = data.Results || [];

  const get = (variable: string) =>
    results.find(r => r.Variable === variable)?.Value || "";

  const info: VinInfo = {
    vin: clean,
    make:               get("Make"),
    model:              get("Model"),
    modelYear:          get("Model Year"),
    manufacturer:       get("Manufacturer Name"),
    plantCountry:       get("Plant Country"),
    engineType:         get("Engine Model"),
    bodyClass:          get("Body Class"),
    driveType:          get("Drive Type"),
    fuelType:           get("Fuel Type - Primary"),
    transmissionStyle:  get("Transmission Style"),
  };

  if (!info.make || info.make === "0") info.error = "VIN not found in database";
  return info;
}

export function validateVin(vin: string): boolean {
  if (vin.length !== 17) return false;
  const invalid = /[IOQ]/i;
  return !invalid.test(vin);
}
