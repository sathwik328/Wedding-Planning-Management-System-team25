import { describe, it, expect, vi } from "vitest";
import { executeTaskGenerationWithTargetedRetry } from "../src/services/taskAutomation.service.js";

describe("Task Generation Retry-Wrapper Precision Unit Tests", () => {
  it("Unrelated P2002 (e.g. duplicate email) is thrown IMMEDIATELY on Attempt 1 (Zero retries)", async () => {
    let invocationAttempts = 0;

    const mockPrismaClient: any = {
      $transaction: vi.fn(async () => {
        invocationAttempts++;
        const emailP2002 = new Error("Unique constraint failed on the fields: (`email`)");
        (emailP2002 as any).code = "P2002";
        (emailP2002 as any).meta = { target: ["email"] };
        throw emailP2002;
      })
    };

    await expect(
      executeTaskGenerationWithTargetedRetry(mockPrismaClient, "wedding-uuid", 3)
    ).rejects.toThrow(/email/i);

    // CRITICAL PROOF: Attempt count must be strictly 1. No retries were attempted!
    expect(invocationAttempts).toBe(1);
  });

  it("Non-lock P1008 (e.g. socket connection timeout) is thrown IMMEDIATELY on Attempt 1", async () => {
    let invocationAttempts = 0;

    const mockPrismaClient: any = {
      $transaction: vi.fn(async () => {
        invocationAttempts++;
        const socketP1008 = new Error("Socket connection closed unexpectedly");
        (socketP1008 as any).code = "P1008";
        throw socketP1008;
      })
    };

    await expect(
      executeTaskGenerationWithTargetedRetry(mockPrismaClient, "wedding-uuid", 3)
    ).rejects.toThrow(/Socket connection/i);

    expect(invocationAttempts).toBe(1);
  });

  it("Genuine transient conflict (Task P2002 race) retries and succeeds on subsequent attempt", async () => {
    let invocationAttempts = 0;

    const mockPrismaClient: any = {
      $transaction: vi.fn(async () => {
        invocationAttempts++;
        if (invocationAttempts === 1) {
          // Attempt 1: Transient collision on (weddingId, templateKey)
          const taskP2002 = new Error("Unique constraint failed on (weddingId, templateKey)");
          (taskP2002 as any).code = "P2002";
          (taskP2002 as any).meta = { target: ["weddingId", "templateKey"] };
          throw taskP2002;
        }
        // Attempt 2: Succeeds
        return { success: true, state: "ALREADY_COMPLETE", verifiedTaskCount: 32 };
      })
    };

    const result = await executeTaskGenerationWithTargetedRetry(mockPrismaClient, "wedding-uuid", 3);

    expect(result.success).toBe(true);
    expect(invocationAttempts).toBe(2); // Verified: Retried exactly once and succeeded
  });
});
