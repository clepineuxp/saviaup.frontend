import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client.service';
import { Observable, throwError } from 'rxjs';

export interface StoredImageDto {
  id: string;
  module: string;
  entityId?: string | null;
  fileName: string;
  contentType: string;
  base64Content: string;
  fileSize: number;
  createdAt: string;
}

export interface UploadImageRequest {
  module: string;
  entityId?: string | null;
  fileName: string;
  contentType: string;
  base64Content: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  private readonly api = inject(ApiClient);

  uploadImage(request: UploadImageRequest): Observable<StoredImageDto> {
    return this.api.post<StoredImageDto>('/images', request);
  }

  uploadFile(file: File, module: string, entityId?: string | null): Observable<StoredImageDto> {
    if (file.size > 2 * 1024 * 1024) {
      return throwError(() => new Error(`La imagen supera el límite de 2 MB (${(file.size / 1024 / 1024).toFixed(2)} MB cargados).`));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    if (entityId) {
      formData.append('entityId', entityId);
    }

    return this.api.post<StoredImageDto>('/images/file', formData);
  }

  getImageById(id: string): Observable<StoredImageDto> {
    return this.api.get<StoredImageDto>(`/images/${id}`);
  }

  deleteImage(id: string): Observable<void> {
    return this.api.delete<void>(`/images/${id}`);
  }

  /**
   * Helper utility to convert a File object to a Base64 Data URL
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error(`La imagen supera el límite de 2 MB (${(file.size / 1024 / 1024).toFixed(2)} MB cargados).`));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
