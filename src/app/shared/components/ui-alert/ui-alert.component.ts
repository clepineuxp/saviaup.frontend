import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-alert',
  template: `
    <div class="alert" [class.alert--success]="type() === 'success'" role="status">
      <span class="alert__icon" aria-hidden="true">{{ type() === 'success' ? '✓' : '!' }}</span>
      <span>{{ message() }}</span>
    </div>
  `,
  styles: `
    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.7rem;
      border: 1px solid #f1c6c1;
      border-radius: 0.85rem;
      padding: 0.78rem 0.85rem;
      background: #fff5f4;
      color: #8e332c;
      font-size: 0.86rem;
      line-height: 1.45;
    }
    .alert--success {
      border-color: #b8ddc5;
      background: #f0faf3;
      color: #26683e;
    }
    .alert__icon {
      display: grid;
      flex: 0 0 auto;
      width: 1.25rem;
      height: 1.25rem;
      place-items: center;
      border-radius: 999px;
      background: currentColor;
      color: white;
      font-size: 0.72rem;
      font-weight: 800;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiAlertComponent {
  readonly message = input.required<string>();
  readonly type = input<'error' | 'success'>('error');
}
