import { Request, Response, NextFunction } from "express";
import { PrismaClient, User, Session } from "@prisma/client";
import { PermissionKey, hasPermission, USER_ROLES, UserRole } from "shared";
import { AuthService, SESSION_COOKIE_NAME } from "../services/auth.service.js";

// Express Request type augmentation for authenticated context
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      sessionId?: string;
    }
  }
}

/**
 * Robust cookie parser utility (avoids mandatory cookie-parser middleware dependency)
 */
export function extractCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.substring(0, idx).trim();
    const val = part.substring(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

/**
 * Authentication Middleware:
 * Inspects HTTP-only cookie 'royal_knot_session' or Authorization header 'Bearer <token>'.
 * Validates session in database, ensures role is valid, and attaches req.user and req.session.
 */
export function authenticate(prisma: PrismaClient) {
  const authService = new AuthService(prisma);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let rawToken: string | undefined;

      // 1. Primary: Extract from HTTP-only cookie
      const cookies = extractCookies(req);
      if (cookies[SESSION_COOKIE_NAME]) {
        rawToken = cookies[SESSION_COOKIE_NAME];
      }

      // 2. Secondary: Fallback to Authorization: Bearer <token> for automated testing / CLI
      if (!rawToken && req.headers.authorization?.startsWith("Bearer ")) {
        rawToken = req.headers.authorization.substring(7).trim();
      }

      if (!rawToken) {
        return res.status(401).json({ error: "Authentication required. No session found." });
      }

      const activeSession = await authService.validateSession(rawToken);
      if (!activeSession) {
        return res.status(401).json({ error: "Invalid, expired, or revoked session." });
      }

      // Verify that the user role is known and allowed
      if (!USER_ROLES.includes(activeSession.user.role as UserRole)) {
        return res.status(403).json({ error: "User account role is malformed or invalid." });
      }

      req.user = activeSession.user;
      req.session = activeSession;
      req.sessionId = activeSession.id;

      next();
    } catch (error) {
      return res.status(500).json({ error: "Internal authentication verification failure." });
    }
  };
}

/**
 * Granular RBAC Permission Middleware:
 * Ensures the authenticated user possesses the required granular PermissionKey.
 */
export function requirePermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required before permission evaluation." });
    }

    const role = req.user.role as UserRole;
    if (!USER_ROLES.includes(role)) {
      return res.status(403).json({ error: "Access denied. Invalid user role." });
    }

    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        error: `Forbidden. Role '${role}' lacks required permission '${permission}'.`
      });
    }

    next();
  };
}

/**
 * Role-Based Access Control Middleware (optional convenience):
 * Ensures the authenticated user possesses one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const role = req.user.role as UserRole;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Forbidden. Role '${role}' is not permitted for this resource.`
      });
    }

    next();
  };
}

/**
 * CSRF Validation Middleware:
 * Session-bound synchronizer token verification.
 * Required on state-changing requests (POST, PUT, PATCH, DELETE).
 */
export function validateCsrf(prisma: PrismaClient) {
  const authService = new AuthService(prisma);

  return (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return next();
    }

    // Must be authenticated to validate session-bound CSRF
    if (!req.session?.csrfTokenHash) {
      return res.status(401).json({ error: "Authentication required for CSRF validation." });
    }

    const submittedToken = (req.headers["x-csrf-token"] || req.headers["x-xsrf-token"]) as string | undefined;
    if (!submittedToken || typeof submittedToken !== "string" || submittedToken.length < 16) {
      return res.status(403).json({ error: "Missing or malformed X-CSRF-Token header." });
    }

    const isValid = authService.verifyCsrf(submittedToken, req.session.csrfTokenHash);
    if (!isValid) {
      return res.status(403).json({ error: "CSRF token validation failed." });
    }

    next();
  };
}
