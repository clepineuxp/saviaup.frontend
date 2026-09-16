import { inject, Pipe, PipeTransform } from '@angular/core';
import { LocalizationService } from '../i18n/localization.service';

@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly localization = inject(LocalizationService);

  transform(key: string, variables?: Readonly<Record<string, string | number>>): string {
    this.localization.language();
    return this.localization.translate(key, variables);
  }
}
