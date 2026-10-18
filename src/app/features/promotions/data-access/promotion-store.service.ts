import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { ApiError } from '../../../shared/http/api-error';
import { AuthStore } from '../../../core/auth/auth-store.service';
import { Promotion, SavePromotionRequest } from '../models/promotion.model';
import { PROMOTION_REPOSITORY } from './promotion.repository';

@Injectable()
export class PromotionStore {
  private readonly repository = inject(PROMOTION_REPOSITORY);
  private readonly auth = inject(AuthStore);
  private readonly itemsState = signal<readonly Promotion[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly canManageState = signal(false);

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly canManage = this.canManageState.asReadonly();
  readonly activeItems = computed(() => this.items().filter((item) => item.isActive));

  load(): Observable<readonly Promotion[]> {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.repository.list(true).pipe(
      tap((items) => {
        this.itemsState.set(items);
        this.auth.loadCurrentUser().subscribe({
          next: (user) => this.canManageState.set(user.permissions.includes('promotions.manage')),
        });
      }),
      catchError((error: unknown) => {
        this.errorState.set(
          error instanceof ApiError ? error.message : 'No fue posible cargar las promociones.',
        );
        return throwError(() => error);
      }),
      finalize(() => this.loadingState.set(false)),
    );
  }

  create(request: SavePromotionRequest): Observable<Promotion> {
    return this.mutate(this.repository.create(request), (item) =>
      this.itemsState.update((items) => [item, ...items]),
    );
  }

  update(id: string, request: SavePromotionRequest): Observable<Promotion> {
    return this.mutate(this.repository.update(id, request), (item) => this.replace(item));
  }

  setStatus(id: string, active: boolean): Observable<Promotion> {
    return this.mutate(this.repository.setStatus(id, active), (item) => this.replace(item));
  }

  delete(id: string): Observable<void> {
    return this.mutate(this.repository.delete(id), () =>
      this.itemsState.update((items) => items.filter((item) => item.id !== id)),
    );
  }

  private mutate<T>(request: Observable<T>, apply: (value: T) => void): Observable<T> {
    this.loadingState.set(true);
    this.errorState.set(null);
    return request.pipe(
      tap(apply),
      catchError((error: unknown) => {
        this.errorState.set(
          error instanceof ApiError ? error.message : 'No fue posible guardar la promoción.',
        );
        return throwError(() => error);
      }),
      finalize(() => this.loadingState.set(false)),
    );
  }

  private replace(item: Promotion): void {
    this.itemsState.update((items) =>
      items.map((current) => (current.id === item.id ? item : current)),
    );
  }
}
