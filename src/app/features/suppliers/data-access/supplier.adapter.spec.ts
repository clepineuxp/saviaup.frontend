import { describe, expect, it } from 'vitest';
import { mapSupplierLookupDtoToModel } from './supplier.adapter';

describe('supplier adapter', () => {
  it('preserves the commercial name in lookup results', () => {
    expect(
      mapSupplierLookupDtoToModel({
        id: 'supplier-1',
        name: 'Distribuciones Norte SAS',
        commercialName: 'Mercado Verde',
      }),
    ).toEqual({
      id: 'supplier-1',
      name: 'Distribuciones Norte SAS',
      commercialName: 'Mercado Verde',
    });
  });
});
