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

  getDashboard(period: StatisticsPeriod, includeTips: boolean): Observable<StatisticsDashboardData> {
    const params = new HttpParams()
      .set('period', period)
      .set('includeTips', includeTips.toString());

    return this.api.get<StatisticsDashboardData>('/api/statistics', { params });
  }
}
