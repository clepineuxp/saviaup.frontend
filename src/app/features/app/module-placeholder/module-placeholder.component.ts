import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthenticatedContextStore } from '../../../core/context/authenticated-context.store';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import {
  createSectionNavigation,
  MODULE_ICON_GLYPHS,
} from '../navigation/module-navigation.config';

@Component({
  selector: 'app-module-placeholder',
  imports: [TranslatePipe],
  templateUrl: './module-placeholder.component.html',
  styleUrl: './module-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly authenticatedContext = inject(AuthenticatedContextStore);
  readonly moduleCode = this.readModuleCode();
  readonly entry = computed(() =>
    createSectionNavigation(this.authenticatedContext.sections())
      .flatMap((section) => section.items)
      .find((item) => item.code === this.moduleCode || item.moduleCode === this.moduleCode),
  );
  readonly icon = computed(() => {
    const entry = this.entry();
    return entry ? MODULE_ICON_GLYPHS[entry.icon] : '◫';
  });

  private readModuleCode(): string {
    const routeCode = this.route.snapshot.data['moduleCode'];
    return typeof routeCode === 'string'
      ? routeCode
      : (this.route.snapshot.paramMap.get('code') ?? '').trim().toLowerCase();
  }
}
