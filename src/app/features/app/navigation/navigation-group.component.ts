import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
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
        #trigger
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
          #popover
          class="navigation-popover"
          [id]="'navigation-popover-' + section().code"
          role="group"
          [attr.aria-label]="section().name"
          [style.top.px]="popoverPosition()?.top"
          [style.left.px]="popoverPosition()?.left"
          [style.max-height.px]="popoverPosition()?.maxHeight"
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
      overflow-y: auto;
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
        top: auto;
        left: auto;
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
  readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');
  readonly popover = viewChild<ElementRef<HTMLElement>>('popover');
  readonly popoverPosition = signal<{
    readonly top: number;
    readonly left: number;
    readonly maxHeight: number;
  } | null>(null);
  private readonly synchronizePopoverPosition = effect(() => {
    if (!this.open()) {
      this.popoverPosition.set(null);
      return;
    }
    queueMicrotask(() => this.updatePopoverPosition());
  });

  toggle(event: Event): void {
    event.stopPropagation();
    this.toggled.emit();
  }

  @HostListener('window:resize')
  updatePopoverPosition(): void {
    const trigger = this.trigger()?.nativeElement;
    const popover = this.popover()?.nativeElement;
    if (!trigger || !popover || !this.open()) return;

    const margin = 16;
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const triggerBounds = trigger.getBoundingClientRect();
    const popoverWidth = Math.min(popover.offsetWidth || 288, viewportWidth - margin * 2);
    const maxHeight = Math.max(160, viewportHeight - margin * 2);
    const popoverHeight = Math.min(popover.scrollHeight || maxHeight, maxHeight);
    const desktop = viewportWidth >= 768;
    let left = desktop ? triggerBounds.right + gap : triggerBounds.left;
    let top = desktop ? triggerBounds.top : triggerBounds.bottom + gap;

    if (left + popoverWidth > viewportWidth - margin) {
      left = desktop
        ? triggerBounds.left - popoverWidth - gap
        : viewportWidth - popoverWidth - margin;
    }
    left = Math.max(margin, left);
    if (top + popoverHeight > viewportHeight - margin) {
      top = viewportHeight - popoverHeight - margin;
    }
    top = Math.max(margin, top);

    this.popoverPosition.set({ top, left, maxHeight });
  }
}
