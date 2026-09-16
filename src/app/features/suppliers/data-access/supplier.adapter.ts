import { Supplier, SupplierLookup } from '../models/supplier.model';
import { SupplierDto, SupplierLookupDto } from './supplier.contracts';

export function mapSupplierDtoToModel(dto: SupplierDto): Supplier {
  return {
    id: dto.id,
    name: dto.name,
    commercialName: dto.commercialName,
    document: dto.document,
    email: dto.email,
    phone: dto.phone,
    address: dto.address,
    isActive: dto.isActive,
    createdByUserName: dto.createdByUserName,
    lastModifiedByUserName: dto.lastModifiedByUserName,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function mapSupplierLookupDtoToModel(dto: SupplierLookupDto): SupplierLookup {
  return {
    id: dto.id,
    name: dto.name,
  };
}
