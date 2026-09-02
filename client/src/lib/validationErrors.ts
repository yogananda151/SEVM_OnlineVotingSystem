/**
 * validationErrors.ts
 *
 * Centralised helper to normalise backend validation error responses into a
 * flat { fieldName → errorMessage } record that react-hook-form's setError()
 * can consume directly.
 *
 * Backend shape (from error.middleware.ts):
 *   {
 *     success: false,
 *     message: "Validation failed",
 *     errors: [{ field: "voterId", message: "..." }, ...]
 *   }
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServerErrorEntry {
  field: string;
  message: string;
}

export interface ServerErrorResponse {
  message?: string;
  errors?: ServerErrorEntry[];
  code?: string; // Prisma error codes forwarded by some paths
}

// ── Field name map ─────────────────────────────────────────────────────────────
// Maps backend Zod path strings → react-hook-form field names in the voter form.
// Extend this table if the backend field names ever diverge from the RHF names.

const FIELD_NAME_MAP: Record<string, string> = {
  constituencyId: 'constituencyId',
  pollingStationId: 'pollingStationId',
  fullName: 'fullName',
  voterId: 'voterId',
  aadhaarNumber: 'aadhaarNumber',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender',
  address: 'address',
  phone: 'phone',
  serialNumber: 'serialNumber',
};

// ── Human-readable message overrides ─────────────────────────────────────────
// When the backend message is too technical, substitute a friendlier version.

function humanise(field: string, raw: string): string {
  const lower = raw.toLowerCase();

  // Zod "required" / "invalid_type" messages
  if (lower.includes('required') || lower.includes('invalid_type')) {
    const friendly: Record<string, string> = {
      constituencyId: 'Please select a constituency.',
      pollingStationId: 'Please select a polling station.',
      fullName: 'Full name is required.',
      voterId: 'Voter ID is required.',
      dateOfBirth: 'Date of birth is required.',
      gender: 'Please select a gender.',
      address: 'Address is required.',
      serialNumber: 'Serial number is required.',
    };
    return friendly[field] ?? raw;
  }

  // Zod min-length messages
  if (lower.includes('at least')) return raw;

  // Zod enum messages
  if (lower.includes('invalid enum value')) {
    return `Please select a valid ${field === 'gender' ? 'gender' : 'option'}.`;
  }

  return raw;
}

// ── Main normaliser ───────────────────────────────────────────────────────────

/**
 * Converts a backend error response into a flat Record<fieldName, message>.
 * Returns null if there are no field-specific errors (e.g. network failures).
 */
export function normaliseValidationErrors(
  responseData: ServerErrorResponse | null | undefined,
): Record<string, string> | null {
  if (!responseData) return null;

  const fieldErrors: Record<string, string> = {};

  // Structured Zod errors array
  if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
    for (const entry of responseData.errors) {
      const rhfField = FIELD_NAME_MAP[entry.field] ?? entry.field;
      fieldErrors[rhfField] = humanise(entry.field, entry.message);
    }
  }

  // Prisma P2002 unique constraint — map to the most likely field
  // (The backend currently returns a generic message; we make it field-specific
  //  for voter ID / serial number based on context.)
  if (
    Object.keys(fieldErrors).length === 0 &&
    responseData.message?.includes('already exists')
  ) {
    fieldErrors['voterId'] = 'Voter ID already exists. Please use a different ID.';
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

/**
 * Extracts the Axios error response data safely.
 */
export function extractErrorResponseData(
  err: unknown,
): ServerErrorResponse | null {
  return (
    (err as { response?: { data?: ServerErrorResponse } })?.response?.data ??
    null
  );
}
