import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-placeholder',
  imports: [TranslatePipe],
  templateUrl: './app-placeholder.component.html',
  styleUrl: './app-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPlaceholderComponent {
  private readonly router = inject(Router);
  readonly authenticatedContext = inject(AuthenticatedContextStore);

  constructor() {
    effect(() => {
      if (this.authenticatedContext?.ready?.() && this.authenticatedContext?.hasTablesModule?.()) {
        void this.router.navigate(['/app/sell/tables']);
      }
    });
  }
}
