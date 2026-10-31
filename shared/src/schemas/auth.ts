import { z } from "zod";
import { USER_ROLES } from "../constants/roles.js";

/**
 * Zod schema for client login submissions
 */
export const LoginSchema = z.object({
  email: z.string().email("A valid corporate email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Zod schema for authenticated user profile (never exposes passwordHash)
 */
export const AuthenticatedUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(USER_ROLES),
  phone: z.string().nullable().optional(),
  hourlyRatePaise: z.string().regex(/^\d+$/, "Hourly rate must be a non-negative string in paise")
});

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

/**
 * Zod schema for successful authentication token response
 */
export const AuthTokenResponseSchema = z.object({
  success: z.literal(true),
  token: z.string().min(10),
  user: AuthenticatedUserSchema,
  permissions: z.array(z.string())
});

export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

/**
 * Zod schema for internal JWT token claims
 */
export const TokenPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(USER_ROLES),
  iat: z.number().optional(),
  exp: z.number().optional()
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
