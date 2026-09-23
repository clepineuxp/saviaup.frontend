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
import { catchError, concatMap, EMPTY, from, interval, Subject, takeUntil } from 'rxjs';
import { PublicDigitalMenuService } from '../../features/digital-menu/data-access/public-digital-menu.service';
import { PublicDigitalMenu } from '../../features/digital-menu/models/public-digital-menu.model';

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
  private readonly imageLoadReset = new Subject<void>();

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
    this.imageLoadReset.next();
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
          if (data.style.showImages) this.loadCategoryImages(slug, data);
        },
        error: () => {
          this.error.set(
            'El menú digital no está disponible en este momento o la dirección no es correcta.',
          );
          this.loading.set(false);
        },
      });
  }

  private loadCategoryImages(slug: string, menu: PublicDigitalMenu): void {
    from(menu.categories)
      .pipe(
        concatMap((category) =>
          this.service.getCategoryImages(slug, category.id).pipe(catchError(() => EMPTY)),
        ),
        takeUntil(this.imageLoadReset),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((images) => {
        const productImages = new Map(
          images.products.map((product) => [product.productId, product.image] as const),
        );

        this.menu.update((current) =>
          current
            ? {
                ...current,
                categories: current.categories.map((category) =>
                  category.id === images.categoryId
                    ? {
                        ...category,
                        image: images.categoryImage,
                        products: category.products.map((product) => ({
                          ...product,
                          image: productImages.get(product.id) ?? null,
                        })),
                      }
                    : category,
                ),
              }
            : current,
        );
      });
  }
}
