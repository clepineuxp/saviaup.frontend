import { Observable } from 'rxjs';
import { Supplier, SupplierLookup } from '../models/supplier.model';
import { CreateSupplierPayload, UpdateSupplierPayload } from './supplier.contracts';

export interface SupplierPageResult {
  items: Supplier[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export abstract class SupplierRepository {
  abstract getPage(search?: string, isActive?: boolean, page?: number, pageSize?: number): Observable<SupplierPageResult>;
  abstract getLookup(): Observable<SupplierLookup[]>;
  abstract create(payload: CreateSupplierPayload): Observable<Supplier>;
  abstract update(supplierId: string, payload: UpdateSupplierPayload): Observable<Supplier>;
  abstract setStatus(supplierId: string, isActive: boolean): Observable<Supplier>;
}
