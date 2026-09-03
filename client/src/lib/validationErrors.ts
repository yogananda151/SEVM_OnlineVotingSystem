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
  code?: string;
}

// ── Field name map ─────────────────────────────────────────────────────────────
// Maps backend Zod path strings → react-hook-form field names.
// Covers all management forms in the application.

const FIELD_NAME_MAP: Record<string, string> = {
  // Voter fields
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
  // Region fields
  name: 'name',
  code: 'code',
  description: 'description',
  // Constituency fields
  regionId: 'regionId',
  // Polling station fields
  capacity: 'capacity',
  totalBooths: 'totalBooths',
  // Officer fields
  email: 'email',
  password: 'password',
  employeeId: 'employeeId',
  // Election fields
  electionType: 'electionType',
  scheduledDate: 'scheduledDate',
  // Candidate fields
  electionId: 'electionId',
  partyId: 'partyId',
  age: 'age',
  qualification: 'qualification',
  // Political Party fields
  abbreviation: 'abbreviation',
  symbol: 'symbol',
  color: 'color',
  foundedYear: 'foundedYear',
  // Election officer assignment
  officerId: 'officerId',
};

// ── Human-readable message overrides ─────────────────────────────────────────
// When the backend message is generic, substitute a friendlier version.

function humanise(field: string, raw: string): string {
  const lower = raw.toLowerCase();

  // Zod "required" / "invalid_type" messages
  if (lower.includes('required') || lower.includes('invalid_type') || lower.includes('expected number')) {
    const friendly: Record<string, string> = {
      // Voter
      constituencyId: 'Please select a constituency.',
      pollingStationId: 'Please select a polling station.',
      fullName: 'Full name is required.',
      voterId: 'Voter ID is required.',
      dateOfBirth: 'Date of birth is required.',
      gender: 'Please select a gender.',
      address: 'Address is required.',
      serialNumber: 'Serial number is required.',
      // Region
      name: 'Name is required.',
      code: 'Code is required.',
      // Constituency
      regionId: 'Please select a region.',
      // Officer
      email: 'Email address is required.',
      password: 'Password is required.',
      employeeId: 'Employee ID is required.',
      phone: 'Phone number is required.',
      // Election
      electionType: 'Please select an election type.',
      scheduledDate: 'Scheduled date is required.',
      // Candidate
      electionId: 'Please select an election.',
      age: 'Please enter a valid age.',
      // Election officer
      officerId: 'Please select an Election Officer.',
    };
    return friendly[field] ?? raw;
  }

  // Zod min-length messages — pass through (already human readable)
  if (lower.includes('at least')) return raw;

  // Zod max-length messages
  if (lower.includes('at most')) return raw;

  // Zod enum messages
  if (lower.includes('invalid enum value')) {
    if (field === 'gender') return 'Please select a valid gender (Male, Female, or Other).';
    return `Please select a valid option for ${field}.`;
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

  // Prisma P2002 unique constraint & duplicate checks — map by message keywords
  if (Object.keys(fieldErrors).length === 0 && responseData.message) {
    const msg = responseData.message.toLowerCase();
    if (msg.includes('voter id') || msg.includes('voterid')) {
      fieldErrors['voterId'] = 'Voter ID already exists. Please use a different Voter ID.';
    } else if (msg.includes('email')) {
      fieldErrors['email'] = 'An account with this email already exists. Please use a different email.';
    } else if (msg.includes('employee id') || msg.includes('employeeid') || msg.includes('employee_id')) {
      fieldErrors['employeeId'] = 'An officer with this Employee ID already exists. Please use a different ID.';
    } else if (msg.includes('code') && msg.includes('already')) {
      fieldErrors['code'] = 'This code is already in use. Please choose a unique code.';
    } else {
      // Generic fallback — surface the message so it is never swallowed
      fieldErrors['_form'] = responseData.message;
    }
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
