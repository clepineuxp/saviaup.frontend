import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';
import { TOKEN_STORAGE } from '../../core/auth/token-storage';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly tokenStorage = inject(TOKEN_STORAGE);

  createConnection(hubPath: string): HubConnection {
    const baseUrl = this.environment.signalRUrl.replace(/\/$/, '');
    return new HubConnectionBuilder()
      .withUrl(`${baseUrl}/${hubPath.replace(/^\//, '')}`, {
        accessTokenFactory: () => this.tokenStorage.load()?.accessToken ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();
  }
}
