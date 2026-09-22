import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TableSalesCatalogCache } from '../data-access/table-sales-catalog-cache.service';

@Component({
  selector: 'app-sales-catalog-sync-modal',
  imports: [TranslatePipe],
  templateUrl: './sales-catalog-sync-modal.component.html',
  styleUrl: './sales-catalog-sync-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesCatalogSyncModalComponent {
  readonly catalog = inject(TableSalesCatalogCache);
}
