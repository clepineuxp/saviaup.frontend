import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordStrengthValidator = (): ValidatorFn => (control: AbstractControl) => {
  const value = String(control.value ?? '');
  const isStrong =
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);
  return isStrong ? null : { passwordStrength: true };
};

export const passwordMatchValidator =
  (passwordField: string, confirmationField: string): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordField)?.value;
    const confirmation = control.get(confirmationField)?.value;
    return password === confirmation ? null : { passwordMismatch: true };
  };

export const absoluteHttpUrlValidator =
  (): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;

    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:'
        ? null
        : { absoluteHttpUrl: true };
    } catch {
      return { absoluteHttpUrl: true };
    }
  };

export const requiredBooleanValidator =
  (): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null =>
    typeof control.value === 'boolean' ? null : { required: true };

export const nonBlankRequiredValidator =
  (): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null =>
    String(control.value ?? '').trim().length > 0 ? null : { required: true };
