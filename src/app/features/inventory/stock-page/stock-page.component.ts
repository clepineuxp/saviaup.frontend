import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { InventoryStore } from '../data-access/inventory-store.service';
import { InventoryQuery } from '../models/inventory.model';
import { InventoryPaginationComponent } from '../shared/inventory-pagination.component';

@Component({
  selector: 'app-stock-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    InventoryPaginationComponent,
    UiAlertComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './stock-page.component.html',
  styleUrl: './stock-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockPageComponent implements OnInit {
  readonly store = inject(InventoryStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly filters = this.formBuilder.nonNullable.group({
    search: [''],
    belowMinimum: ['' as '' | 'true' | 'false'],
  });

  ngOnInit(): void {
    this.load(1);
  }

  applyFilters(): void {
    this.load(1);
  }

  changePage(page: number): void {
    this.load(page);
  }

  retry(): void {
    this.load(this.store.stockPage().page);
  }

  private load(page: number): void {
    const value = this.filters.getRawValue();
    const query: InventoryQuery = {
      page,
      pageSize: 20,
      search: value.search.trim() || null,
      belowMinimum: value.belowMinimum === '' ? null : value.belowMinimum === 'true',
    };
    this.store
      .loadStock(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
