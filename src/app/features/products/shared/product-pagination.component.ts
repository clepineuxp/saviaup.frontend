import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-product-pagination',
  imports: [TranslatePipe],
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" [attr.aria-label]="'products.pagination.label' | translate">
        <button type="button" [disabled]="page() <= 1" (click)="pageChanged.emit(page() - 1)">
          ‹ <span>{{ 'products.pagination.previous' | translate }}</span>
        </button>
        <p>
          {{
            'products.pagination.summary'
              | translate: { page: page(), totalPages: totalPages(), total: totalCount() }
          }}
        </p>
        <button
          type="button"
          [disabled]="page() >= totalPages()"
          (click)="pageChanged.emit(page() + 1)"
        >
          <span>{{ 'products.pagination.next' | translate }}</span> ›
        </button>
      </nav>
    }
  `,
  styles: `
    .pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding-top: 0.4rem;
    }
    .pagination button {
      display: inline-flex;
      min-height: 2.6rem;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid var(--color-border-strong);
      border-radius: 0.75rem;
      padding: 0.55rem 0.8rem;
      background: var(--color-surface);
      color: var(--color-savia-700);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
    }
    .pagination button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .pagination p {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly pageChanged = output<number>();
}
