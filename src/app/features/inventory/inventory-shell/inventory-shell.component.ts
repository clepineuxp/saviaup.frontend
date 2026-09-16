import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { InventoryStore } from '../data-access/inventory-store.service';
import { INVENTORY_SECTIONS } from '../inventory-permissions';

@Component({
  selector: 'app-inventory-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './inventory-shell.component.html',
  styleUrl: './inventory-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryShellComponent implements OnInit {
  readonly store = inject(InventoryStore);
  readonly visibleSections = computed(() =>
    INVENTORY_SECTIONS.filter((section) => this.store.hasPermission(section.readPermission)),
  );

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.store.ensurePermissions().subscribe({ error: () => undefined });
  }
}
