import { inject, Injectable, signal } from '@angular/core';
import { HubConnection } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { RealtimeService } from '../../../shared/realtime/realtime.service';
import { TableOrderUpdatedEvent, TableStatusChangedEvent } from '../models/table.model';

export type TableRealtimeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

@Injectable()
export class TableRealtimeClient {
  private readonly realtime = inject(RealtimeService);
  private connection: HubConnection | null = null;
  private readonly statusChangesSubject = new Subject<TableStatusChangedEvent>();
  private readonly orderUpdatesSubject = new Subject<TableOrderUpdatedEvent>();
  private readonly stateSignal = signal<TableRealtimeState>('disconnected');

  readonly statusChanges$ = this.statusChangesSubject.asObservable();
  readonly orderUpdates$ = this.orderUpdatesSubject.asObservable();
  readonly state = this.stateSignal.asReadonly();

  async connect(): Promise<void> {
    if (this.connection) return;
    const connection = this.realtime.createConnection('tables');
    this.connection = connection;
    connection.on('OnTableStatusChanged', (event: TableStatusChangedEvent) =>
      this.statusChangesSubject.next(event),
    );
    connection.on('OnTableOrderUpdated', (event: TableOrderUpdatedEvent) =>
      this.orderUpdatesSubject.next(event),
    );
    connection.onreconnecting(() => this.stateSignal.set('reconnecting'));
    connection.onreconnected(() => this.stateSignal.set('connected'));
    connection.onclose(() => {
      this.stateSignal.set('disconnected');
      this.connection = null;
    });
    this.stateSignal.set('connecting');
    try {
      await connection.start();
      this.stateSignal.set('connected');
    } catch (error: unknown) {
      this.connection = null;
      this.stateSignal.set('disconnected');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    if (connection) await connection.stop();
    this.stateSignal.set('disconnected');
  }
}
