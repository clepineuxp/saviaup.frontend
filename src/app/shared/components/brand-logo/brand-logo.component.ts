import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  template: `
    <a class="brand" [class.brand--light]="light()" href="/" aria-label="Savia Up, inicio">
      <img
        class="brand__image"
        src="logo/Logo-72.png"
        srcset="
          logo/Logo-72.png   72w,
          logo/Logo-96.png   96w,
          logo/Logo-128.png 128w,
          logo/Logo-144.png 144w,
          logo/Logo-152.png 152w,
          logo/Logo-192.png 192w,
          logo/Logo-384.png 384w,
          logo/Logo-512.png 512w
        "
        sizes="35px"
        width="72"
        height="72"
        alt=""
        aria-hidden="true"
      />
      <span class="brand__name">Savia <strong>Up</strong></span>
    </a>
  `,
  styleUrl: './brand-logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLogoComponent {
  readonly light = input(false);
}
