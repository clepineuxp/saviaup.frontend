export interface SupplierDto {
  id: string;
  name: string;
  commercialName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdByUserName: string;
  lastModifiedByUserName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierLookupDto {
  id: string;
  name: string;
}

export interface CreateSupplierPayload {
  name: string;
  commercialName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface UpdateSupplierPayload {
  name: string;
  commercialName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface SetSupplierStatusPayload {
  isActive: boolean;
}

export interface SupplierPageDto {
  items: SupplierDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
