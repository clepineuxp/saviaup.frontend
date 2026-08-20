import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth-store.service';
import { AuthenticatedContextStore } from '../../core/context/authenticated-context.store';
import { TenantContext } from '../../core/tenant/tenant-context.service';
import { createSectionNavigation } from '../../features/app/navigation/module-navigation.config';
import { NavigationGroupComponent } from '../../features/app/navigation/navigation-group.component';
import { NavigationItemComponent } from '../../features/app/navigation/navigation-item.component';
import { UiAlertComponent } from '../../shared/components/ui-alert/ui-alert.component';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { UiButtonComponent } from '../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-app-layout',
  imports: [
    RouterOutlet,
    NavigationGroupComponent,
    NavigationItemComponent,
    BrandLogoComponent,
    LanguageSelectorComponent,
    UiAlertComponent,
    UiButtonComponent,
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
  readonly authenticatedContext = inject(AuthenticatedContextStore);
  readonly navigation = computed(() =>
    createSectionNavigation(this.authenticatedContext.sections()),
  );
  readonly openSectionCode = signal<string | null>(null);
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
    this.closeNavigationGroup();
    this.authenticatedContext.load().subscribe({ error: () => undefined });
  }

  reloadContext(): void {
    this.closeNavigationGroup();
    this.authenticatedContext.load().subscribe({ error: () => undefined });
  }

  toggleNavigationGroup(sectionCode: string): void {
    this.openSectionCode.update((current) => (current === sectionCode ? null : sectionCode));
  }

  closeNavigationGroup(): void {
    this.openSectionCode.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeNavigationGroup();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeNavigationGroup();
  }

  changeTenant(): void {
    this.closeNavigationGroup();
    this.authenticatedContext.clear();
    this.tenantContext.clear();
    void this.router.navigate(['/select-tenant']);
  }

  logout(): void {
    this.closeNavigationGroup();
    this.authStore.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
