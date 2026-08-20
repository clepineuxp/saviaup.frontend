import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly environment = inject(APP_ENVIRONMENT);

  createConnection(hubPath: string): HubConnection {
    const baseUrl = this.environment.signalRUrl.replace(/\/$/, '');
    return new HubConnectionBuilder().withUrl(`${baseUrl}/${hubPath.replace(/^\//, '')}`).build();
  }
}
