import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store.service';
import { AuthenticatedContextStore } from '../../core/context/authenticated-context.store';
import { TenantContext } from '../../core/tenant/tenant-context.service';
import { createSectionNavigation } from '../../features/app/navigation/module-navigation.config';
import { NavigationRailComponent } from '../../features/app/navigation/navigation-rail.component';
import { UiAlertComponent } from '../../shared/components/ui-alert/ui-alert.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AppShellState } from './app-shell-state.service';

@Component({
  selector: 'app-app-layout',
  imports: [
    RouterOutlet,
    NavigationRailComponent,
    BrandLogoComponent,
    LanguageSelectorComponent,
    UiAlertComponent,
    UiButtonComponent,
    ToastContainerComponent,
    TranslatePipe,
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  readonly tenantContext = inject(TenantContext);
  readonly shellState = inject(AppShellState);
  readonly authenticatedContext = inject(AuthenticatedContextStore);
  readonly navigation = computed(() =>
    createSectionNavigation(this.authenticatedContext.sections()),
  );
  readonly userInitials = computed(() => {
    const userInfo = this.authenticatedContext.userInfo();
    return userInfo
      ? `${userInfo.firstName.charAt(0)}${userInfo.lastName.charAt(0)}`.toUpperCase()
      : '';
  });

  ngOnInit(): void {
    this.authenticatedContext.ensureLoaded().subscribe({ error: () => undefined });
  }

  retry(): void {
    this.authenticatedContext.load().subscribe({ error: () => undefined });
  }

  reloadContext(): void {
    this.authenticatedContext.load().subscribe({ error: () => undefined });
  }

  changeTenant(): void {
    this.authenticatedContext.clear();
    this.tenantContext.clear();
    void this.router.navigate(['/select-tenant']);
  }

  logout(): void {
    this.authStore.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
