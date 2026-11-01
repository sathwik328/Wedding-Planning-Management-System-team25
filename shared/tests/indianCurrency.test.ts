import { describe, it, expect } from "vitest";
import { parseStrictIndianCurrencyToPaise, formatPaiseToINR, formatPaiseCompact, IndianCurrencyValidationError } from "../src/utils/indianCurrencyParser.js";

describe("Strict Indian Currency & Comma-Grouping Parser", () => {
  it("Accepts valid Indian comma-grouped values", () => {
    expect(parseStrictIndianCurrencyToPaise("1,000")).toBe("100000");
    expect(parseStrictIndianCurrencyToPaise("10,000")).toBe("1000000");
    expect(parseStrictIndianCurrencyToPaise("1,00,000")).toBe("10000000"); // 1 Lakh
    expect(parseStrictIndianCurrencyToPaise("10,00,000.50")).toBe("100000050"); // 10 Lakh 50 Paise
    expect(parseStrictIndianCurrencyToPaise("25,00,00,000")).toBe("25000000000"); // 25 Crore
  });

  it("Rejects consecutive commas", () => {
    expect(() => parseStrictIndianCurrencyToPaise("1,,000")).toThrow(IndianCurrencyValidationError);
  });

  it("Rejects malformed Indian comma groupings", () => {
    expect(() => parseStrictIndianCurrencyToPaise("12,34,5678")).toThrow(IndianCurrencyValidationError);
    expect(() => parseStrictIndianCurrencyToPaise("12,345,67")).toThrow(IndianCurrencyValidationError);
    expect(() => parseStrictIndianCurrencyToPaise(",100")).toThrow(IndianCurrencyValidationError);
    expect(() => parseStrictIndianCurrencyToPaise("100,")).toThrow(IndianCurrencyValidationError);
  });

  it("Rejects fractional paise (> 2 decimal places)", () => {
    expect(() => parseStrictIndianCurrencyToPaise("100.555")).toThrow(IndianCurrencyValidationError);
  });

  it("Rejects negative quantities when allowNegative is false", () => {
    expect(() => parseStrictIndianCurrencyToPaise("-500.00", { allowNegative: false })).toThrow(
      IndianCurrencyValidationError
    );
  });

  it("Accepts negative adjustments when explicitly permitted", () => {
    expect(parseStrictIndianCurrencyToPaise("-500.00", { allowNegative: true })).toBe("-50000");
  });

  it("Currency Parser correctly enforces an explicitly configured zero limit (0n)", () => {
    expect(() => parseStrictIndianCurrencyToPaise("0.01", { maxValuePaise: 0n })).toThrow(
      IndianCurrencyValidationError
    );
    expect(parseStrictIndianCurrencyToPaise("0.00", { maxValuePaise: 0n })).toBe("0");
  });

  it("Formats integer paise into standard Indian Numbering system", () => {
    expect(formatPaiseToINR("25000000000")).toBe("₹25,00,00,000.00");
    expect(formatPaiseToINR("100000050")).toBe("₹10,00,000.50");
    expect(formatPaiseToINR("350000")).toBe("₹3,500.00");
    expect(formatPaiseToINR("-50000")).toBe("-₹500.00");
  });

  it("Formats compact luxury notation without casting to float Number", () => {
    expect(formatPaiseCompact("25000000000")).toBe("₹25.00 Cr");
    expect(formatPaiseCompact("4500000000")).toBe("₹4.50 Cr");
    expect(formatPaiseCompact("450000000")).toBe("₹45.00 Lakh");
  });
});
