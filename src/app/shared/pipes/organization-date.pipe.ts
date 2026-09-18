import { Pipe, PipeTransform, inject } from '@angular/core';
import { OrganizationTime } from '../../core/tenant/organization-time.service';

@Pipe({ name: 'organizationDate', pure: false })
export class OrganizationDatePipe implements PipeTransform {
  private readonly time = inject(OrganizationTime);
  private key = '';
  private formatted = '';

  transform(value: string | number | Date | null | undefined, pattern = 'mediumDate'): string {
    if (value === null || value === undefined || value === '') return '';
    const key = `${value}|${pattern}|${this.time.timeZoneId()}`;
    if (key !== this.key) {
      this.formatted = this.time.format(value, pattern);
      this.key = key;
    }
    return this.formatted;
  }
}
