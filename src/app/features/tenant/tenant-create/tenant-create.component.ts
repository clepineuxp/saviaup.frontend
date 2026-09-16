import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TenantStore } from '../data-access/tenant-store.service';

@Component({
  selector: 'app-tenant-create',
  imports: [ReactiveFormsModule, RouterLink, UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './tenant-create.component.html',
  styleUrl: './tenant-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantCreateComponent {
  private readonly router = inject(Router);
  readonly tenantStore = inject(TenantStore);
  readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });
  readonly form = new FormGroup({ name: this.name });

  submit(): void {
    if (this.name.invalid || this.tenantStore.loading()) {
      this.name.markAsTouched();
      return;
    }

    this.tenantStore.create(this.name.getRawValue().trim()).subscribe({
      next: () => void this.router.navigate(['/app']),
      error: () => undefined,
    });
  }
}
