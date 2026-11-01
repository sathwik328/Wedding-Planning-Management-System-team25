import { PaiseString } from "../types/finance.dto.js";

export class IndianCurrencyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndianCurrencyValidationError";
  }
}

/**
 * Strict Indian comma-grouping regex:
 * Matches integers or un-grouped numbers, OR valid Indian comma structures:
 * - Single digit or 2 digits followed by pairs, ending in 3 digits.
 * Example: 1,00,000 or 25,00,00,000.50
 */
const INDIAN_COMMA_STRICT_REGEX = /^(?:0|[1-9]\d*|[1-9]\d{0,1}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/;

export interface CurrencyParseOptions {
  allowNegative?: boolean;      // Default: false
  maxValuePaise?: bigint;       // Explicit ceiling
}

/**
 * Parses user currency input strictly into integer paise string without floating-point math.
 */
export function parseStrictIndianCurrencyToPaise(
  input: string,
  options: CurrencyParseOptions = { allowNegative: false }
): PaiseString {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new IndianCurrencyValidationError("Monetary value cannot be empty");
  }

  const isNegative = trimmed.startsWith("-");
  if (isNegative && !options.allowNegative) {
    throw new IndianCurrencyValidationError(
      `Negative monetary amounts are prohibited for this transaction: "${input}"`
    );
  }

  const unsigned = isNegative ? trimmed.slice(1) : trimmed;

  // Reject consecutive commas, leading commas, trailing commas immediately
  if (unsigned.includes(",,") || unsigned.startsWith(",") || unsigned.endsWith(",")) {
    throw new IndianCurrencyValidationError(
      `Malformed comma format in monetary value: "${input}". Consecutive or orphan commas are invalid.`
    );
  }

  // Validate against strict Indian Numbering Regex
  if (!INDIAN_COMMA_STRICT_REGEX.test(unsigned)) {
    throw new IndianCurrencyValidationError(
      `Invalid Indian numbering format: "${input}". Expected format like "1,00,000.00" or "25,00,00,000".`
    );
  }

  // Strip commas only AFTER strict validation passes
  const clean = unsigned.replace(/,/g, "");
  const [wholePart, fractionPart = "00"] = clean.split(".");

  if (fractionPart.length > 2) {
    throw new IndianCurrencyValidationError(
      `Fractional paise are not permitted. Received more than 2 decimal places: "${input}"`
    );
  }

  const normalizedFraction = fractionPart.length === 1 ? fractionPart + "0" : fractionPart;
  const totalPaise = (BigInt(wholePart) * 100n) + BigInt(normalizedFraction);

  // Explicit check against undefined so 0n is strictly respected
  const MAX_CEILING = options.maxValuePaise !== undefined
    ? options.maxValuePaise
    : 100000000000000n; // Default ₹10,000 Crore

  if (totalPaise > MAX_CEILING) {
    throw new IndianCurrencyValidationError(
      `Monetary amount exceeds maximum permitted transaction ceiling of ${formatPaiseToINR(MAX_CEILING)}`
    );
  }

  const result = isNegative ? -totalPaise : totalPaise;
  return result.toString() as PaiseString;
}

/**
 * Formats a BigInt or PaiseString into Indian Numbering System (e.g. ₹2,50,00,000.00).
 * Operates purely on strings and BigInt without floating-point conversion.
 */
export function formatPaiseToINR(paiseInput: PaiseString | bigint | string): string {
  const paise = typeof paiseInput === "bigint" ? paiseInput : BigInt(paiseInput);
  const isNegative = paise < 0n;
  const absPaise = isNegative ? -paise : paise;

  const rupees = absPaise / 100n;
  const remainderPaise = absPaise % 100n;
  const paisePadded = remainderPaise.toString().padStart(2, "0");

  const rupeeStr = rupees.toString();
  let formattedRupees = "";

  if (rupeeStr.length <= 3) {
    formattedRupees = rupeeStr;
  } else {
    const lastThree = rupeeStr.slice(-3);
    const remaining = rupeeStr.slice(0, -3);
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formattedRupees = `${formattedRemaining},${lastThree}`;
  }

  const prefix = isNegative ? "-₹" : "₹";
  return `${prefix}${formattedRupees}.${paisePadded}`;
}

/**
 * Formats large amounts compactly (e.g. "₹2.50 Cr", "₹45.00 Lakh") using BigInt integer arithmetic.
 * Never casts BigInt to Number.
 */
export function formatPaiseCompact(paiseInput: PaiseString | bigint | string): string {
  const paise = typeof paiseInput === "bigint" ? paiseInput : BigInt(paiseInput);
  const isNegative = paise < 0n;
  const absPaise = isNegative ? -paise : paise;

  const ONE_LAKH_PAISE = 10000000n;    // 10^7 Paise
  const ONE_CRORE_PAISE = 1000000000n;  // 10^9 Paise
  const prefix = isNegative ? "-₹" : "₹";

  if (absPaise >= ONE_CRORE_PAISE) {
    const wholeCrores = absPaise / ONE_CRORE_PAISE;
    const remainder = absPaise % ONE_CRORE_PAISE;
    const twoDecimals = (remainder * 100n) / ONE_CRORE_PAISE;
    return `${prefix}${wholeCrores.toString()}.${twoDecimals.toString().padStart(2, "0")} Cr`;
  } else if (absPaise >= ONE_LAKH_PAISE) {
    const wholeLakhs = absPaise / ONE_LAKH_PAISE;
    const remainder = absPaise % ONE_LAKH_PAISE;
    const twoDecimals = (remainder * 100n) / ONE_LAKH_PAISE;
    return `${prefix}${wholeLakhs.toString()}.${twoDecimals.toString().padStart(2, "0")} Lakh`;
  }

  return formatPaiseToINR(paiseInput);
}
