import { Injectable, computed, inject, signal } from '@angular/core';
import { Supplier, SupplierLookup } from '../models/supplier.model';
import { CreateSupplierPayload, UpdateSupplierPayload } from './supplier.contracts';
import { HttpSupplierRepository } from './http-supplier.repository';

@Injectable({
  providedIn: 'root',
})
export class SupplierStoreService {
  private readonly repository = inject(HttpSupplierRepository);

  readonly items = signal<Supplier[]>([]);
  readonly lookupItems = signal<SupplierLookup[]>([]);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly lookupLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly searchFilter = signal<string>('');
  readonly activeFilter = signal<boolean | undefined>(undefined);

  readonly suppliers = computed(() => this.items());
  readonly errorMessage = computed(() => this.error());
  readonly mutating = computed(() => this.loading());
  readonly canManage = signal<boolean>(true);
  readonly hasItems = computed(() => this.items().length > 0);

  loadPage(
    page: number = this.page(),
    search: string = this.searchFilter(),
    isActive: boolean | undefined = this.activeFilter()
  ): void {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(page);
    this.searchFilter.set(search);
    this.activeFilter.set(isActive);

    this.repository.getPage(search, isActive, page, this.pageSize()).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.totalCount.set(res.totalCount);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al cargar proveedores.');
        this.loading.set(false);
      },
    });
  }

  setFilters(search: string, isActive?: boolean): void {
    this.loadPage(1, search, isActive);
  }

  loadLookup(): void {
    this.lookupLoading.set(true);
    this.repository.getLookup().subscribe({
      next: (data) => {
        this.lookupItems.set(data);
        this.lookupLoading.set(false);
      },
      error: () => {
        this.lookupLoading.set(false);
      },
    });
  }

  createSupplier(payload: CreateSupplierPayload, onSuccess?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.create(payload).subscribe({
      next: () => {
        this.loadPage(1);
        this.loadLookup();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al crear el proveedor.');
        this.loading.set(false);
      },
    });
  }

  updateSupplier(supplierId: string, payload: UpdateSupplierPayload, onSuccess?: () => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.update(supplierId, payload).subscribe({
      next: () => {
        this.loadPage(this.page());
        this.loadLookup();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al actualizar el proveedor.');
        this.loading.set(false);
      },
    });
  }

  toggleSupplierStatus(supplierId: string, currentIsActive: boolean): void {
    this.repository.setStatus(supplierId, !currentIsActive).subscribe({
      next: () => {
        this.loadPage(this.page());
        this.loadLookup();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al cambiar estado del proveedor.');
      },
    });
  }
}
