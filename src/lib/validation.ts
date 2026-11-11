export const LETTERS_ONLY_REGEX = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
export const STUDENT_ID_REGEX = /^\d{4}-\d{6}$/;
export const NU_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@(?:[a-z0-9-]+\.)*(?:nu-[a-z0-9-]+|national-u)\.edu\.ph$/i;

export function sanitizeLettersOnly(value: string): string {
  return value.replace(/[^A-Za-z\s]/g, '').replace(/\s{2,}/g, ' ');
}

export function isValidLettersOnly(value: string): boolean {
  return LETTERS_ONLY_REGEX.test(value.trim());
}

export function formatStudentIdInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function isValidStudentId(value: string): boolean {
  return STUDENT_ID_REGEX.test(value.trim());
}

export function isValidNuEmail(value: string): boolean {
  return NU_EMAIL_REGEX.test(value.trim());
}

export interface PasswordCheckResult {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  score: number;
  isStrong: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordCheckResult {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const checks = [minLength, hasUpper, hasLower, hasNumber, hasSpecial];
  const score = checks.filter(Boolean).length;

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    score,
    isStrong: score === checks.length,
  };
}

