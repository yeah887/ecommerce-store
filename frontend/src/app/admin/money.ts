/**
 * Parses a euro amount typed by an admin into integer cents, without floating-point math.
 * Accepts "12", "12.5", "12.50" and "12,50". Thousands separators are rejected on purpose:
 * "12.505" could mean €12,505 or a mistyped €12.51, and a price field shouldn't guess.
 * Returns null for anything else.
 */
export function parseEuroToCents(input: string): number | null {
  const text = input.trim().replace(/^€\s*/, '').replace(/\s*€$/, '').replace(/\s/g, '');
  if (!text) return null;

  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text);
  if (!match) return null;

  const euros = match[1];
  const cents = (match[2] ?? '').padEnd(2, '0');
  const value = Number(euros) * 100 + Number(cents);
  return Number.isSafeInteger(value) ? value : null;
}

/** Formats cents for an input field, e.g. 1250 → "12.50". */
export function centsToEuroInput(cents: number): string {
  const euros = Math.floor(cents / 100);
  return `${euros}.${String(cents % 100).padStart(2, '0')}`;
}
