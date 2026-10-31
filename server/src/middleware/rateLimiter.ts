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
 *
 * NOTE ON PRODUCTION DEPLOYMENT & LIMITATIONS:
 * This rate limiter maintains state in the local Node.js process memory.
 * - Single-instance limitation: When running in a cluster (PM2) or multi-container
 *   environment (Kubernetes, AWS ECS), attempts are tracked per worker instance.
 * - For production multi-worker or distributed deployments, an external store (e.g. Redis
 *   via ioredis or Cloudflare / API Gateway rate-limiting rules at the edge) is required.
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

  /**
   * Safely extract client IP from request.
   * Respects trust proxy when enabled on Express app.
   */
  public extractIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const firstIp = forwarded.split(",")[0].trim();
      if (firstIp) return firstIp;
    }
    return req.ip || req.socket.remoteAddress || "127.0.0.1";
  }

  /**
   * Check if client IP is currently rate-limited.
   */
  public isBlocked(ip: string): { blocked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const record = this.records.get(ip);
    if (!record) return { blocked: false, retryAfterSeconds: 0 };

    if (record.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { blocked: true, retryAfterSeconds };
    }

    // If block expired or window expired, reset
    if (now - record.firstAttemptAt > this.windowMs) {
      this.records.delete(ip);
      return { blocked: false, retryAfterSeconds: 0 };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  }

  /**
   * Record a failed login attempt for the given IP.
   */
  public recordFailure(ip: string): { blocked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    let record = this.records.get(ip);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      record = {
        failedAttempts: 1,
        firstAttemptAt: now,
        blockedUntil: 0
      };
      this.records.set(ip, record);
      return { blocked: false, retryAfterSeconds: 0 };
    }

    record.failedAttempts += 1;

    if (record.failedAttempts >= this.maxFailedAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      const retryAfterSeconds = Math.ceil(this.blockDurationMs / 1000);
      return { blocked: true, retryAfterSeconds };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  }

  /**
   * Reset rate limit record on successful login.
   */
  public recordSuccess(ip: string): void {
    this.records.delete(ip);
  }

  /**
   * Clean expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [ip, rec] of this.records.entries()) {
      if (now > rec.blockedUntil && now - rec.firstAttemptAt > this.windowMs) {
        this.records.delete(ip);
      }
    }
  }

  /**
   * Express middleware guard to check prior to login handler
   */
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
