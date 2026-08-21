import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProductFeatureError } from '../data-access/product-store.service';

@Component({
  selector: 'app-product-delete-dialog',
  imports: [UiAlertComponent, UiButtonComponent, TranslatePipe],
  template: `
    <div class="backdrop">
      <button
        class="backdrop__close"
        type="button"
        tabindex="-1"
        [attr.aria-label]="'common.cancel' | translate"
        (click)="cancel()"
      ></button>
      <section role="alertdialog" aria-modal="true" aria-labelledby="product-delete-title">
        <span class="icon" aria-hidden="true">!</span>
        <h2 id="product-delete-title">{{ 'products.delete.title' | translate }}</h2>
        <p>{{ 'products.delete.description' | translate: { name: productName() } }}</p>
        <small>{{ 'products.delete.warning' | translate }}</small>
        @if (error(); as operationError) {
          <app-ui-alert [message]="operationError.message" />
        }
        <footer>
          <app-ui-button
            type="button"
            variant="secondary"
            [disabled]="submitting()"
            (click)="cancel()"
          >
            {{ 'common.cancel' | translate }}
          </app-ui-button>
          <button class="danger" type="button" [disabled]="submitting()" (click)="confirmed.emit()">
            {{ 'products.delete.confirm' | translate }}
          </button>
        </footer>
      </section>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      z-index: 50;
      inset: 0;
    }
    .backdrop {
      display: grid;
      width: 100%;
      height: 100%;
      place-items: center;
      padding: 1rem;
      background: rgb(20 54 34 / 50%);
      backdrop-filter: blur(5px);
    }
    .backdrop__close {
      position: fixed;
      inset: 0;
      border: 0;
      background: transparent;
    }
    section {
      position: relative;
      z-index: 1;
      display: grid;
      width: min(100%, 29rem);
      gap: 0.7rem;
      border-radius: 1.2rem;
      padding: 1.5rem;
      background: white;
      box-shadow: 0 32px 90px rgb(10 34 20 / 30%);
    }
    .icon {
      display: grid;
      width: 2.7rem;
      height: 2.7rem;
      place-items: center;
      border-radius: 0.85rem;
      background: #fff0ee;
      color: #a44037;
      font-weight: 850;
    }
    h2 {
      margin: 0.2rem 0 0;
      font-size: 1.25rem;
    }
    p,
    small {
      margin: 0;
      color: var(--color-muted);
      line-height: 1.5;
    }
    p {
      font-size: 0.86rem;
    }
    small {
      font-size: 0.74rem;
    }
    footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 0.6rem;
    }
    .danger {
      min-height: 3rem;
      border: 0;
      border-radius: 0.86rem;
      padding: 0.7rem 1rem;
      background: #a44037;
      color: white;
      font-weight: 720;
      cursor: pointer;
    }
    .danger:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDeleteDialogComponent {
  readonly productName = input.required<string>();
  readonly submitting = input(false);
  readonly error = input<ProductFeatureError | null>(null);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  cancel(): void {
    if (!this.submitting()) this.cancelled.emit();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.cancel();
  }
}
