import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryStore } from '../data-access/inventory-store.service';
import { INVENTORY_SECTIONS } from '../inventory-permissions';

@Component({
  selector: 'app-inventory-landing',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryLandingComponent implements OnInit {
  private readonly store = inject(InventoryStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.ensurePermissions().subscribe({
      next: () => {
        const first = INVENTORY_SECTIONS.find((section) =>
          this.store.hasPermission(section.readPermission),
        );
        if (first) void this.router.navigateByUrl(first.route, { replaceUrl: true });
      },
      error: () => undefined,
    });
  }
}
