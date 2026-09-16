import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item" [class]="toast.type" (click)="toastService.remove(toast.id)">
          <span class="toast-icon">
            @switch (toast.type) {
              @case ('warning') { ⚠️ }
              @case ('error') { ❌ }
              @case ('success') { ✅ }
              @default { ℹ️ }
            }
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button type="button" class="toast-close" (click)="toastService.remove(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 24rem;
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.15rem;
      border-radius: 0.85rem;
      background: #1e293b;
      color: #f8fafc;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      font-size: 0.88rem;
      font-weight: 600;
      animation: slideIn 0.25s ease-out;
      cursor: pointer;
    }
    .toast-item.warning {
      background: #7c2d12;
      border: 1px solid #ea580c;
      color: #ffedd5;
    }
    .toast-item.error {
      background: #7f1d1d;
      border: 1px solid #ef4444;
      color: #fee2e2;
    }
    .toast-item.success {
      background: #064e3b;
      border: 1px solid #10b981;
      color: #d1fae5;
    }
    .toast-message {
      flex: 1;
    }
    .toast-close {
      border: 0;
      background: transparent;
      color: currentColor;
      font-size: 0.9rem;
      cursor: pointer;
      opacity: 0.7;
    }
    .toast-close:hover {
      opacity: 1;
    }
    @keyframes slideIn {
      from {
        transform: translateY(-1rem);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
