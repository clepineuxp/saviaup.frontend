import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SectionNavigationItem } from './module-navigation.config';
import { NavigationGroupComponent } from './navigation-group.component';
import { NavigationItemComponent } from './navigation-item.component';

@Component({
  selector: 'app-navigation-rail',
  imports: [NavigationGroupComponent, NavigationItemComponent, TranslatePipe],
  template: `
    <div class="navigation-rail" [class.navigation-rail--scrollable]="hasOverflow()">
      @if (hasOverflow()) {
        <button
          class="navigation-scroll navigation-scroll--left"
          type="button"
          [disabled]="!canScrollLeft()"
          [attr.aria-label]="'app.navigation.scrollLeft' | translate"
          (click)="scroll(-1)"
        >
          <span aria-hidden="true">‹</span>
        </button>
      }
      <nav
        #navigationScroller
        class="module-navigation"
        [attr.aria-label]="'app.navigation.label' | translate"
        (scroll)="handleNavigationScroll()"
      >
        @for (section of sections(); track section.code) {
          @if (section.isGrouped) {
            <app-navigation-group
              [section]="section"
              [open]="openSectionCode() === section.code"
              (toggled)="toggleGroup(section.code)"
              (dismissed)="closeGroup()"
            />
          } @else {
            @for (item of section.items; track item.kind + ':' + item.code) {
              <app-navigation-item [item]="item" />
            }
          }
        }
      </nav>
      @if (hasOverflow()) {
        <button
          class="navigation-scroll navigation-scroll--right"
          type="button"
          [disabled]="!canScrollRight()"
          [attr.aria-label]="'app.navigation.scrollRight' | translate"
          (click)="scroll(1)"
        >
          <span aria-hidden="true">›</span>
        </button>
      }
    </div>
  `,
  styles: `
    :host,
    .navigation-rail {
      position: relative;
      display: block;
      min-width: 0;
    }
    .module-navigation {
      display: flex;
      flex-wrap: nowrap;
      align-items: start;
      gap: 0.45rem;
      overflow-x: auto;
      scroll-behavior: smooth;
      scrollbar-width: none;
    }
    .module-navigation::-webkit-scrollbar {
      display: none;
    }
    .navigation-rail--scrollable .module-navigation {
      padding-inline: 2.35rem;
    }
    .navigation-scroll {
      position: absolute;
      z-index: 20;
      top: 0;
      display: grid;
      width: 2.2rem;
      height: 2.75rem;
      place-items: center;
      border: 0;
      padding: 0;
      color: var(--color-savia-700);
      font-size: 1.35rem;
      font-weight: 800;
      cursor: pointer;
    }
    .navigation-scroll--left {
      left: 0;
      border-radius: 0 0.75rem 0.75rem 0;
      background: linear-gradient(90deg, var(--color-surface) 62%, rgb(255 255 255 / 25%));
      box-shadow: 0.55rem 0 1rem rgb(38 70 43 / 18%);
    }
    .navigation-scroll--right {
      right: 0;
      border-radius: 0.75rem 0 0 0.75rem;
      background: linear-gradient(270deg, var(--color-surface) 62%, rgb(255 255 255 / 25%));
      box-shadow: -0.55rem 0 1rem rgb(38 70 43 / 18%);
    }
    .navigation-scroll:disabled {
      opacity: 0.45;
      cursor: default;
    }
    @media (min-width: 768px) {
      :host,
      .navigation-rail {
        height: 100%;
      }
      .module-navigation {
        display: grid;
        max-height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        padding-inline: 0;
        padding-right: 0.3rem;
        scrollbar-color: var(--color-border-strong) transparent;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
      }
      .navigation-scroll {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationRailComponent {
  readonly sections = input.required<readonly SectionNavigationItem[]>();
  readonly navigationScroller = viewChild<ElementRef<HTMLElement>>('navigationScroller');
  readonly openSectionCode = signal<string | null>(null);
  readonly hasOverflow = signal(false);
  readonly canScrollLeft = signal(false);
  readonly canScrollRight = signal(false);
  private readonly synchronizeScrollState = effect(() => {
    this.sections();
    queueMicrotask(() => this.updateScrollState());
  });

  toggleGroup(sectionCode: string): void {
    this.openSectionCode.update((current) => (current === sectionCode ? null : sectionCode));
  }

  closeGroup(): void {
    this.openSectionCode.set(null);
  }

  scroll(direction: -1 | 1): void {
    const scroller = this.navigationScroller()?.nativeElement;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * Math.max(160, scroller.clientWidth * 0.7),
      behavior: 'smooth',
    });
  }

  updateScrollState(): void {
    const scroller = this.navigationScroller()?.nativeElement;
    if (!scroller) return this.resetScrollState();

    const maximumScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    this.hasOverflow.set(maximumScroll > 1);
    this.canScrollLeft.set(scroller.scrollLeft > 1);
    this.canScrollRight.set(scroller.scrollLeft < maximumScroll - 1);
  }

  handleNavigationScroll(): void {
    this.updateScrollState();
    this.closeGroup();
  }

  @HostListener('document:click')
  @HostListener('window:scroll')
  closeOnOutsideInteraction(): void {
    this.closeGroup();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeGroup();
  }

  @HostListener('window:resize')
  updateOnResize(): void {
    this.updateScrollState();
  }

  private resetScrollState(): void {
    this.hasOverflow.set(false);
    this.canScrollLeft.set(false);
    this.canScrollRight.set(false);
  }
}
