import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-menu-not-found',
  template: `
    <main class="not-found" role="main">
      <span aria-hidden="true">🍽️</span>
      <h1>Menú no disponible</h1>
      <p>Verifica la dirección del menú e inténtalo nuevamente.</p>
    </main>
  `,
  styles: `
    :host {
      display: grid;
      min-height: 100dvh;
      place-items: center;
      padding: 1.5rem;
    }
    .not-found {
      max-width: 30rem;
      text-align: center;
    }
    span {
      font-size: 3rem;
    }
    h1 {
      margin: 1rem 0 0.5rem;
      color: #17241c;
      font-size: clamp(1.6rem, 5vw, 2.25rem);
    }
    p {
      margin: 0;
      color: #657168;
      line-height: 1.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuNotFoundComponent {}
