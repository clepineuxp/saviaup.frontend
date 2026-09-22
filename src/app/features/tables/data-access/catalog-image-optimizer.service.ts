import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

const MAX_IMAGE_DIMENSION = 360;
const WEBP_QUALITY = 0.72;
const MINIMUM_SIZE_TO_OPTIMIZE = 24 * 1024;

@Injectable({ providedIn: 'root' })
export class CatalogImageOptimizer {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async optimize(source: string | null): Promise<string | null> {
    if (
      !source ||
      !this.isBrowser ||
      !source.startsWith('data:image/') ||
      source.length < MINIMUM_SIZE_TO_OPTIMIZE
    )
      return source;

    try {
      const image = await this.loadImage(source);
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return source;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);
      const optimized = canvas.toDataURL('image/webp', WEBP_QUALITY);
      return optimized.length < source.length ? optimized : source;
    } catch {
      return source;
    }
  }

  private loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The catalog image could not be decoded.'));
      image.src = source;
    });
  }
}
