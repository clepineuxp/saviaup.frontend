import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TenantStore } from '../data-access/tenant-store.service';
import { Tenant } from '../models/tenant.model';

@Component({
  selector: 'app-tenant-selection',
  imports: [RouterLink, UiAlertComponent, TranslatePipe],
  templateUrl: './tenant-selection.component.html',
  styleUrl: './tenant-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantSelectionComponent implements OnInit {
  private readonly router = inject(Router);
  readonly tenantStore = inject(TenantStore);
  readonly selectingId = signal<string | null>(null);

  ngOnInit(): void {
    this.tenantStore.load().subscribe({ error: () => undefined });
  }

  select(tenant: Tenant): void {
    if (this.tenantStore.loading()) return;
    this.selectingId.set(tenant.id);
    this.tenantStore.select(tenant).subscribe({
      next: () => void this.router.navigate(['/app']),
      error: () => this.selectingId.set(null),
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
