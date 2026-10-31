import { Router, Request, Response } from "express";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import {
  LoginSchema,
  AuthenticatedUserSchema,
  getPermissionsForRole,
  USER_ROLES,
  UserRole
} from "shared";
import {
  AuthService,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_MS,
  hashToken
} from "../services/auth.service.js";
import { verifyPasswordAsync } from "../utils/password.js";
import { LoginRateLimiter } from "../middleware/rateLimiter.js";
import { authenticate, validateCsrf } from "../middleware/auth.js";

export function createAuthRouter(prisma: PrismaClient, rateLimiter?: LoginRateLimiter): Router {
  const router = Router();
  const authService = new AuthService(prisma);
  const limiter = rateLimiter ?? new LoginRateLimiter();

  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];

  /**
   * POST /api/auth/login
   * Authenticate team member, issue persistent session, set HTTP-only cookie
   */
  router.post("/login", limiter.middleware(), async (req: Request, res: Response) => {
    const ip = limiter.extractIp(req);

    // 1. Origin / Referer check for defense-in-depth on login requests
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const originBase = `${originUrl.protocol}//${originUrl.host}`;
        if (!allowedOrigins.includes(originBase) && !allowedOrigins.includes("*")) {
          return res.status(403).json({ error: "Access denied. Cross-origin login prohibited." });
        }
      } catch {
        return res.status(400).json({ error: "Invalid Origin or Referer header format." });
      }
    }

    // 2. Validate input schema
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      limiter.recordFailure(ip);
      return res.status(400).json({
        error: "Invalid login request payload.",
        details: parseResult.error.flatten().fieldErrors
      });
    }

    const { email, password } = parseResult.data;

    // 3. User lookup
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    // Constant-time mitigation against user enumeration
    if (!user || !user.passwordHash || user.passwordHash.trim() === "") {
      limiter.recordFailure(ip);
      return res.status(401).json({ error: "Invalid corporate email or password." });
    }

    // Validate role
    if (!USER_ROLES.includes(user.role as UserRole)) {
      limiter.recordFailure(ip);
      return res.status(403).json({ error: "Account role configuration is invalid. Contact administrator." });
    }

    // 4. Asynchronous password verification (never blocks HTTP event loop)
    const isPasswordValid = await verifyPasswordAsync(password, user.passwordHash);
    if (!isPasswordValid) {
      const { retryAfterSeconds } = limiter.recordFailure(ip);
      const msg = retryAfterSeconds > 0
        ? `Invalid corporate email or password. Too many failed attempts; blocked for ${retryAfterSeconds} seconds.`
        : "Invalid corporate email or password.";
      return res.status(401).json({ error: msg });
    }

    // Reset rate limiter upon successful authentication
    limiter.recordSuccess(ip);

    // 5. Create session in database
    const userAgent = req.headers["user-agent"];
    const { rawSessionToken, rawCsrfToken, session } = await authService.createSession(user.id, {
      userAgent,
      ipAddress: ip
    });

    // 6. Set HTTP-only session cookie
    res.cookie(SESSION_COOKIE_NAME, rawSessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_MS
    });

    // 7. Format safe AuthenticatedUser DTO (never exposing passwordHash or rawSessionToken)
    const safeUser = AuthenticatedUserSchema.parse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      hourlyRatePaise: user.hourlyRatePaise.toString()
    });

    const permissions = getPermissionsForRole(user.role as UserRole);

    return res.status(200).json({
      success: true,
      user: safeUser,
      permissions,
      csrfToken: rawCsrfToken
    });
  });

  /**
   * POST /api/auth/logout
   * Revoke active session in database, clear HTTP-only cookie
   */
  router.post("/logout", authenticate(prisma), validateCsrf(prisma), async (req: Request, res: Response) => {
    if (req.session?.id) {
      await authService.revokeSessionById(req.session.id);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });

    return res.status(200).json({
      success: true,
      message: "Successfully logged out. Session revoked."
    });
  });

  /**
   * GET /api/auth/me
   * Validate active session and return user profile, current permissions, and fresh CSRF token
   */
  router.get("/me", authenticate(prisma), async (req: Request, res: Response) => {
    const user = req.user!;
    const session = req.session!;

    // Re-arm CSRF token for the refreshed client session
    const rawCsrfToken = crypto.randomBytes(32).toString("hex");
    const newCsrfTokenHash = hashToken(rawCsrfToken);

    await prisma.session.update({
      where: { id: session.id },
      data: { csrfTokenHash: newCsrfTokenHash }
    });

    const safeUser = AuthenticatedUserSchema.parse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      hourlyRatePaise: user.hourlyRatePaise.toString()
    });

    const permissions = getPermissionsForRole(user.role as UserRole);

    return res.status(200).json({
      success: true,
      user: safeUser,
      permissions,
      csrfToken: rawCsrfToken
    });
  });

  return router;
}
