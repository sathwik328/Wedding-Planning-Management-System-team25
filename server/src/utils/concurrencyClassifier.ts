export interface ConcurrencyEvaluation {
  isRecoverable: boolean;
  reason: string;
}

/**
 * Strictly classifies whether an error is a transient, recoverable concurrency conflict.
 */
export function evaluateConcurrencyError(error: any): ConcurrencyEvaluation {
  if (!error) {
    return { isRecoverable: false, reason: "Null or undefined error" };
  }

  // 1. Prisma P2034: Transaction failed due to a write conflict or a deadlock
  if (error.code === "P2034") {
    return { isRecoverable: true, reason: "Prisma P2034: Transaction write conflict" };
  }

  // 2. SQLite BUSY Lock: Engine-level transient lock
  if (
    error.message &&
    (error.message.includes("SQLITE_BUSY") || error.message.includes("database is locked"))
  ) {
    return { isRecoverable: true, reason: "SQLite transient lock contention (SQLITE_BUSY)" };
  }

  // 3. Prisma P1008: Operations timed out.
  // CRITICAL: Retry ONLY if the timeout is explicitly due to transaction lock wait, NOT network drops!
  if (error.code === "P1008") {
    const msg = error.message || "";
    const isLockTimeout =
      msg.includes("timed out waiting for transaction lock") ||
      msg.includes("database table is locked") ||
      msg.includes("lock timeout");

    if (isLockTimeout) {
      return { isRecoverable: true, reason: "Prisma P1008: Transient transaction lock wait timeout" };
    }
    return { isRecoverable: false, reason: "Prisma P1008: Non-lock operation timeout (unrecoverable)" };
  }

  // 4. Prisma P2002: Unique constraint violation.
  // CRITICAL: Retry ONLY if the target constraint is strictly (weddingId, templateKey)
  if (error.code === "P2002") {
    const target = error.meta?.target;

    // Handle Array format (e.g. SQLite: ["weddingId", "templateKey"])
    if (Array.isArray(target)) {
      const hasWeddingId = target.includes("weddingId");
      const hasTemplateKey = target.includes("templateKey");
      const hasOnlyTargetFields = target.length === 2;

      if (hasWeddingId && hasTemplateKey && hasOnlyTargetFields) {
        return { isRecoverable: true, reason: "Prisma P2002: Task (weddingId, templateKey) race collision" };
      }
      return {
        isRecoverable: false,
        reason: `Prisma P2002 on unrelated unique constraint: [${target.join(", ")}]`
      };
    }

    // Handle String constraint name format (e.g. PostgreSQL: "Task_weddingId_templateKey_key")
    if (typeof target === "string") {
      if (
        target === "Task_weddingId_templateKey_key" ||
        target === "weddingId_templateKey"
      ) {
        return { isRecoverable: true, reason: "Prisma P2002: Task composite unique constraint race" };
      }
      return {
        isRecoverable: false,
        reason: `Prisma P2002 on unrelated named constraint: "${target}"`
      };
    }

    return { isRecoverable: false, reason: "Prisma P2002: Unrecognized constraint target format" };
  }

  // All other errors are strictly non-recoverable
  return {
    isRecoverable: false,
    reason: `Non-recoverable error (code: ${error.code || "UNKNOWN"}, message: ${error.message})`
  };
}
