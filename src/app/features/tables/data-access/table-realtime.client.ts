import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { RealtimeService } from '../../../shared/realtime/realtime.service';
import { TableOrderUpdatedEvent, TableStatusChangedEvent } from '../models/table.model';

export type TableRealtimeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface TableSalesDataInvalidatedEvent {
  readonly resources: readonly ('products' | 'categories' | 'tables')[];
  readonly occurredAt: string;
}

@Injectable({ providedIn: 'root' })
export class TableRealtimeClient {
  private readonly realtime = inject(RealtimeService);
  private readonly document = inject(DOCUMENT);
  private connection: HubConnection | null = null;
  private connectRequest: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldBeConnected = false;
  private lifecycleListenersAttached = false;
  private hasConnected = false;
  private resyncOnNextConnect = false;
  private readonly statusChangesSubject = new Subject<TableStatusChangedEvent>();
  private readonly orderUpdatesSubject = new Subject<TableOrderUpdatedEvent>();
  private readonly salesDataInvalidationsSubject = new Subject<TableSalesDataInvalidatedEvent>();
  private readonly resyncRequiredSubject = new Subject<void>();
  private readonly stateSignal = signal<TableRealtimeState>('disconnected');

  readonly statusChanges$ = this.statusChangesSubject.asObservable();
  readonly orderUpdates$ = this.orderUpdatesSubject.asObservable();
  readonly salesDataInvalidations$ = this.salesDataInvalidationsSubject.asObservable();
  readonly resyncRequired$ = this.resyncRequiredSubject.asObservable();
  readonly state = this.stateSignal.asReadonly();

  async connect(): Promise<void> {
    this.shouldBeConnected = true;
    this.attachLifecycleListeners();
    if (
      this.connection?.state === HubConnectionState.Connected ||
      this.connection?.state === HubConnectionState.Reconnecting
    )
      return;
    if (this.connectRequest) return this.connectRequest;

    const connection = this.connection ?? this.createConnection();
    this.connectRequest = this.start(connection);
    return this.connectRequest;
  }

  async verifyConnection(): Promise<boolean> {
    if (this.isConnected()) return true;
    if (this.connection?.state === HubConnectionState.Reconnecting) return false;
    await this.connect();
    return this.isConnected();
  }

  async disconnect(): Promise<void> {
    this.shouldBeConnected = false;
    this.detachLifecycleListeners();
    this.clearReconnectTimer();
    const connection = this.connection;
    this.connection = null;
    this.connectRequest = null;
    this.hasConnected = false;
    this.resyncOnNextConnect = false;
    if (connection) await connection.stop();
    this.stateSignal.set('disconnected');
  }

  private createConnection(): HubConnection {
    const connection = this.realtime.createConnection('tables');
    this.connection = connection;
    connection.on('OnTableStatusChanged', (event: TableStatusChangedEvent) =>
      this.statusChangesSubject.next(event),
    );
    connection.on('OnTableOrderUpdated', (event: TableOrderUpdatedEvent) =>
      this.orderUpdatesSubject.next(event),
    );
    connection.on('OnTableSalesDataInvalidated', (event: TableSalesDataInvalidatedEvent) =>
      this.salesDataInvalidationsSubject.next(event),
    );
    connection.onreconnecting(() => this.stateSignal.set('reconnecting'));
    connection.onreconnected(() => {
      if (this.connection !== connection || !this.shouldBeConnected) return;
      this.stateSignal.set('connected');
      this.resyncRequiredSubject.next();
    });
    connection.onclose(() => {
      if (this.connection !== connection) return;
      this.stateSignal.set('disconnected');
      if (this.shouldBeConnected) this.scheduleReconnect();
    });
    return connection;
  }

  private async start(connection: HubConnection): Promise<void> {
    this.stateSignal.set('connecting');
    try {
      await connection.start();
      if (this.connection !== connection || !this.shouldBeConnected) {
        await connection.stop();
        return;
      }
      this.clearReconnectTimer();
      this.stateSignal.set('connected');
      if (this.hasConnected || this.resyncOnNextConnect) this.resyncRequiredSubject.next();
      this.hasConnected = true;
      this.resyncOnNextConnect = false;
    } catch (error: unknown) {
      if (this.connection === connection) {
        this.stateSignal.set('disconnected');
        this.resyncOnNextConnect = true;
        if (this.shouldBeConnected) this.scheduleReconnect();
      }
      throw error;
    } finally {
      if (this.connectRequest) this.connectRequest = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.shouldBeConnected) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch(() => undefined);
    }, 5000);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  private readonly handleWake = (): void => {
    const window = this.document.defaultView;
    if (
      !window ||
      !this.shouldBeConnected ||
      this.document.visibilityState !== 'visible' ||
      !window.navigator.onLine
    )
      return;

    if (this.connection?.state === HubConnectionState.Connected) {
      this.resyncRequiredSubject.next();
      return;
    }
    if (this.connection?.state === HubConnectionState.Reconnecting) return;
    this.resyncOnNextConnect = true;
    void this.connect().catch(() => undefined);
  };

  private attachLifecycleListeners(): void {
    const window = this.document.defaultView;
    if (!window || this.lifecycleListenersAttached) return;
    this.lifecycleListenersAttached = true;
    this.document.addEventListener('visibilitychange', this.handleWake);
    window.addEventListener('focus', this.handleWake);
    window.addEventListener('pageshow', this.handleWake);
    window.addEventListener('online', this.handleWake);
  }

  private detachLifecycleListeners(): void {
    const window = this.document.defaultView;
    if (!window || !this.lifecycleListenersAttached) return;
    this.lifecycleListenersAttached = false;
    this.document.removeEventListener('visibilitychange', this.handleWake);
    window.removeEventListener('focus', this.handleWake);
    window.removeEventListener('pageshow', this.handleWake);
    window.removeEventListener('online', this.handleWake);
  }
}
