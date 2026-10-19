import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  async share(title: string, text: string, url: string): Promise<'shared' | 'copied'> {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  }
}
