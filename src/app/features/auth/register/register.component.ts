import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import {
  passwordMatchValidator,
  passwordStrengthValidator,
} from '../../../shared/utils/form-validators';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly router = inject(Router);
  readonly authStore = inject(AuthStore);
  readonly showPassword = signal(false);
  readonly form = new FormGroup(
    {
      firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordStrengthValidator()],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [passwordMatchValidator('password', 'confirmPassword')] },
  );

  submit(): void {
    if (this.form.invalid || this.authStore.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, password } = this.form.getRawValue();
    this.authStore
      .register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      })
      .subscribe({
        next: (result) => {
          const destination =
            result.nextStep === 'login'
              ? '/login'
              : result.nextStep === 'tenant-selection'
                ? '/select-tenant'
                : '/app';
          void this.router.navigate([destination]);
        },
        error: () => undefined,
      });
  }

  isInvalid(control: FormControl<string>): boolean {
    return control.invalid && control.touched;
  }

  confirmationInvalid(): boolean {
    return (
      this.form.controls.confirmPassword.touched &&
      (this.form.controls.confirmPassword.invalid || this.form.hasError('passwordMismatch'))
    );
  }
}
