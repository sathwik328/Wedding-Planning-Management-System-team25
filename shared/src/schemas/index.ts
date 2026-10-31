import { z } from "zod";
import { USER_ROLES, VENDOR_CATEGORIES, SUB_EVENTS, TASK_STAGES, TASK_PRIORITIES } from "../constants/roles.js";

export const CreateEnquirySchema = z.object({
  coupleNames: z.string().min(3, "Couple names must be at least 3 characters"),
  primaryEmail: z.string().email("Invalid email address"),
  primaryPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  source: z.enum(["INSTAGRAM", "WHATSAPP", "PHONE_CALL", "REFERRAL", "WEBSITE"]),
  roughDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  estimatedGuests: z.number().int().min(10).max(10000).default(400),
  themePreference: z.string().optional(),
  budgetCeilingPaise: z.string().regex(/^\d+$/, "Budget must be a non-negative integer string in paise"),
  notes: z.string().optional()
});

export const ScheduleConsultationSchema = z.object({
  consultationDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  notes: z.string().optional()
});

export const CreateServiceAgreementSchema = z.object({
  coupleId: z.string().uuid("Invalid couple ID"),
  packageType: z.enum(["FULL_SERVICE", "PARTIAL_DAY_OF"]),
  agreedFeePaise: z.string().regex(/^\d+$/, "Agreed fee must be in paise"),
  paymentTerms: z.string().min(5, "Payment terms required")
});

export const SignServiceAgreementSchema = z.object({
  signatureDataUrl: z.string().min(20, "Signature canvas data required"),
  signedByName: z.string().min(2, "Signer name required"),
  termsVersion: z.number().int().min(1)
});

export const ConfirmWeddingSchema = z.object({
  coupleId: z.string().uuid(),
  title: z.string().min(5),
  packageType: z.enum(["FULL_SERVICE", "PARTIAL_DAY_OF"]),
  startDate: z.string(),
  endDate: z.string(),
  primaryCity: z.enum(["Jaipur", "Udaipur", "Delhi", "Jodhpur"]),
  venueName: z.string().min(3),
  targetGuestCount: z.number().int().min(10),
  totalBudgetPaise: z.string().regex(/^\d+$/)
});

export const CreateDirectExpensePaymentSchema = z.object({
  weddingId: z.string().uuid(),
  additionalChargeId: z.string().uuid(),
  amountPaise: z.string().regex(/^[1-9]\d*$/, "Payment amount must be a positive integer in paise"),
  paymentMethod: z.enum(["NEFT_RTGS", "CASH", "UPI", "COMPANY_CARD", "BANK_TRANSFER"]),
  transactionReference: z.string().min(3),
  status: z.enum(["PENDING", "PROCESSING", "CLEARED"]).default("PENDING"),
  notes: z.string().optional()
});

export const CreateClientPaymentSchema = z.object({
  clientInvoiceId: z.string().uuid(),
  amountPaise: z.string().regex(/^[1-9]\d*$/, "Payment amount must be a positive integer in paise"),
  paymentMethod: z.enum(["NEFT_RTGS", "CHEQUE", "BANK_TRANSFER"]),
  transactionReference: z.string().min(3),
  notes: z.string().optional()
});

export const CreateVendorPaymentSchema = z.object({
  vendorBillId: z.string().uuid(),
  paymentType: z.enum(["ADVANCE", "FINAL_SETTLEMENT"]),
  amountPaise: z.string().regex(/^[1-9]\d*$/),
  paymentMethod: z.enum(["NEFT_RTGS", "CHEQUE", "BANK_TRANSFER"]),
  transactionReference: z.string().min(3),
  notes: z.string().optional()
});

export * from "./auth.js";
