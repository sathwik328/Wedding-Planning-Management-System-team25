import { Request, Response, NextFunction } from "express";

/**
 * Recursively converts all native BigInt fields in outgoing response objects to string values.
 */
export function sanitizeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(sanitizeBigInts);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = sanitizeBigInts(value);
    }
    return copy;
  }
  return obj;
}

export function bigIntSerializationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown): Response => {
    return originalJson(sanitizeBigInts(body));
  };
  next();
}
