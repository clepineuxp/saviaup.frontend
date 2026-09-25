import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../../shared/realtime/realtime.service';
import { TableRealtimeClient } from './table-realtime.client';

describe('TableRealtimeClient', () => {
  let client: TableRealtimeClient;
  let browser: EventTarget;
  let testDocument: Document;
  let connectionState: HubConnectionState;
  let reconnecting: (() => void) | undefined;
  let reconnected: (() => void) | undefined;
  let closed: (() => void) | undefined;
  const start = vi.fn<() => Promise<void>>();
  const stop = vi.fn<() => Promise<void>>();
  const invoke = vi.fn<() => Promise<boolean>>();
  const createConnection = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    connectionState = HubConnectionState.Disconnected;
    reconnecting = undefined;
    reconnected = undefined;
    closed = undefined;
    start.mockReset().mockImplementation(async () => {
      connectionState = HubConnectionState.Connected;
    });
    stop.mockReset().mockImplementation(async () => {
      connectionState = HubConnectionState.Disconnected;
      closed?.();
    });
    invoke.mockReset().mockResolvedValue(true);
    browser = Object.assign(new EventTarget(), { navigator: { onLine: true } });
    testDocument = document.implementation.createHTMLDocument('Realtime tests');
    Object.defineProperty(testDocument, 'defaultView', { value: browser });
    Object.defineProperty(testDocument, 'visibilityState', { value: 'visible' });

    const connection = {
      get state() {
        return connectionState;
      },
      start,
      stop,
      invoke,
      on: vi.fn(),
      onreconnecting: vi.fn((callback: () => void) => (reconnecting = callback)),
      onreconnected: vi.fn((callback: () => void) => (reconnected = callback)),
      onclose: vi.fn((callback: () => void) => (closed = callback)),
    } as unknown as HubConnection;
    createConnection.mockReset().mockReturnValue(connection);

    TestBed.configureTestingModule({
      providers: [
        TableRealtimeClient,
        { provide: DOCUMENT, useValue: testDocument },
        { provide: RealtimeService, useValue: { createConnection } },
      ],
    });
    client = TestBed.inject(TableRealtimeClient);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('keeps reconnecting state and requests a REST resync after SignalR reconnects', async () => {
    let resyncs = 0;
    client.resyncRequired$.subscribe(() => resyncs++);

    await client.connect();
    expect(client.state()).toBe('connected');

    connectionState = HubConnectionState.Reconnecting;
    reconnecting?.();
    expect(client.state()).toBe('reconnecting');

    connectionState = HubConnectionState.Connected;
    reconnected?.();
    expect(client.state()).toBe('connected');
    expect(resyncs).toBe(1);
  });

  it('pings SignalR without requesting a REST resync when the PWA returns connected', async () => {
    let resyncs = 0;
    client.resyncRequired$.subscribe(() => resyncs++);
    await client.connect();

    browser.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('Ping'));

    expect(start).toHaveBeenCalledOnce();
    expect(resyncs).toBe(0);
  });

  it('reconnects and requests one resync when the foreground ping fails', async () => {
    let resyncs = 0;
    client.resyncRequired$.subscribe(() => resyncs++);
    await client.connect();
    invoke.mockRejectedValueOnce(new Error('stale connection'));

    browser.dispatchEvent(new Event('focus'));

    await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(stop).toHaveBeenCalledOnce();
    expect(client.state()).toBe('connected');
    expect(resyncs).toBe(1);
  });

  it('retries an initial connection failure while the tables feature remains active', async () => {
    start
      .mockImplementationOnce(async () => {
        connectionState = HubConnectionState.Disconnected;
        throw new Error('network unavailable');
      })
      .mockImplementationOnce(async () => {
        connectionState = HubConnectionState.Connected;
      });

    await expect(client.connect()).rejects.toThrow('network unavailable');
    expect(client.state()).toBe('disconnected');

    await vi.advanceTimersByTimeAsync(5000);

    expect(start).toHaveBeenCalledTimes(2);
    expect(client.state()).toBe('connected');
  });

  it('stops reconnecting and removes wake listeners when the feature disconnects', async () => {
    let resyncs = 0;
    client.resyncRequired$.subscribe(() => resyncs++);
    await client.connect();

    await client.disconnect();
    browser.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(5000);

    expect(stop).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();
    expect(resyncs).toBe(0);
    expect(client.state()).toBe('disconnected');
  });
});
