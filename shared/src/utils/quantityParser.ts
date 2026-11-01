export class QuantityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuantityConfigurationError";
  }
}

export class QuantityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuantityValidationError";
  }
}

export interface QuantityValidationBounds {
  min: number;
  max: number;
}

export const DEFAULT_QUANTITY_BOUNDS: QuantityValidationBounds = {
  min: 0,
  max: 100000 // 1 Lakh units default ceiling
};

/**
 * Validates discrete integer quantities with strict configuration checking and string parsing.
 */
export function parseStrictDiscreteQuantity(
  input: string | number,
  options: Partial<QuantityValidationBounds> = {}
): number {
  // 1. Strict Configuration Validation
  const min = options.min !== undefined ? options.min : DEFAULT_QUANTITY_BOUNDS.min;
  const max = options.max !== undefined ? options.max : DEFAULT_QUANTITY_BOUNDS.max;

  if (!Number.isSafeInteger(min) || min < 0) {
    throw new QuantityConfigurationError(
      `Configured "min" must be a non-negative safe integer. Received: ${min}`
    );
  }

  if (!Number.isSafeInteger(max) || max < 0) {
    throw new QuantityConfigurationError(
      `Configured "max" must be a non-negative safe integer. Received: ${max}`
    );
  }

  if (min > max) {
    throw new QuantityConfigurationError(
      `Invalid quantity bounds: configured "min" (${min}) exceeds configured "max" (${max})`
    );
  }

  // 2. Strict String Parsing
  const str = String(input).trim();

  if (!str) {
    throw new QuantityValidationError("Quantity input cannot be empty");
  }

  // Strict non-negative integer regex: "0" OR [1-9] followed by digits (no leading zeros like "007")
  const STRICT_INTEGER_REGEX = /^(?:0|[1-9]\d*)$/;
  if (!STRICT_INTEGER_REGEX.test(str)) {
    throw new QuantityValidationError(
      `Invalid integer quantity: "${input}". Decimals, scientific notation, leading zeros, and non-digits are prohibited.`
    );
  }

  const parsedNumber = Number(str);
  if (!Number.isSafeInteger(parsedNumber)) {
    throw new QuantityValidationError(`Quantity exceeds JavaScript safe integer limit: "${input}"`);
  }

  // 3. Range Verification
  if (parsedNumber < min) {
    throw new QuantityValidationError(`Quantity must be at least ${min}. Received: ${parsedNumber}`);
  }

  if (parsedNumber > max) {
    throw new QuantityValidationError(`Quantity cannot exceed maximum limit of ${max}. Received: ${parsedNumber}`);
  }

  return parsedNumber;
}

/**
 * Scaled integer arithmetic for quantities with 3 decimal places (e.g. 2.5 hours = 2500 scaled units).
 * Round Half-Up integer division.
 */
export function calculateLineItemTotalPaise(
  quantityScaledUnits: bigint,
  unitCostPaise: bigint
): bigint {
  return ((quantityScaledUnits * unitCostPaise) + 500n) / 1000n;
}
