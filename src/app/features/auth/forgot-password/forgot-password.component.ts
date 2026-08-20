import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  readonly authStore = inject(AuthStore);
  readonly submitted = signal(false);
  readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  readonly form = new FormGroup({ email: this.email });

  submit(): void {
    if (this.email.invalid || this.authStore.loading()) {
      this.email.markAsTouched();
      return;
    }

    this.authStore.forgotPassword(this.email.getRawValue().trim()).subscribe({
      next: () => this.submitted.set(true),
      error: () => undefined,
    });
  }
}
