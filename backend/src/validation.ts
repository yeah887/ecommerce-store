import { HttpError } from './errors.js';

/** Collects per-field validation messages and throws them as one 400 response. */
export class FieldErrors {
  private readonly fields: Record<string, string> = {};

  add(field: string, message: string): void {
    this.fields[field] ??= message;
  }

  throwIfAny(): void {
    if (Object.keys(this.fields).length > 0) {
      throw new HttpError(400, 'validation_failed', 'Some fields are invalid', this.fields);
    }
  }
}

/** Reads a single string from a query parameter; repeated parameters are an error. */
export function queryString(value: unknown, field: string, errors: FieldErrors): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    errors.add(field, `${field} must be a single value`);
    return undefined;
  }
  return value;
}

/** Parses a positive integer query parameter, falling back to `fallback` when absent. */
export function queryPositiveInt(
  value: unknown,
  field: string,
  fallback: number,
  errors: FieldErrors,
): number {
  const raw = queryString(value, field, errors);
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    errors.add(field, `${field} must be a positive integer`);
    return fallback;
  }
  return Number(raw);
}
