export const PASSWORD_HINT = '8–72 characters, with at least one letter and one number.';

const HAS_LETTER_AND_NUMBER = /(?=.*[A-Za-z])(?=.*\d)/;

export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 72) {
    return 'Password must be between 8 and 72 characters.';
  }
  if (!HAS_LETTER_AND_NUMBER.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}
