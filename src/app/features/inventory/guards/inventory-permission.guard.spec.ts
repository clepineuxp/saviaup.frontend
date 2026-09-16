import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { InventoryStore } from '../data-access/inventory-store.service';
import { InventoryPermission } from '../inventory-permissions';
import { inventoryPermissionGuard } from './inventory-permission.guard';

describe('inventoryPermissionGuard', () => {
  const permissions = new Set<InventoryPermission>();

  beforeEach(() => {
    permissions.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: InventoryStore,
          useValue: {
            ensurePermissions: () => of([]),
            hasPermission: (permission: InventoryPermission) => permissions.has(permission),
          },
        },
      ],
    });
  });

  const execute = (permission: InventoryPermission) =>
    TestBed.runInInjectionContext(() =>
      inventoryPermissionGuard(permission)({} as never, {} as never),
    );

  it('allows only the exact read permission', async () => {
    permissions.add('inventory.ingredients.read');

    await expect(firstValueFrom(execute('inventory.ingredients.read') as never)).resolves.toBe(
      true,
    );
    expect(await firstValueFrom(execute('inventory.movements.read') as never)).toBeInstanceOf(
      UrlTree,
    );
  });

  it('does not infer read access from manage', async () => {
    permissions.add('inventory.complements.manage');

    const result = await firstValueFrom(execute('inventory.complements.read') as never);

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toContain(
      'denied=inventory.complements.read',
    );
  });
});
