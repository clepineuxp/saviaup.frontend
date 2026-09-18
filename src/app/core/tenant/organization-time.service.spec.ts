import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TenantContext } from './tenant-context.service';
import { OrganizationTime } from './organization-time.service';
import { OrganizationDatePipe } from '../../shared/pipes/organization-date.pipe';

describe('OrganizationTime', () => {
  let time: OrganizationTime;
  let tenant: TenantContext;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    tenant = TestBed.inject(TenantContext);
    tenant.select({ id: 'colombia', name: 'Restaurant', timeZoneId: 'America/Bogota' });
    time = TestBed.inject(OrganizationTime);
  });

  it('shows the restaurant day even when the device calendar differs', () => {
    const instant = '2026-09-19T03:30:00Z';
    expect(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', day: '2-digit' }).format(
        new Date(instant),
      ),
    ).toBe('19');
    expect(time.localDate(instant)).toBe('2026-09-18');
    expect(time.format(instant, 'dd/MM/yyyy HH:mm')).toBe('18/09/2026 22:30');
  });

  it('changes offset with daylight saving time rather than using a fixed offset', () => {
    tenant.select({ id: 'ny', name: 'New York', timeZoneId: 'America/New_York' });
    expect(time.format('2026-01-15T13:00:00Z', 'HH:mm')).toBe('08:00');
    expect(time.format('2026-07-15T13:00:00Z', 'HH:mm')).toBe('09:00');
    expect(time.format('2026-03-08T06:59:59Z', 'HH:mm')).toBe('01:59');
    expect(time.format('2026-03-08T07:00:00Z', 'HH:mm')).toBe('03:00');
  });

  it('never shifts a commercial date and refreshes the pipe after changing organization', () => {
    expect(time.format('2026-09-18', 'dd/MM/yyyy')).toBe('18/09/2026');
    const pipe = TestBed.runInInjectionContext(() => new OrganizationDatePipe());
    expect(pipe.transform('2026-09-19T03:30:00Z', 'HH:mm')).toBe('22:30');
    tenant.select({ id: 'madrid', name: 'Madrid', timeZoneId: 'Europe/Madrid' });
    expect(pipe.transform('2026-09-19T03:30:00Z', 'HH:mm')).toBe('05:30');
    expect(time.format('2026-09-18', 'dd/MM/yyyy')).toBe('18/09/2026');
  });
});
