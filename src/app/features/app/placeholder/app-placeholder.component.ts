import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  readonly authenticatedContext = inject(AuthenticatedContextStore);
}
