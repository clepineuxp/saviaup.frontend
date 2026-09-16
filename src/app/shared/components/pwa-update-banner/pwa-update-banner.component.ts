import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PwaUpdateService } from '../../../core/pwa/pwa-update.service';

@Component({
  selector: 'app-pwa-update-banner',
  imports: [],
  template: `
    @if (pwaUpdateService.updateAvailable()) {
      <div class="pwa-banner" role="alert">
        <div class="pwa-banner-content">
          <span class="pwa-icon">🚀</span>
          <div class="pwa-text">
            <strong>¡Nueva versión disponible!</strong>
            <span>Hay actualizaciones del sistema listas para instalar.</span>
          </div>
        </div>
        <div class="pwa-banner-actions">
          <button type="button" class="pwa-dismiss-btn" (click)="pwaUpdateService.dismiss()">
            Ignorar
          </button>
          <button type="button" class="pwa-reload-btn" (click)="pwaUpdateService.activateUpdate()">
            Actualizar ahora
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .pwa-banner {
        position: fixed;
        top: 1.2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.2rem;
        padding: 0.9rem 1.2rem;
        width: min(92vw, 560px);
        border-radius: 1rem;
        background: #0f172a;
        color: #ffffff;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translate(-50%, -20px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }

      .pwa-banner-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
      }

      .pwa-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .pwa-text {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }

      .pwa-text strong {
        font-size: 0.92rem;
        color: #4ade80;
      }

      .pwa-text span {
        font-size: 0.8rem;
        color: #94a3b8;
      }

      .pwa-banner-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .pwa-dismiss-btn {
        background: transparent;
        border: 0;
        color: #94a3b8;
        font-size: 0.8rem;
        font-weight: 600;
        padding: 0.4rem 0.6rem;
        cursor: pointer;
        border-radius: 0.5rem;
      }

      .pwa-dismiss-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
      }

      .pwa-reload-btn {
        background: #16a34a;
        border: 0;
        color: #ffffff;
        font-size: 0.84rem;
        font-weight: 800;
        padding: 0.5rem 0.9rem;
        border-radius: 0.65rem;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
        transition: background 0.15s ease;
      }

      .pwa-reload-btn:hover {
        background: #15803d;
      }

      @media (max-width: 600px) {
        .pwa-banner {
          top: 0.5rem;
          flex-direction: column;
          align-items: stretch;
          gap: 0.75rem;
        }
        .pwa-banner-actions {
          justify-content: flex-end;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaUpdateBannerComponent {
  readonly pwaUpdateService = inject(PwaUpdateService);
}
