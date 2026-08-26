import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageService, StoredImageDto } from '../../services/image.service';

export interface ImageSelectionResult {
  base64Content: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storedImageId?: string;
}

@Component({
  selector: 'app-image-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-selector.component.html',
  styleUrl: './image-selector.component.scss',
})
export class ImageSelectorComponent {
  private readonly imageService = inject(ImageService);

  @Input() module: string = 'general';
  @Input() entityId?: string | null;
  @Input() label: string = 'Imagen o Logo';
  @Input() autoSave: boolean = false; // if true, uploads immediately to DB upon file selection

  @Input() set currentImage(val: string | null | undefined) {
    this.previewUrl.set(val || null);
  }

  @Output() imageSelected = new EventEmitter<ImageSelectionResult | null>();
  @Output() imageUploaded = new EventEmitter<StoredImageDto>();

  previewUrl = signal<string | null>(null);
  fileName = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  isUploading = signal<boolean>(false);

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.errorMessage.set(null);

    // Validate size <= 2MB
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      const megabytes = (file.size / (1024 * 1024)).toFixed(2);
      this.errorMessage.set(`La imagen pesa ${megabytes} MB. El peso máximo permitido es 2 MB.`);
      input.value = '';
      return;
    }

    try {
      const base64 = await this.imageService.fileToBase64(file);
      this.previewUrl.set(base64);
      this.fileName.set(file.name);

      const selectionResult: ImageSelectionResult = {
        base64Content: base64,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'image/png',
      };

      this.imageSelected.emit(selectionResult);

      if (this.autoSave) {
        this.uploadToBackend(file);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al procesar la imagen seleccionada.');
    }
  }

  private uploadToBackend(file: File): void {
    this.isUploading.set(true);
    this.imageService.uploadFile(file, this.module, this.entityId).subscribe({
      next: (dto) => {
        this.isUploading.set(false);
        this.imageUploaded.emit(dto);
      },
      error: (err) => {
        this.isUploading.set(false);
        this.errorMessage.set(err?.error?.message || 'No se pudo guardar la imagen en el servidor.');
      },
    });
  }

  clearImage(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.previewUrl.set(null);
    this.fileName.set(null);
    this.errorMessage.set(null);
    this.imageSelected.emit(null);
  }
}
