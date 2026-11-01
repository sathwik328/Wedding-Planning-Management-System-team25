import { describe, it, expect } from "vitest";
import { evaluateConcurrencyError } from "../src/utils/concurrencyClassifier.js";

describe("Strict Concurrency Error Classifier Unit Tests", () => {
  it("Approves recoverable write conflicts: P2034 and SQLITE_BUSY", () => {
    const p2034 = { code: "P2034", message: "Transaction write conflict" };
    expect(evaluateConcurrencyError(p2034).isRecoverable).toBe(true);

    const sqliteBusy = { message: "SQLITE_BUSY: database is locked" };
    expect(evaluateConcurrencyError(sqliteBusy).isRecoverable).toBe(true);
  });

  it("Approves P1008 ONLY when caused by lock contention; rejects network timeouts", () => {
    const lockTimeout = {
      code: "P1008",
      message: "Operations timed out waiting for transaction lock after 5000ms"
    };
    expect(evaluateConcurrencyError(lockTimeout).isRecoverable).toBe(true);

    const networkTimeout = {
      code: "P1008",
      message: "Socket connection to database host closed unexpectedly"
    };
    const evalResult = evaluateConcurrencyError(networkTimeout);
    expect(evalResult.isRecoverable).toBe(false);
    expect(evalResult.reason).toContain("Non-lock operation timeout");
  });

  it("Approves P2002 ONLY when targeting (weddingId, templateKey); rejects all other constraints", () => {
    // Valid SQLite array
    const validSqlite = { code: "P2002", meta: { target: ["weddingId", "templateKey"] } };
    expect(evaluateConcurrencyError(validSqlite).isRecoverable).toBe(true);

    // Valid PostgreSQL string
    const validPostgres = { code: "P2002", meta: { target: "Task_weddingId_templateKey_key" } };
    expect(evaluateConcurrencyError(validPostgres).isRecoverable).toBe(true);

    // UNRELATED P2002: User Email (MUST REJECT)
    const emailCollision = { code: "P2002", meta: { target: ["email"] } };
    const emailResult = evaluateConcurrencyError(emailCollision);
    expect(emailResult.isRecoverable).toBe(false);
    expect(emailResult.reason).toContain("unrelated unique constraint: [email]");

    // UNRELATED P2002: Transaction Reference (MUST REJECT)
    const txRefCollision = { code: "P2002", meta: { target: ["transactionReference"] } };
    expect(evaluateConcurrencyError(txRefCollision).isRecoverable).toBe(false);

    // UNRELATED P2002: Invoice Number (MUST REJECT)
    const invCollision = { code: "P2002", meta: { target: "ClientInvoice_invoiceNumber_key" } };
    expect(evaluateConcurrencyError(invCollision).isRecoverable).toBe(false);
  });

  it("Strictly rejects non-concurrency database errors (P2003 Foreign Key, P2025 Not Found)", () => {
    const foreignKeyError = { code: "P2003", message: "Foreign key constraint failed on the field: `weddingId`" };
    expect(evaluateConcurrencyError(foreignKeyError).isRecoverable).toBe(false);

    const notFoundError = { code: "P2025", message: "Record to update not found." };
    expect(evaluateConcurrencyError(notFoundError).isRecoverable).toBe(false);
  });
});
