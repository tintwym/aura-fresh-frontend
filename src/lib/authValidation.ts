//
// Shared client-side auth validation (aligned with iOS + Spring RegisterUserRequest).
//

export type AuthMode = 'login' | 'register';

export type AuthFieldErrors = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const USERNAME_ALLOWED = /^[A-Za-z0-9._-]+$/;

export function validateFirstName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your first name.';
  if (trimmed.length < 2) return 'First name looks too short.';
  return undefined;
}

export function validateLastName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your last name.';
  if (trimmed.length < 2) return 'Last name looks too short.';
  return undefined;
}

export function validateUsername(value: string, mode: AuthMode): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your username.';
  if (mode === 'register') {
    if (trimmed.length < 3) return 'Username must be at least 3 characters.';
    if (trimmed.length > 64) return 'Username must be 64 characters or fewer.';
    if (!USERNAME_ALLOWED.test(trimmed)) {
      return 'Use letters, numbers, dots, underscores, or hyphens.';
    }
  }
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Please enter a valid email address.';
  return undefined;
}

export function validatePassword(value: string, mode: AuthMode): string | undefined {
  if (!value) return 'Please enter your password.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 128) return 'Password must be 128 characters or fewer.';
  // Backend RegisterUserRequest only enforces length — keep client rules aligned.
  return undefined;
}

export function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your full name.';
  if (trimmed.length < 2) return 'Name looks too short.';
  return undefined;
}

export function validateAuthForm(
  mode: AuthMode,
  values: {
    firstName?: string;
    lastName?: string;
    username: string;
    email?: string;
    password: string;
  }
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (mode === 'register') {
    errors.firstName = validateFirstName(values.firstName ?? '');
    errors.lastName = validateLastName(values.lastName ?? '');
    errors.email = validateEmail(values.email ?? '');
  }
  errors.username = validateUsername(values.username, mode);
  errors.password = validatePassword(values.password, mode);

  // Drop undefined keys for easier `hasErrors` checks
  (Object.keys(errors) as (keyof AuthFieldErrors)[]).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return errors;
}

export function hasAuthErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Map API / network failures to friendly copy (matches iOS AuthStore). */
export function friendlyAuthError(
  error: unknown,
  registering: boolean,
  options?: { social?: boolean }
): string {
  const social = options?.social === true;
  if (error instanceof AuthApiError) {
    if (error.status === 401) {
      if (social || /google|apple|social|token|audience|verified email/i.test(error.message)) {
        return error.message.trim() || 'Social sign-in failed. Please try again.';
      }
      return registering
        ? 'We couldn’t create your account. Please try again.'
        : 'Incorrect username or password.';
    }
    if (error.status === 409) {
      return error.message.trim() || 'That username or email is already taken.';
    }
    if (/already/i.test(error.message) && !social) {
      return 'That username or email is already taken.';
    }
    if (error.status === 400 || error.status === 422) {
      const lower = error.message.toLowerCase();
      if (social && error.message.trim()) return error.message;
      if (lower.includes('email')) return 'Please enter a valid email address.';
      if (lower.includes('password')) return 'Password must be at least 8 characters.';
      if (lower.includes('username')) return 'Please choose a different username.';
      if (error.message.trim()) return error.message;
      return 'Please check your details and try again.';
    }
    if (error.status === 503) {
      return error.message.trim() || 'Social sign-in is not configured yet.';
    }
    if (error.status === 0) {
      return 'Can’t reach Aura Fresh right now. Check your connection and try again.';
    }
    if (error.message.trim()) return error.message;
    return `Something went wrong (${error.status}). Please try again.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export class AuthApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}
