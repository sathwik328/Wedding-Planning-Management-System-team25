/**
 * The Royal Knot — Financial DTO & Currency Types
 * All monetary amounts represent exact integer Indian Paise (1 INR = 100 Paise).
 */

export type PaiseString = string & { readonly __brand: unique symbol };

export interface MoneyDTO {
  paise: PaiseString;
  formattedINR: string;
  compactDisplay: string;
}

export interface ClientPaymentDTO {
  id: string;
  clientInvoiceId: string;
  amountPaise: PaiseString;
  paymentDate: string;
  paymentMethod: "NEFT_RTGS" | "CHEQUE" | "BANK_TRANSFER";
  transactionReference: string;
  status: "PENDING" | "PROCESSING" | "CLEARED" | "FAILED" | "CANCELLED";
  clearedAt?: string | null;
  notes?: string | null;
}

export interface VendorPaymentDTO {
  id: string;
  vendorBillId: string;
  paymentType: "ADVANCE" | "FINAL_SETTLEMENT";
  amountPaise: PaiseString;
  paymentDate: string;
  paymentMethod: "NEFT_RTGS" | "CHEQUE" | "BANK_TRANSFER";
  transactionReference: string;
  status: "PENDING" | "PROCESSING" | "CLEARED" | "FAILED" | "CANCELLED";
  clearedAt?: string | null;
  notes?: string | null;
}

export interface DirectExpensePaymentDTO {
  id: string;
  additionalChargeId: string;
  amountPaise: PaiseString;
  paymentMethod: "NEFT_RTGS" | "CASH" | "UPI" | "COMPANY_CARD" | "BANK_TRANSFER";
  transactionReference: string;
  status: "PENDING" | "PROCESSING" | "CLEARED" | "FAILED" | "CANCELLED";
  paymentDate: string;
  clearedAt?: string | null;
  notes?: string | null;
}

export interface QuotationLineItemDTO {
  id?: string;
  description: string;
  quantityScaledUnits: string; // Scale 1000: 1 unit = "1000", 2.5 hours = "2500"
  unitPricePaise: PaiseString;
  totalPricePaise: PaiseString;
}

export interface VendorQuotationDTO {
  id: string;
  vendorRequestId: string;
  vendorId: string;
  quoteReference: string;
  menuDescription?: string | null;
  pricePerPlatePaise?: PaiseString | null;
  baseAmountPaise: PaiseString;
  extraHourRatePaise: PaiseString;
  isSelectedWinner: boolean;
  documentUrl?: string | null;
  lineItems: QuotationLineItemDTO[];
}
