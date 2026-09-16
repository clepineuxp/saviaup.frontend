import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { AuthenticatedContextRepository } from '../../../core/context/authenticated-context.repository';
import {
  AvailableModulesResponse,
  UserInfo,
} from '../../../core/context/authenticated-context.model';
import { SupportedLanguage } from '../../../shared/i18n/translation.types';

@Injectable()
export class MockAuthenticatedContextRepository implements AuthenticatedContextRepository {
  userInfo(): Observable<UserInfo> {
    return of({
      firstName: 'Camila',
      lastName: 'Torres',
      organization: { id: 'tenant-secret-garden', name: 'Secret Garden' },
      role: { id: 'role-owner', code: 'TENANT_OWNER', name: 'Owner' },
    }).pipe(delay(300));
  }

  availableModules(language: SupportedLanguage): Observable<AvailableModulesResponse> {
    const copy =
      language === 'en'
        ? {
            sales: 'Sales',
            operation: 'Operation',
            orders: 'Orders',
            tables: 'Tables',
            reports: 'Reports',
          }
        : {
            sales: 'Ventas',
            operation: 'Operación',
            orders: 'Pedidos',
            tables: 'Mesas',
            reports: 'Reportes',
          };

    return of({
      sections: [
        {
          code: 'sales',
          name: copy.sales,
          order: 1,
          isGrouped: false,
          modules: [{ id: 'module-tables', code: 'tables', name: copy.tables, order: 1 }],
          options: [],
        },
        {
          code: 'operation',
          name: copy.operation,
          order: 2,
          isGrouped: true,
          modules: [
            { id: 'module-orders', code: 'orders', name: copy.orders, order: 1 },
            { id: 'module-reports', code: 'reports', name: copy.reports, order: 2 },
          ],
          options: [],
        },
      ],
      emptyStateMessage: null,
    }).pipe(delay(350));
  }
}
