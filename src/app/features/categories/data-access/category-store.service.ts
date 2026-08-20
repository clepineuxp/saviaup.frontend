import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, EMPTY, finalize, forkJoin, map, Observable, tap, throwError } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { TenantContext } from '../../../core/tenant/tenant-context.service';
import { ApiError } from '../../../shared/http/api-error';
import { RequestStatus } from '../../../shared/models/request-state.model';
import {
  Category,
  CreateCategoryRequest,
  SetCategoryStatusRequest,
  UpdateCategoryRequest,
} from '../models/category.model';
import { CATEGORY_REPOSITORY } from './category.repository';

const CATEGORIES_MANAGE = 'categories.manage';

export interface CategoryOperationError {
  readonly status: number;
  readonly code: string | null;
  readonly message: string;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
}

@Injectable()
export class CategoryStore {
  private readonly repository = inject(CATEGORY_REPOSITORY);
  private readonly authStore = inject(AuthStore);
  private readonly tenantContext = inject(TenantContext);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly categoriesState = signal<readonly Category[]>([]);
  private readonly statusState = signal<RequestStatus>('idle');
  private readonly mutationStatusState = signal<RequestStatus>('idle');
  private readonly errorState = signal<CategoryOperationError | null>(null);
  private readonly operationErrorState = signal<CategoryOperationError | null>(null);
  private readonly managePermissionState = signal(false);
  private readonly managementForbiddenState = signal(false);
  private readonly accessForbiddenState = signal(false);
  private scopedTenantId: string | null = null;
  private scopeVersion = 0;
  private loadVersion = 0;

  readonly categories = this.categoriesState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly mutationStatus = this.mutationStatusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly operationError = this.operationErrorState.asReadonly();
  readonly accessForbidden = this.accessForbiddenState.asReadonly();
  readonly loading = computed(() => this.statusState() === 'loading');
  readonly mutating = computed(() => this.mutationStatusState() === 'loading');
  readonly canManage = computed(
    () => this.managePermissionState() && !this.managementForbiddenState(),
  );

  constructor() {
    effect(() => {
      const tenantId = this.tenantContext.activeTenant()?.id ?? null;
      untracked(() => {
        if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
      });
    });
  }

