import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/api/api-client.service';
import { StatisticsDashboardData, StatisticsPeriod } from '../models/statistics.model';

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  private readonly api = inject(ApiClient);

  getDashboard(
    period: StatisticsPeriod,
    includeTips: boolean,
    fromDate?: string,
    toDate?: string,
  ): Observable<StatisticsDashboardData> {
    let params = new HttpParams()
      .set('period', period)
      .set('includeTips', includeTips.toString());

    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);

    return this.api.get<StatisticsDashboardData>('/api/statistics', { params });
  }
}
