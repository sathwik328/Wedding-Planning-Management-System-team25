import { z } from "zod";

export const GUEST_CATEGORIES = [
  "VIP",
  "GROOM_SIDE",
  "BRIDE_SIDE",
  "EXTENDED",
  "PORTAL_GUEST"
] as const;

export type GuestCategory = typeof GUEST_CATEGORIES[number];

export const GUEST_RSVP_STATUSES = [
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "DECLINED",
  "TENTATIVE"
] as const;

export type GuestRsvpStatus = typeof GUEST_RSVP_STATUSES[number];

export const HouseholdAttendeeSchema = z.object({
  fullName: z.string().min(2, "Attendee full name is required"),
  dietaryNotes: z.string().optional().nullable(),
  isHouseholdPrimary: z.boolean().default(false)
});

export type HouseholdAttendee = z.infer<typeof HouseholdAttendeeSchema>;

export const SubmitRsvpSchema = z.object({
  primaryContactPhone: z.string().min(8, "Valid contact phone number required"),
  primaryGuestName: z.string().min(2, "Primary guest name required"),
  email: z.string().email("Invalid email format").optional().nullable(),
  partySize: z.number().int().min(1).max(20).default(1),
  rsvpStatus: z.enum(["CONFIRMED", "DECLINED", "TENTATIVE"]),
  dietaryNotes: z.string().optional().nullable(),
  subEventsRsvp: z.array(z.string()).default([]),
  attendees: z.array(HouseholdAttendeeSchema).optional()
});

export type SubmitRsvpInput = z.infer<typeof SubmitRsvpSchema>;

export const GeneratePortalTokenSchema = z.object({
  customSlug: z.string().regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase alphanumeric characters and hyphens").optional(),
  welcomeMessage: z.string().optional(),
  venueGoogleMapsUrl: z.string().url("Must be a valid URL").optional().nullable(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactName: z.string().optional()
});

export type GeneratePortalTokenInput = z.infer<typeof GeneratePortalTokenSchema>;
