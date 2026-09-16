import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  template: `
    <button
      class="button"
      [class.button--secondary]="variant() === 'secondary'"
      [class.button--ghost]="variant() === 'ghost'"
      [class.button--wide]="wide()"
      [attr.type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading()"
    >
      @if (loading()) {
        <span class="spinner" aria-hidden="true"></span>
      }
      <span [class.visually-muted]="loading()"><ng-content /></span>
    </button>
  `,
  styleUrl: './ui-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiButtonComponent {
  readonly type = input<'button' | 'submit'>('button');
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('primary');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly wide = input(false);
}
