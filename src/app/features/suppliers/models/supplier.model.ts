export interface Supplier {
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

export interface SupplierLookup {
  id: string;
  name: string;
}
