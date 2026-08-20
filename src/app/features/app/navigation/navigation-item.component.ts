import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MODULE_ICON_GLYPHS, ModuleNavigationItem } from './module-navigation.config';

@Component({
  selector: 'app-navigation-item',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a
      class="module-link"
      [routerLink]="item().route"
      routerLinkActive="module-link--active"
      (click)="activated.emit()"
    >
      <span class="module-link__icon" aria-hidden="true">{{ iconGlyph() }}</span>
      <span>{{ item().name }}</span>
    </a>
  `,
  styles: `
    :host {
      display: block;
      flex: 0 0 auto;
    }
    .module-link {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      gap: 0.6rem;
      border-radius: 0.78rem;
      padding: 0.6rem 0.8rem;
      color: var(--color-muted);
      font-size: 0.82rem;
      font-weight: 680;
      text-decoration: none;
    }
    .module-link:hover,
    .module-link--active {
      background: var(--color-savia-50);
      color: var(--color-savia-700);
    }
    .module-link__icon {
      display: grid;
      width: 1.65rem;
      height: 1.65rem;
      place-items: center;
      border-radius: 0.5rem;
      background: var(--color-savia-100);
      font-size: 0.85rem;
    }
    @media (min-width: 768px) {
      :host,
      .module-link {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationItemComponent {
  readonly item = input.required<ModuleNavigationItem>();
  readonly activated = output<void>();

  iconGlyph(): string {
    return MODULE_ICON_GLYPHS[this.item().icon];
  }
}
