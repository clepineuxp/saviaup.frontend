import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DigitalMenuStore } from '../../data-access/digital-menu.store';

@Component({
  selector: 'app-digital-menu-shell',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './digital-menu-shell.component.html',
  styleUrl: './digital-menu-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigitalMenuShellComponent implements OnInit {
  readonly store = inject(DigitalMenuStore);

  readonly enabled = signal<boolean>(false);
  readonly slug = signal<string>('');
  readonly copied = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);

  readonly hasChanges = computed(() => {
    const storeEnabled = this.store.isEnabled();
    const storeSlug = this.store.slug() ?? '';
    return this.enabled() !== storeEnabled || this.slug().trim() !== storeSlug.trim();
  });

  readonly isSlugLocked = computed(() => !this.store.canEditSlug());

  constructor() {
    effect(() => {
      const cfg = this.store.config();
      if (cfg) {
        this.enabled.set(cfg.enabled);
        this.slug.set(cfg.slug ?? '');
      }
    });
  }

  ngOnInit(): void {
    this.store.load();
  }

  onSlugChange(value: string): void {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    this.slug.set(cleaned);
    this.validationError.set(null);
  }

  toggleEnabled(): void {
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
}
