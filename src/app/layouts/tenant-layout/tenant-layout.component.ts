import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store.service';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-tenant-layout',
  imports: [RouterOutlet, BrandLogoComponent, LanguageSelectorComponent, TranslatePipe],
  templateUrl: './tenant-layout.component.html',
  styleUrl: './tenant-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantLayoutComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  logout(): void {
    this.authStore.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
