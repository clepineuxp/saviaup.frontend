import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';
import { firstValueFrom } from 'rxjs';
import { AuthRefreshCoordinator } from '../../core/auth/auth-refresh-coordinator.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly refresh = inject(AuthRefreshCoordinator);

  createConnection(hubPath: string): HubConnection {
    const baseUrl = this.environment.signalRUrl.replace(/\/$/, '');
    return new HubConnectionBuilder()
      .withUrl(`${baseUrl}/${hubPath.replace(/^\//, '')}`, {
        accessTokenFactory: async () =>
          (await firstValueFrom(this.refresh.ensureFreshTokens()))?.accessToken ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();
  }
}
