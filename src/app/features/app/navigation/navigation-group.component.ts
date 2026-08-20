import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SectionNavigationItem } from './module-navigation.config';
import { NavigationItemComponent } from './navigation-item.component';

@Component({
  selector: 'app-navigation-group',
  imports: [NavigationItemComponent],
  template: `
    <section
      class="navigation-group"
      [class.navigation-group--open]="open()"
      [attr.data-section-code]="section().code"
    >
      <button
        class="navigation-group__trigger"
        type="button"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="'navigation-popover-' + section().code"
        (click)="toggle($event)"
      >
        <span>{{ section().name }}</span>
      </button>
      @if (open()) {
        <div
          class="navigation-popover"
          [id]="'navigation-popover-' + section().code"
          role="group"
          [attr.aria-label]="section().name"
        >
          @for (item of section().items; track item.kind + ':' + item.code) {
            <app-navigation-item [item]="item" (activated)="dismissed.emit()" />
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host,
    .navigation-group {
      position: relative;
      display: block;
      flex: 0 0 auto;
    }
    .navigation-group__trigger {
      display: flex;
      width: max-content;
      min-height: 2.75rem;
      align-items: center;
      justify-content: flex-start;
      border: 1px solid transparent;
      border-radius: 0.78rem;
      padding: 0.6rem 0.8rem;
      background: transparent;
      color: var(--color-muted);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 750;
      cursor: pointer;
    }
    .navigation-group__trigger:hover,
    .navigation-group--open .navigation-group__trigger {
      border-color: var(--color-border);
      background: var(--color-savia-50);
      color: var(--color-savia-700);
    }
    .navigation-popover {
      position: fixed;
      z-index: 30;
      top: 8.45rem;
      left: 1rem;
      display: grid;
      width: min(18rem, calc(100vw - 2rem));
      gap: 0.3rem;
      border: 1px solid var(--color-border-strong);
      border-radius: 1rem;
      padding: 0.65rem;
      background: var(--color-surface);
      box-shadow: 0 1rem 2.5rem rgb(31 54 35 / 18%);
      animation: reveal-popover 160ms ease-out;
    }
    @keyframes reveal-popover {
      from {
        opacity: 0;
        transform: translateY(-0.35rem) scale(0.98);
      }
    }
    @media (min-width: 768px) {
      :host,
      .navigation-group,
      .navigation-group__trigger {
        width: 100%;
      }
      .navigation-popover {
        position: absolute;
        top: 0;
        left: calc(100% + 0.65rem);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationGroupComponent {
  readonly section = input.required<SectionNavigationItem>();
  readonly open = input(false);
  readonly toggled = output<void>();
  readonly dismissed = output<void>();

  toggle(event: Event): void {
    event.stopPropagation();
    this.toggled.emit();
  }
}
