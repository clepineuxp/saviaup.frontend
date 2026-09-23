import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_ENVIRONMENT } from '../config/app-environment';
import { buildPublicMenuUrl } from './public-menu-url';

@Component({
  selector: 'app-public-menu-redirect',
  template: '<p role="status">Redirigiendo al menú…</p>',
  styles: `
    :host {
      min-height: 100vh;
      display: grid;
      place-items: center;
      color: #334155;
      font-family: Inter, Aptos, 'Segoe UI', sans-serif;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicMenuRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly document = inject(DOCUMENT);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')?.trim();
    if (!slug) {
      void this.router.navigateByUrl('/');
      return;
    }

    this.document.defaultView?.location.replace(
      buildPublicMenuUrl(
        this.environment.menuFrontendUrl,
        slug,
        this.document.defaultView?.location.search ?? '',
      ),
    );
  }
}
