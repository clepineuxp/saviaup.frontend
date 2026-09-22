import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { PublicDigitalMenuService } from '../../features/digital-menu/data-access/public-digital-menu.service';
import { PublicDigitalMenu } from '../../features/digital-menu/models/digital-menu.model';

@Component({
  selector: 'app-digital-menu-layout',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './digital-menu-layout.component.html',
  styleUrl: './digital-menu-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DigitalMenuLayoutComponent implements OnInit {
  private static readonly loaderSteps = [
    { icon: '🍽️', message: 'Cargando tu menú digital…' },
    { icon: '👨‍🍳', message: 'Preparando una experiencia deliciosa…' },
    { icon: '🥘', message: 'Sirviendo sabores para ti…' },
    { icon: '🍴', message: 'Ya casi estamos listos para saborear…' },
    { icon: '🥄', message: 'Afinando los últimos detalles del menú…' },
  ] as const;

  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PublicDigitalMenuService);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  readonly menu = signal<PublicDigitalMenu | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly loaderStepIndex = signal(0);
  readonly loaderStep = computed(
    () => DigitalMenuLayoutComponent.loaderSteps[this.loaderStepIndex()],
  );

  ngOnInit(): void {
    interval(2300)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.loading()) {
          this.loaderStepIndex.update(
            (current) => (current + 1) % DigitalMenuLayoutComponent.loaderSteps.length,
          );
        }
      });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.error.set('No se especificó una organización válida.');
        this.loading.set(false);
        return;
      }

      this.loadMenu(slug);
    });
  }

  private loadMenu(slug: string): void {
    this.loading.set(true);
    this.loaderStepIndex.set(0);
    this.error.set(null);

    this.service
      .getPublicMenu(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.menu.set(data);
          this.title.setTitle(`${data.organizationName} · Menú Digital`);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(
            'El menú digital no está disponible en este momento o la dirección no es correcta.',
          );
          this.loading.set(false);
        },
      });
  }
}
