import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth-store.service';
import { DigitalMenuStore } from '../../data-access/digital-menu.store';
import { catchError, of } from 'rxjs';
import QRCode from 'qrcode';
import { SETTINGS_REPOSITORY } from '../../../settings/data-access/settings.repository';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-digital-menu-shell',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './digital-menu-shell.component.html',
  styleUrl: './digital-menu-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigitalMenuShellComponent implements OnInit, OnDestroy {
  readonly store = inject(DigitalMenuStore);
  private readonly auth = inject(AuthStore);
  private readonly settingsRepository = inject(SETTINGS_REPOSITORY);
  private readonly qrCanvas = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  readonly enabled = signal<boolean>(false);
  readonly slug = signal<string>('');
  readonly copied = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);
  readonly includeLogoInQr = signal(false);
  readonly qrLogoSizePercent = signal(18);
  readonly logoAvailable = signal(false);
  readonly qrErrorKey = signal<string | null>(null);
  private organizationLogo: HTMLImageElement | null = null;
  private organizationLogoUrl: string | null = null;

  readonly hasChanges = computed(() => {
    const storeEnabled = this.store.isEnabled();
    const storeSlug = this.store.slug() ?? '';
    return this.enabled() !== storeEnabled || this.slug().trim() !== storeSlug.trim();
  });

  readonly isSlugLocked = computed(() => !this.store.canEditSlug());
  readonly canEnable = computed(
    () => this.auth.user()?.permissions.includes('digital-menu.enable') ?? false,
  );
  readonly canManageItems = computed(
    () => this.auth.user()?.permissions.includes('digital-menu.items.manage') ?? false,
  );
  readonly canManageStyle = computed(
    () => this.auth.user()?.permissions.includes('digital-menu.style.manage') ?? false,
  );

  constructor() {
    effect(() => {
      const cfg = this.store.config();
      if (cfg) {
        this.enabled.set(cfg.enabled);
        this.slug.set(cfg.slug ?? '');
      }
    });
    effect(() => {
      const url = this.store.publicMenuUrl();
      const canvas = this.qrCanvas()?.nativeElement;
      const includeLogo = this.includeLogoInQr();
      const logoSizePercent = this.qrLogoSizePercent();
      if (url && canvas) void this.renderQr(canvas, url, includeLogo, logoSizePercent);
    });
  }

  ngOnInit(): void {
    this.store.load();
    this.settingsRepository
      .getLogo()
      .pipe(catchError(() => of(null)))
      .subscribe((blob) => {
        if (!blob) return;
        this.organizationLogoUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
          this.organizationLogo = image;
          this.logoAvailable.set(true);
        };
        image.src = this.organizationLogoUrl;
      });
  }

  ngOnDestroy(): void {
    if (this.organizationLogoUrl) URL.revokeObjectURL(this.organizationLogoUrl);
  }

  onSlugChange(value: string): void {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
    this.slug.set(cleaned);
    this.validationError.set(null);
  }

  toggleEnabled(): void {
    if (!this.canEnable()) return;
    const nextVal = !this.enabled();
    if (nextVal && !this.slug().trim()) {
      this.validationError.set(
        'Debes ingresar un nombre único para tu organización antes de habilitar el menú digital.',
      );
      return;
    }
    this.validationError.set(null);
    this.enabled.set(nextVal);
  }

  saveParameters(): void {
    if (!this.canEnable()) return;
    const s = this.slug().trim();
    if (this.enabled() && !s) {
      this.validationError.set(
        'Debes ingresar un nombre único para tu organización antes de habilitar el menú digital.',
      );
      return;
    }

    if (s && !/^[a-z0-9-]+$/.test(s)) {
      this.validationError.set(
        'El identificador solo puede contener letras minúsculas, números y guiones.',
      );
      return;
    }

    this.validationError.set(null);
    this.store.updateParameters(this.enabled(), s);
  }

  copyLink(): void {
    const url = this.store.publicMenuUrl();
    if (!url) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2200);
      });
    }
  }

  toggleQrLogo(): void {
    if (!this.logoAvailable()) return;
    this.includeLogoInQr.update((value) => !value);
  }

  setQrLogoSize(value: number): void {
    const normalizedValue = Math.min(28, Math.max(12, Number(value)));
    this.qrLogoSizePercent.set(normalizedValue);
  }

  downloadQr(): void {
    const canvas = this.qrCanvas()?.nativeElement;
    const slug = this.store.slug();
    if (!canvas || !slug) return;
    const link = document.createElement('a');
    link.download = `menu-${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  private async renderQr(
    canvas: HTMLCanvasElement,
    url: string,
    includeLogo: boolean,
    logoSizePercent: number,
  ): Promise<void> {
    try {
      this.qrErrorKey.set(null);
      await QRCode.toCanvas(canvas, url, {
        width: 420,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      if (includeLogo && this.organizationLogo) {
        this.drawLogo(canvas, this.organizationLogo, logoSizePercent);
      }
    } catch {
      this.qrErrorKey.set('digitalMenu.qr.error');
    }
  }

  private drawLogo(
    canvas: HTMLCanvasElement,
    logo: HTMLImageElement,
    logoSizePercent: number,
  ): void {
    const context = canvas.getContext('2d');
    if (!context) return;
    const logoSize = Math.round(canvas.width * (logoSizePercent / 100));
    const boxSize = Math.round(canvas.width * ((logoSizePercent + 5) / 100));
    const x = Math.round((canvas.width - boxSize) / 2);
    const y = Math.round((canvas.height - boxSize) / 2);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(x, y, boxSize, boxSize, Math.round(boxSize * 0.14));
    context.fill();
    const ratio = Math.min(logoSize / logo.naturalWidth, logoSize / logo.naturalHeight);
    const drawWidth = Math.round(logo.naturalWidth * ratio);
    const drawHeight = Math.round(logo.naturalHeight * ratio);
    const logoX = Math.round((canvas.width - drawWidth) / 2);
    const logoY = Math.round((canvas.height - drawHeight) / 2);
    context.drawImage(logo, logoX, logoY, drawWidth, drawHeight);
  }
}
