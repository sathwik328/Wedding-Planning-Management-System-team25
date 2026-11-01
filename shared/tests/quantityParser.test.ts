import { describe, it, expect } from "vitest";
import {
  parseStrictDiscreteQuantity,
  QuantityValidationError,
  QuantityConfigurationError,
  calculateLineItemTotalPaise
} from "../src/utils/quantityParser.js";

describe("Strict Quantity Parser Unit Tests", () => {
  it("Valid quantities within safe bounds parse successfully", () => {
    expect(parseStrictDiscreteQuantity("0")).toBe(0);
    expect(parseStrictDiscreteQuantity("1")).toBe(1);
    expect(parseStrictDiscreteQuantity("400", { min: 10, max: 1000 })).toBe(400);
    expect(parseStrictDiscreteQuantity("100000")).toBe(100000);
  });

  it("Configuration validation: Rejects invalid bounds configurations", () => {
    expect(() => parseStrictDiscreteQuantity("10", { min: 100, max: 50 })).toThrow(
      QuantityConfigurationError
    );
    expect(() => parseStrictDiscreteQuantity("10", { min: -1 })).toThrow(
      QuantityConfigurationError
    );
    expect(() => parseStrictDiscreteQuantity("10", { min: 1.5 })).toThrow(
      QuantityConfigurationError
    );
    expect(() => parseStrictDiscreteQuantity("10", { max: Number.MAX_SAFE_INTEGER + 1 })).toThrow(
      QuantityConfigurationError
    );
  });

  it("String parsing: Strictly rejects parseInt edge cases and malformed inputs", () => {
    expect(() => parseStrictDiscreteQuantity("12abc")).toThrow(QuantityValidationError);
    expect(() => parseStrictDiscreteQuantity("1.5")).toThrow(QuantityValidationError);
    expect(() => parseStrictDiscreteQuantity("1e2")).toThrow(QuantityValidationError);
    expect(() => parseStrictDiscreteQuantity("")).toThrow(QuantityValidationError);
    expect(() => parseStrictDiscreteQuantity("-10")).toThrow(QuantityValidationError);
    expect(() => parseStrictDiscreteQuantity("007")).toThrow(QuantityValidationError); // Leading zeros rejected
    expect(() => parseStrictDiscreteQuantity("NaN")).toThrow(QuantityValidationError);
    expect(() => parseStrictDiscreteQuantity("Infinity")).toThrow(QuantityValidationError);
  });

  it("Range enforcement: Rejects values outside configured bounds", () => {
    expect(() => parseStrictDiscreteQuantity("5", { min: 10, max: 50 })).toThrow(
      QuantityValidationError
    );
    expect(() => parseStrictDiscreteQuantity("55", { min: 10, max: 50 })).toThrow(
      QuantityValidationError
    );
  });

  it("Scaled integer calculation performs round-half-up math without floats", () => {
    // 60 units (60000 scaled) @ ₹3,500 (350000 paise) = ₹2,10,000 (21000000 paise)
    expect(calculateLineItemTotalPaise(60000n, 350000n)).toBe(21000000n);
    // 2.5 hours (2500 scaled) @ ₹10,000 (1000000 paise) = ₹25,000 (2500000 paise)
    expect(calculateLineItemTotalPaise(2500n, 1000000n)).toBe(2500000n);
  });
});
