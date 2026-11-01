import { PrismaClient, Prisma } from "@prisma/client";
import { evaluateConcurrencyError } from "../utils/concurrencyClassifier.js";

export class DirectExpensePaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectExpensePaymentError";
  }
}

export class PaymentCeilingExceededError extends DirectExpensePaymentError {
  constructor(
    public totalCostPaise: bigint,
    public committedAmountPaise: bigint,
    public attemptedAmountPaise: bigint,
    public availableCapacityPaise: bigint
  ) {
    super(
      `Payment ceiling exceeded: Attempted payment of ₹${attemptedAmountPaise / 100n} exceeds available capacity of ₹${availableCapacityPaise / 100n} (Refreshed Total Charge: ₹${totalCostPaise / 100n}, Committed: ₹${committedAmountPaise / 100n})`
    );
    this.name = "PaymentCeilingExceededError";
  }
}

export interface CreateDirectExpensePaymentInput {
  weddingId: string;
  additionalChargeId: string;
  amountPaise: bigint | string;
  paymentMethod: "NEFT_RTGS" | "CASH" | "UPI" | "COMPANY_CARD" | "BANK_TRANSFER";
  transactionReference: string;
  status?: "PENDING" | "PROCESSING" | "CLEARED";
  notes?: string;
}

/**
 * Inner transactional worker that executes the first-operation write lock,
 * followed by refreshed post-lock reading, capacity enforcement, and atomic insertion.
 */
async function executeLockedDirectPayment(
  tx: Prisma.TransactionClient,
  input: CreateDirectExpensePaymentInput
): Promise<any> {
  const amountBig = typeof input.amountPaise === "bigint" ? input.amountPaise : BigInt(input.amountPaise);
  if (amountBig <= 0n) {
    throw new DirectExpensePaymentError(`Payment amount must be a positive integer in paise. Received: ${amountBig}`);
  }

  const txRefClean = input.transactionReference?.trim();
  if (!txRefClean) {
    throw new DirectExpensePaymentError("Transaction reference cannot be empty");
  }

  const paymentStatus = input.status || "PENDING";

  // STEP 1: First-Operation Conditional Write to Acquire Lock Immediately
  // Avoids performing any database read prior to acquiring the lock.
  // In SQLite: updateMany forces immediate promotion to RESERVED write lock.
  // In PostgreSQL: updateMany acquires row-level exclusive write lock.
  const touchResult = await tx.additionalCharge.updateMany({
    where: { id: input.additionalChargeId },
    data: { updatedAt: new Date() }
  });

  if (touchResult.count === 0) {
    throw new DirectExpensePaymentError(`AdditionalCharge "${input.additionalChargeId}" not found`);
  }

  // STEP 2: Refreshed Read inside the same transaction AFTER acquiring the lock
  const lockedCharge = await tx.additionalCharge.findUniqueOrThrow({
    where: { id: input.additionalChargeId }
  });

  // STEP 3: Validate ownership and channel separation against refreshed record
  if (lockedCharge.weddingId !== input.weddingId) {
    throw new DirectExpensePaymentError(
      `Security boundary violation: AdditionalCharge "${input.additionalChargeId}" belongs to wedding "${lockedCharge.weddingId}", not "${input.weddingId}"`
    );
  }

  if (lockedCharge.vendorBillId !== null) {
    throw new DirectExpensePaymentError(
      `Channel separation violation: Charge "${lockedCharge.id}" is linked to VendorBill "${lockedCharge.vendorBillId}". Direct agency payments are prohibited.`
    );
  }

  // STEP 4: Query all active committed payments (CLEARED, PENDING, PROCESSING)
  const existingPayments = await tx.directExpensePayment.findMany({
    where: {
      additionalChargeId: lockedCharge.id,
      status: { in: ["CLEARED", "PENDING", "PROCESSING"] }
    }
  });

  let committedAmountBig = 0n;
  for (const p of existingPayments) {
    committedAmountBig += p.amountPaise;
  }

  // STEP 5: Calculate capacity using the REFRESHED totalCostPaise
  const availableCapacityBig = lockedCharge.totalCostPaise - committedAmountBig;

  if (amountBig > availableCapacityBig) {
    throw new PaymentCeilingExceededError(
      lockedCharge.totalCostPaise,
      committedAmountBig,
      amountBig,
      availableCapacityBig > 0n ? availableCapacityBig : 0n
    );
  }

  // STEP 6: Atomically create payment and audit log
  const payment = await tx.directExpensePayment.create({
    data: {
      additionalChargeId: lockedCharge.id,
      amountPaise: amountBig,
      paymentMethod: input.paymentMethod,
      transactionReference: txRefClean,
      status: paymentStatus,
      clearedAt: paymentStatus === "CLEARED" ? new Date() : null,
      notes: input.notes
    }
  });

  await tx.auditLog.create({
    data: {
      entityName: "DirectExpensePayment",
      entityId: payment.id,
      action: "DIRECT_EXPENSE_PAYMENT_CREATED",
      performedBy: "SYSTEM_FINANCE",
      detailsJson: JSON.stringify({
        weddingId: input.weddingId,
        additionalChargeId: lockedCharge.id,
        amountPaise: amountBig.toString(),
        refreshedTotalCostPaise: lockedCharge.totalCostPaise.toString(),
        committedBeforePaise: committedAmountBig.toString(),
        paymentMethod: input.paymentMethod,
        transactionReference: txRefClean,
        status: paymentStatus
      })
    }
  });

  return payment;
}

/**
 * CANONICAL PUBLIC SERVICE FUNCTION:
 * createDirectExpensePaymentWithRetry
 * Every caller must use this function.
 * Implements bounded exponential backoff retries for confirmed transient database lock conflicts only.
 */
export async function createDirectExpensePaymentWithRetry(
  prisma: PrismaClient,
  input: CreateDirectExpensePaymentInput,
  maxRetries = 3
): Promise<any> {
  let attempt = 0;
  let delayMs = 50;

  while (attempt < maxRetries) {
    try {
      attempt++;
      return await prisma.$transaction(
        async (tx) => {
          return await executeLockedDirectPayment(tx, input);
        },
        {
          maxWait: 5000,
          timeout: 10000
        }
      );
    } catch (error: any) {
      // 1. NON-RECOVERABLE: Validation and Business logic errors MUST NOT be retried
      if (error instanceof DirectExpensePaymentError) {
        throw error;
      }

      // 2. NON-RECOVERABLE: Duplicate transaction references MUST NOT be retried
      if (error.code === "P2002") {
        throw error;
      }

      // 3. Classify error: Retry ONLY genuine transient lock contention (SQLITE_BUSY, P2034, lock P1008)
      const evaluation = evaluateConcurrencyError(error);

      if (evaluation.isRecoverable && attempt < maxRetries) {
        // Yield with exponential backoff and jitter
        await new Promise((resolve) => setTimeout(resolve, delayMs + Math.random() * 25));
        delayMs *= 2;
        continue;
      }

      // Non-recoverable or retries exhausted
      throw error;
    }
  }

  throw new DirectExpensePaymentError(`Payment creation failed after ${maxRetries} attempts due to database lock contention`);
}
