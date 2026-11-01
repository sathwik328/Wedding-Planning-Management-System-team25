import crypto from "crypto";
import { PrismaClient, User, Session } from "@prisma/client";

export const SESSION_COOKIE_NAME = "royal_knot_session";
export const SESSION_EXPIRY_DAYS = 7;
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export interface SessionWithUser extends Session {
  user: User;
}

export interface CreateSessionResult {
  rawSessionToken: string;
  rawCsrfToken: string;
  session: Session;
}

/**
 * SHA-256 helper for session tokens and CSRF tokens
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Timing-safe token comparison against stored hex hash
 */
export function timingSafeHashMatch(candidateToken: string, storedHash: string): boolean {
  if (!candidateToken || !storedHash) return false;
  try {
    const candidateHash = hashToken(candidateToken);
    const candidateBuf = Buffer.from(candidateHash, "hex");
    const storedBuf = Buffer.from(storedHash, "hex");
    if (candidateBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(candidateBuf, storedBuf);
  } catch {
    return false;
  }
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new persistent database-backed session with 32-byte entropy.
   * Stores SHA-256 hash of the session token and CSRF token.
   */
  async createSession(
    userId: string,
    options?: { userAgent?: string; ipAddress?: string }
  ): Promise<CreateSessionResult> {
    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    const rawCsrfToken = crypto.randomBytes(32).toString("hex");

    const sessionTokenHash = hashToken(rawSessionToken);
    const csrfTokenHash = hashToken(rawCsrfToken);

    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    const session = await this.prisma.session.create({
      data: {
        userId,
        sessionTokenHash,
        csrfTokenHash,
        userAgent: options?.userAgent?.substring(0, 500),
        ipAddress: options?.ipAddress?.substring(0, 100),
        expiresAt,
        isRevoked: false
      }
    });

    return {
      rawSessionToken,
      rawCsrfToken,
      session
    };
  }

  /**
   * Validate a raw session token. Rejects expired or revoked sessions.
   */
  async validateSession(rawSessionToken: string): Promise<SessionWithUser | null> {
    if (!rawSessionToken || rawSessionToken.length < 32) {
      return null;
    }

    const sessionTokenHash = hashToken(rawSessionToken);

    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash },
      include: { user: true }
    });

    if (!session) {
      return null;
    }

    if (session.isRevoked) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      return null;
    }

    return session as SessionWithUser;
  }

  /**
   * Immediately revoke a session by its raw token.
   */
  async revokeSession(rawSessionToken: string): Promise<boolean> {
    if (!rawSessionToken) return false;

    const sessionTokenHash = hashToken(rawSessionToken);

    try {
      await this.prisma.session.update({
        where: { sessionTokenHash },
        data: { isRevoked: true }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revoke a session by session ID
   */
  async revokeSessionById(sessionId: string): Promise<boolean> {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { isRevoked: true }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Timing-safe verification of submitted CSRF token against session's csrfTokenHash
   */
  verifyCsrf(submittedToken: string, storedCsrfHash: string): boolean {
    return timingSafeHashMatch(submittedToken, storedCsrfHash);
  }
}
