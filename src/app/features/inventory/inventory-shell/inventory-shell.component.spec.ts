import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { InventoryStore } from '../data-access/inventory-store.service';
import { InventoryPermission } from '../inventory-permissions';
import { InventoryShellComponent } from './inventory-shell.component';

describe('InventoryShellComponent', () => {
  const permissions = signal<ReadonlySet<string>>(new Set());
  let fixture: ComponentFixture<InventoryShellComponent>;

  beforeEach(async () => {
    permissions.set(new Set());
    await TestBed.configureTestingModule({
      imports: [InventoryShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: InventoryStore,
          useValue: {
            permissionsLoading: signal(false).asReadonly(),
            permissionsStatus: signal('success').asReadonly(),
            permissionsError: signal(null).asReadonly(),
            ensurePermissions: () => of([]),
            hasPermission: (permission: InventoryPermission) => permissions().has(permission),
          },
        },
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InventoryShellComponent);
  });

  it('shows each section only with its independent read permission', () => {
    permissions.set(
      new Set([
        'inventory.stock.read',
        'inventory.ingredients.read',
        'inventory.complements.manage',
      ]),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleSections().map((section) => section.code)).toEqual([
      'stock',
      'ingredients',
    ]);

    permissions.set(
      new Set([
        'inventory.stock.read',
        'inventory.ingredients.read',
        'inventory.movements.read',
        'inventory.complements.read',
      ]),
    );

    expect(fixture.componentInstance.visibleSections().map((section) => section.code)).toEqual([
      'stock',
      'ingredients',
      'movements',
      'complements',
    ]);
  });
});