  load(): Observable<readonly Category[]> {
    const tenantId = this.tenantContext.activeTenant()?.id ?? null;
    if (!tenantId) {
      this.changeScope(null);
      void this.router.navigate(['/select-tenant']);
      return EMPTY;
    }

    if (tenantId !== this.scopedTenantId) this.changeScope(tenantId);
    const scopeVersion = this.scopeVersion;
    const loadVersion = ++this.loadVersion;
    this.statusState.set('loading');
    this.errorState.set(null);
    this.operationErrorState.set(null);
    this.accessForbiddenState.set(false);
    this.managementForbiddenState.set(false);

    return forkJoin({
      categories: this.repository.list(true),
      user: this.authStore.loadCurrentUser(),
    }).pipe(
      tap(({ categories, user }) => {
        if (!this.isCurrent(tenantId, scopeVersion) || loadVersion !== this.loadVersion) return;
        this.categoriesState.set(categories);
        this.managePermissionState.set(user.permissions.includes(CATEGORIES_MANAGE));
        this.statusState.set('success');
      }),
      map(({ categories }) => categories),
      catchError((error: unknown) => {
        if (this.isCurrent(tenantId, scopeVersion) && loadVersion === this.loadVersion) {
          this.handleListError(error);
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (
          this.isCurrent(tenantId, scopeVersion) &&
          loadVersion === this.loadVersion &&
          this.statusState() === 'loading'
        ) {
          this.statusState.set('idle');
        }
      }),
    );
  }

  create(request: CreateCategoryRequest): Observable<Category> {
    return this.trackMutation(this.repository.create(request), (created) => {
      this.categoriesState.update((categories) => [created, ...categories]);
    });
  }

  update(categoryId: string, request: UpdateCategoryRequest): Observable<Category> {
    return this.trackMutation(this.repository.update(categoryId, request), (updated) => {
      this.replace(updated);
    });
  }

  setStatus(categoryId: string, request: SetCategoryStatusRequest): Observable<Category> {
    return this.trackMutation(this.repository.setStatus(categoryId, request), (updated) => {
      this.replace(updated);
    });
  }

  delete(categoryId: string): Observable<void> {
    return this.trackMutation(this.repository.delete(categoryId), () => {
      this.categoriesState.update((categories) =>
        categories.filter((category) => category.id !== categoryId),
      );
    });
  }

  clearOperationError(): void {
    this.operationErrorState.set(null);
  }

  private trackMutation<T>(
    request: Observable<T>,
    applyResult: (result: T) => void,
  ): Observable<T> {
    const tenantId = this.tenantContext.activeTenant()?.id ?? null;
    const scopeVersion = this.scopeVersion;
    this.mutationStatusState.set('loading');
    this.operationErrorState.set(null);

    return request.pipe(
      tap((result) => {
        if (!tenantId || !this.isCurrent(tenantId, scopeVersion)) return;
        applyResult(result);
        this.mutationStatusState.set('success');
      }),
      catchError((error: unknown) => {
        if (tenantId && this.isCurrent(tenantId, scopeVersion)) {
          this.handleMutationError(error, tenantId, scopeVersion);
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (
          tenantId &&
          this.isCurrent(tenantId, scopeVersion) &&
          this.mutationStatusState() === 'loading'
        ) {
          this.mutationStatusState.set('idle');
        }
      }),
    );
  }

  private handleListError(error: unknown): void {
    const mapped = this.mapError(error);
    if (this.isTenantRequired(mapped)) {
      this.leaveTenant();
      return;
    }
    if (mapped.status === 403 && mapped.code === 'AUTH_FORBIDDEN') {
      this.accessForbiddenState.set(true);
    }
    this.errorState.set(mapped);
    this.statusState.set('error');
  }

  private handleMutationError(error: unknown, tenantId: string, scopeVersion: number): void {
    const mapped = this.mapError(error);
    if (this.isTenantRequired(mapped)) {
      this.leaveTenant();
      return;
    }
    if (mapped.status === 403 && mapped.code === 'AUTH_FORBIDDEN') {
      this.managementForbiddenState.set(true);
    }
    this.operationErrorState.set(mapped);
    this.mutationStatusState.set('error');

    if (mapped.status === 404 && mapped.code === 'CATEGORY_NOT_FOUND') {
      this.refreshAfterMissing(tenantId, scopeVersion);
    }
  }

  private refreshAfterMissing(tenantId: string, scopeVersion: number): void {
    this.repository
      .list(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          if (this.isCurrent(tenantId, scopeVersion)) this.categoriesState.set(categories);
        },
        error: () => undefined,
      });
  }

  private mapError(error: unknown): CategoryOperationError {
    if (error instanceof ApiError) {
      return {
        status: error.status,
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }
    return {
      status: 0,
      code: null,
      message: 'No pudimos completar la solicitud.',
      fieldErrors: {},
    };
  }

  private isTenantRequired(error: CategoryOperationError): boolean {
    return error.status === 403 && error.code === 'TENANT_REQUIRED';
  }

  private leaveTenant(): void {
    this.changeScope(null);
    this.tenantContext.clear();
    void this.router.navigate(['/select-tenant']);
  }

  private replace(updated: Category): void {
    this.categoriesState.update((categories) =>
      categories.map((category) => (category.id === updated.id ? updated : category)),
    );
  }

  private isCurrent(tenantId: string, scopeVersion: number): boolean {
    return (
      this.scopedTenantId === tenantId &&
      this.scopeVersion === scopeVersion &&
      this.tenantContext.activeTenant()?.id === tenantId
    );
  }

  private changeScope(tenantId: string | null): void {
    this.scopedTenantId = tenantId;
    this.scopeVersion += 1;
    this.loadVersion += 1;
    this.categoriesState.set([]);
    this.statusState.set('idle');
    this.mutationStatusState.set('idle');
    this.errorState.set(null);
    this.operationErrorState.set(null);
    this.managePermissionState.set(false);
    this.managementForbiddenState.set(false);
    this.accessForbiddenState.set(false);
  }
}
