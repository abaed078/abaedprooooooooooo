export function sanitize<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : v])
  ) as T;
}

export function sanitizeArray<T extends object>(arr: T[]): T[] {
  return arr.map(sanitize);
}
