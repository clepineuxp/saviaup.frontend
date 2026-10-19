import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { ApiError } from '../../../shared/http/api-error';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ShareLinkService } from '../../../shared/services/share-link.service';
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
  private readonly share = inject(ShareLinkService);
  readonly tenantStore = inject(TenantStore);
  readonly selectingId = signal<string | null>(null);
  readonly joinLink = signal<{ url: string } | null>(null);
  readonly joinModalOpen = signal(false);
  readonly joinLinkError = signal<string | null>(null);

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

  createJoinRequest(): void {
    this.joinLinkError.set(null);
    this.tenantStore.createJoinRequest().subscribe({
      next: (link) => {
        this.joinLink.set(link);
        this.joinModalOpen.set(true);
      },
      error: (error: unknown) =>
        this.joinLinkError.set(
          error instanceof ApiError ? error.message : 'No pudimos crear la solicitud. Intenta de nuevo.',
        ),
    });
  }

  closeJoinModal(): void {
    this.joinModalOpen.set(false);
  }

  async shareLink(url: string): Promise<void> {
    try {
      await this.share.share(
        'Solicitud para unirme a Savia Up',
        'Quiero que me invites a tu organización de Savia Up.',
        url,
      );
    } catch {
      // The user may close the native share sheet; the link remains available to copy.
    }
  }

  async copyLink(url: string): Promise<void> {
    await navigator.clipboard.writeText(url);
  }
}
