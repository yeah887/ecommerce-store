/** The JSON body of every non-2xx response from the API. */
export interface ApiErrorBody {
  error: {
    /** Machine-readable code, e.g. `not_found`, `validation_failed`. */
    code: string;
    message: string;
    /** Per-field messages for validation failures. */
    fields?: Record<string, string>;
  };
}
