import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';

interface SaviaUpDatabase extends DBSchema {
  metadata: {
    key: string;
    value: { readonly key: string; readonly value: string; readonly updatedAt: string };
  };
  salesCatalog: {
    key: string;
    value: unknown;
  };
}

@Injectable({ providedIn: 'root' })
export class OfflineDatabaseService {
  private databasePromise?: Promise<IDBPDatabase<SaviaUpDatabase>>;
  private salesCatalogMutation: Promise<void> = Promise.resolve();

  database(): Promise<IDBPDatabase<SaviaUpDatabase>> {
    this.databasePromise ??= openDB<SaviaUpDatabase>('savia-up', 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) database.createObjectStore('metadata', { keyPath: 'key' });
        if (oldVersion < 2) database.createObjectStore('salesCatalog');
      },
    });
    return this.databasePromise;
  }

  async getSalesCatalog<T>(): Promise<T | undefined> {
    await this.salesCatalogMutation;
    const database = await this.database();
    return (await database.get('salesCatalog', 'active')) as T | undefined;
  }

  putSalesCatalog<T>(catalog: T): Promise<void> {
    return this.enqueueSalesCatalogMutation(async () => {
      const database = await this.database();
      await database.put('salesCatalog', catalog, 'active');
    });
  }

  clearSalesCatalog(): Promise<void> {
    return this.enqueueSalesCatalogMutation(async () => {
      const database = await this.database();
      await database.clear('salesCatalog');
    });
  }

  private enqueueSalesCatalogMutation(operation: () => Promise<void>): Promise<void> {
    const next = this.salesCatalogMutation.then(operation, operation);
    this.salesCatalogMutation = next.catch(() => undefined);
    return next;
  }
}
