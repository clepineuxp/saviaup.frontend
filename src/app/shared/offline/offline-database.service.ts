import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';

interface SaviaUpDatabase extends DBSchema {
  metadata: {
    key: string;
    value: { readonly key: string; readonly value: string; readonly updatedAt: string };
  };
}

@Injectable({ providedIn: 'root' })
export class OfflineDatabaseService {
  private databasePromise?: Promise<IDBPDatabase<SaviaUpDatabase>>;

  database(): Promise<IDBPDatabase<SaviaUpDatabase>> {
    this.databasePromise ??= openDB<SaviaUpDatabase>('savia-up', 1, {
      upgrade(database) {
        database.createObjectStore('metadata', { keyPath: 'key' });
      },
    });
    return this.databasePromise;
  }
}
