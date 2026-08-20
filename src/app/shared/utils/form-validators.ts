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
