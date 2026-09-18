import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateBannerComponent } from './shared/components/pwa-update-banner/pwa-update-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaUpdateBannerComponent],
  template: '<app-pwa-update-banner /><router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
