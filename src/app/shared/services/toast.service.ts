import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  readonly id: string;
  readonly message: string;
  readonly type: 'info' | 'warning' | 'error' | 'success';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsState = signal<readonly ToastMessage[]>([]);
  readonly toasts = this.toastsState.asReadonly();

  show(message: string, type: ToastMessage['type'] = 'warning', durationMs = 4000): void {
    const id = Math.random().toString(36).substring(2);
    const toast: ToastMessage = { id, message, type };
    this.toastsState.update((current) => [...current, toast]);

    if (durationMs > 0) {
      setTimeout(() => this.remove(id), durationMs);
    }
  }

  remove(id: string): void {
    this.toastsState.update((current) => current.filter((t) => t.id !== id));
  }
}
