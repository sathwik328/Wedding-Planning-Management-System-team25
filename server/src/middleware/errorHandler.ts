import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Zod Validation Error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.errors
      }
    });
    return;
  }

  // Domain Direct Expense Errors
  if (err.name === "PaymentCeilingExceededError") {
    res.status(409).json({
      success: false,
      error: {
        code: "PAYMENT_CEILING_EXCEEDED",
        message: err.message,
        details: {
          totalCostPaise: err.totalCostPaise?.toString(),
          committedAmountPaise: err.committedAmountPaise?.toString(),
          attemptedAmountPaise: err.attemptedAmountPaise?.toString(),
          availableCapacityPaise: err.availableCapacityPaise?.toString()
        }
      }
    });
    return;
  }

  if (err.name === "DirectExpensePaymentError") {
    res.status(400).json({
      success: false,
      error: {
        code: "DIRECT_EXPENSE_ERROR",
        message: err.message
      }
    });
    return;
  }

  // Generic Internal Server Error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred"
    }
  });
}
