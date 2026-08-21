import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { ApiError } from '../../shared/http/api-error';
import { LocalizationService } from '../../shared/i18n/localization.service';
import { RequestStatus } from '../../shared/models/request-state.model';
import { TenantContext } from '../tenant/tenant-context.service';
import { AUTHENTICATED_CONTEXT_REPOSITORY } from './authenticated-context.repository';
import { AuthenticatedContext, NavigationSection, UserInfo } from './authenticated-context.model';

interface LoadRequest {
  readonly key: string;
  readonly version: number;
  readonly value: Observable<AuthenticatedContext>;
}

@Injectable({ providedIn: 'root' })
export class AuthenticatedContextStore {
  private readonly repository = inject(AUTHENTICATED_CONTEXT_REPOSITORY);
  private readonly localization = inject(LocalizationService);
  private readonly tenantContext = inject(TenantContext);
  private readonly router = inject(Router);
  private readonly userInfoState = signal<UserInfo | null>(null);
  private readonly sectionsState = signal<readonly NavigationSection[]>([]);
  private readonly emptyStateMessageState = signal<string | null>(null);
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<string | null>(null);
  private readonly loadedTenantIdState = signal<string | null>(null);
  private readonly loadedLanguageState = signal<string | null>(null);
  private loadVersion = 0;
  private loadRequest?: LoadRequest;

  readonly userInfo = this.userInfoState.asReadonly();
  readonly sections = this.sectionsState.asReadonly();
  readonly modules = computed(() => this.sectionsState().flatMap((section) => section.modules));
  readonly options = computed(() => this.sectionsState().flatMap((section) => section.options));
  readonly hasTablesModule = computed(
    () =>
      this.modules().some((m) => m.code === 'tables') ||
      this.options().some((o) => o.code === 'tables' || o.moduleCode === 'tables'),
  );
  readonly emptyStateMessage = this.emptyStateMessageState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly loading = computed(() => this.statusState() === 'loading');
  readonly ready = computed(() => this.statusState() === 'success');
  readonly displayName = computed(() => {
    const userInfo = this.userInfoState();
    return userInfo ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : '';
  });

  ensureLoaded(): Observable<AuthenticatedContext> {
    const tenant = this.tenantContext.activeTenant();
    if (!tenant) {
      this.clear();
      return EMPTY;
    }

    const language = this.localization.language();
    const key = this.requestKey(tenant.id, language);
    if (this.loadRequest?.key === key) return this.loadRequest.value;

    const userInfo = this.userInfoState();
    if (
      this.statusState() === 'success' &&
      userInfo &&
      this.loadedTenantIdState() === tenant.id &&
      this.loadedLanguageState() === language
    ) {
      return of({
        userInfo,
        sections: this.sectionsState(),
        emptyStateMessage: this.emptyStateMessageState(),
      });
    }

    return this.load();
  }

  load(): Observable<AuthenticatedContext> {
    const tenant = this.tenantContext.activeTenant();
    if (!tenant) {
      this.clear();
      return EMPTY;
    }

    const language = this.localization.language();
    const key = this.requestKey(tenant.id, language);
    const version = ++this.loadVersion;
    this.resetData();
    this.statusState.set('loading');

    const request = forkJoin({
      userInfo: this.repository.userInfo(),
      navigation: this.repository.availableModules(language),
    }).pipe(
      map(({ userInfo, navigation }): AuthenticatedContext => ({
        userInfo,
        sections: navigation.sections,
        emptyStateMessage: navigation.emptyStateMessage,
      })),
      tap((context) => {
        if (version !== this.loadVersion || this.tenantContext.activeTenant()?.id !== tenant.id) {
          return;
        }
        this.userInfoState.set(context.userInfo);
        this.sectionsState.set(context.sections);
        this.emptyStateMessageState.set(context.emptyStateMessage);
        this.loadedTenantIdState.set(tenant.id);
        this.loadedLanguageState.set(language);
        this.statusState.set('success');
      }),
      catchError((error: unknown) => {
        if (version === this.loadVersion) this.handleError(error);
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.loadRequest?.version === version) this.loadRequest = undefined;
        if (version === this.loadVersion && this.statusState() === 'loading') {
          this.statusState.set('idle');
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.loadRequest = { key, version, value: request };
    return request;
  }

  clear(): void {
    this.loadVersion += 1;
    this.loadRequest = undefined;
    this.resetData();
    this.statusState.set('idle');
  }

  private handleError(error: unknown): void {
    if (error instanceof ApiError && error.status === 403 && error.code === 'TENANT_REQUIRED') {
      this.clear();
      this.tenantContext.clear();
      void this.router.navigate(['/select-tenant']);
      return;
    }

    this.errorState.set(
      error instanceof ApiError ? error.message : 'No pudimos cargar tu espacio de trabajo.',
    );
    this.statusState.set('error');
  }

  private resetData(): void {
    this.userInfoState.set(null);
    this.sectionsState.set([]);
    this.emptyStateMessageState.set(null);
    this.errorState.set(null);
    this.loadedTenantIdState.set(null);
    this.loadedLanguageState.set(null);
  }

  private requestKey(tenantId: string, language: string): string {
    return `${tenantId}:${language}`;
  }
}
