/**
 * Client-side card field checks for saved MPU debit cards.
 * CVV is validated on entry only — never persist it.
 */

export interface CardValidationResult {
  ok: boolean;
  errors: {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    holder?: string;
  };
}

/** Luhn checksum — rejects obviously fake numbers. */
export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Accept MM/YY, MM/YYYY, MMYY, or MM-YY. */
export function parseExpiry(raw: string): { month: number; year: number } | null {
  const cleaned = raw.trim().replace(/\s/g, '');
  const match = cleaned.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})$/) || cleaned.match(/^(\d{2})(\d{2}|\d{4})$/);
  if (!match) return null;

  const month = parseInt(match[1], 10);
  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) return null;
  if (year < 2000 || year > 2100) return null;
  return { month, year };
}

export function isExpiryInFuture(month: number, year: number, now = new Date()): boolean {
  // Card expires at end of month
  const expEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return expEnd.getTime() >= now.getTime();
}

export function formatExpiryDisplay(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

export function isValidCvv(cvv: string, cardNumber?: string): boolean {
  const digits = cvv.replace(/\D/g, '');
  // Amex uses 4; MPU/Visa/MC use 3
  const pan = (cardNumber || '').replace(/\D/g, '');
  const isAmex = pan.startsWith('34') || pan.startsWith('37');
  if (isAmex) return digits.length === 4;
  return digits.length === 3;
}

export function validateDebitCard(input: {
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}): CardValidationResult {
  const errors: CardValidationResult['errors'] = {};
  const pan = input.cardNumber.replace(/\D/g, '');

  if (!input.holderName.trim() || input.holderName.trim().length < 2) {
    errors.holder = 'Enter the name printed on the card.';
  }

  if (pan.length < 13 || pan.length > 19) {
    errors.cardNumber = 'Enter a valid card number (13–19 digits).';
  } else if (!luhnValid(pan)) {
    errors.cardNumber = 'Card number failed verification. Check the digits.';
  }

  const expiry = parseExpiry(input.expiry);
  if (!expiry) {
    errors.expiry = 'Use MM/YY (e.g. 09/28).';
  } else if (!isExpiryInFuture(expiry.month, expiry.year)) {
    errors.expiry = 'This card has expired.';
  }

  if (!isValidCvv(input.cvv, pan)) {
    errors.cvv = pan.startsWith('34') || pan.startsWith('37')
      ? 'Enter the 4-digit CVV.'
      : 'Enter the 3-digit CVV on the back.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
