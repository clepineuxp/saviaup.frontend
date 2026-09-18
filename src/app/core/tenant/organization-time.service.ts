import { formatDate } from '@angular/common';
import { Injectable, LOCALE_ID, computed, inject } from '@angular/core';
import { TenantContext } from './tenant-context.service';

@Injectable({ providedIn: 'root' })
export class OrganizationTime {
  private readonly tenant = inject(TenantContext);
  private readonly locale = inject(LOCALE_ID);
  readonly timeZoneId = computed(() => this.tenant.activeTenant()?.timeZoneId ?? 'America/Bogota');
  private readonly formatters = new Map<string, Intl.DateTimeFormat>();

  localDate(value: string | number | Date = Date.now()): string {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parts = this.formatter().formatToParts(new Date(value));
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  format(value: string | number | Date, pattern: string): string {
    // A business date is not an instant. Never shift its calendar day.
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return formatDate(`${value}T00:00:00Z`, pattern, this.locale, '+0000');
    }
    const instant = new Date(value);
    const name = this.formatter()
      .formatToParts(instant)
      .find((p) => p.type === 'timeZoneName')?.value;
    const offset = name === 'GMT' ? '+0000' : name?.replace('GMT', '').replace(':', '');
    if (!offset) throw new Error('Unable to resolve organization time zone');
    return formatDate(instant, pattern, this.locale, offset);
  }

  private formatter(): Intl.DateTimeFormat {
    const zone = this.timeZoneId();
    let formatter = this.formatters.get(zone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZoneName: 'longOffset',
      });
      this.formatters.set(zone, formatter);
    }
    return formatter;
  }
}
