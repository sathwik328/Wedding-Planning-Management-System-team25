import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  failedAttempts: number;
  firstAttemptAt: number;
  blockedUntil: number;
}

export interface LoginRateLimiterOptions {
  windowMs?: number; // default: 15 minutes
  maxFailedAttempts?: number; // default: 5
  blockDurationMs?: number; // default: 15 minutes
}

/**
 * In-Memory Sliding-Window Login Rate Limiter
 */
export class LoginRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxFailedAttempts: number;
  private readonly blockDurationMs: number;

  constructor(options?: LoginRateLimiterOptions) {
    this.windowMs = options?.windowMs ?? 15 * 60 * 1000; // 15 mins
    this.maxFailedAttempts = options?.maxFailedAttempts ?? 5;
    this.blockDurationMs = options?.blockDurationMs ?? 15 * 60 * 1000;

    // Periodic sweep every 5 minutes to prevent memory leaks from stale IPs
    const timer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (timer.unref) timer.unref();
  }

  public extractIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const firstIp = forwarded.split(",")[0].trim();
      if (firstIp) return firstIp;
    }
    return req.ip || req.socket?.remoteAddress || "127.0.0.1";
  }

  public recordFailedAttempt(ip: string): { blocked: boolean; remainingAttempts: number; retryAfterSeconds: number } {
    const now = Date.now();
    const record = this.records.get(ip);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      this.records.set(ip, {
        failedAttempts: 1,
        firstAttemptAt: now,
        blockedUntil: 0
      });
      return {
        blocked: false,
        remainingAttempts: this.maxFailedAttempts - 1,
        retryAfterSeconds: 0
      };
    }

    record.failedAttempts += 1;

    if (record.failedAttempts >= this.maxFailedAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      return {
        blocked: true,
        remainingAttempts: 0,
        retryAfterSeconds: Math.ceil(this.blockDurationMs / 1000)
      };
    }

    return {
      blocked: false,
      remainingAttempts: this.maxFailedAttempts - record.failedAttempts,
      retryAfterSeconds: 0
    };
  }

  public recordFailure(ip: string): { blocked: boolean; remainingAttempts: number; retryAfterSeconds: number } {
    return this.recordFailedAttempt(ip);
  }

  public isBlocked(ip: string): { blocked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const record = this.records.get(ip);

    if (!record) return { blocked: false, retryAfterSeconds: 0 };

    if (record.blockedUntil > now) {
      return {
        blocked: true,
        retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000)
      };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  }

  public recordSuccess(ip: string): void {
    this.records.delete(ip);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, rec] of this.records.entries()) {
      if (now > rec.blockedUntil && now - rec.firstAttemptAt > this.windowMs) {
        this.records.delete(ip);
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = this.extractIp(req);
      const { blocked, retryAfterSeconds } = this.isBlocked(ip);

      if (blocked) {
        res.setHeader("Retry-After", retryAfterSeconds.toString());
        return res.status(429).json({
          error: "Too many failed login attempts. Please try again later.",
          retryAfterSeconds
        });
      }

      next();
    };
  }
}

/**
 * General Purpose In-Memory Rate Limiter Middleware
 */
export function rateLimiter(options: { windowMs: number; maxRequests: number; keyPrefix?: string }) {
  const records = new Map<string, { count: number; resetAt: number }>();

  // Clean stale keys every 5 minutes
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of records.entries()) {
      if (now > rec.resetAt) {
        records.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers["x-forwarded-for"];
    let ip = "127.0.0.1";
    if (typeof forwarded === "string") {
      ip = forwarded.split(",")[0].trim();
    } else if (req.ip) {
      ip = req.ip;
    } else if (req.socket?.remoteAddress) {
      ip = req.socket.remoteAddress;
    }

    const key = (options.keyPrefix || "rl:") + ip;
    const now = Date.now();
    const rec = records.get(key);

    if (!rec || now > rec.resetAt) {
      records.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    rec.count++;
    if (rec.count > options.maxRequests) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}
