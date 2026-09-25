import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DiningAreaTables, RestaurantTable } from '../models/table.model';
import { TableCardComponent } from '../table-card/table-card.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { tableShapeDimensions } from '../models/table-shape';

const PADDING = 36;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.75;
const ZOOM_STEP = 0.1;

@Component({
  selector: 'app-canvas-room-view',
  imports: [TableCardComponent, TranslatePipe],
  templateUrl: './canvas-room-view.component.html',
  styleUrl: './canvas-room-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasRoomViewComponent {
  readonly area = input.required<DiningAreaTables>();
  readonly tableSelected = output<RestaurantTable>();
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private panStart: { x: number; y: number; left: number; top: number } | null = null;
  readonly zoom = signal(1);
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  readonly bounds = computed(() => {
    const tables = this.area().tables;
    if (tables.length === 0) return { minX: 0, minY: 0, width: 0, height: 0 };
    const xs = tables.map((table) => table.positionX);
    const ys = tables.map((table) => table.positionY);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxRight = Math.max(
      ...tables.map((table) => table.positionX + tableShapeDimensions(table.shape).width),
    );
    const maxBottom = Math.max(
      ...tables.map((table) => table.positionY + tableShapeDimensions(table.shape).height),
    );
    return {
      minX,
      minY,
      width: maxRight - minX + PADDING * 2,
      height: maxBottom - minY + PADDING * 2,
    };
  });

  left(table: RestaurantTable): number {
    return (table.positionX - this.bounds().minX + PADDING) * this.zoom();
  }
  top(table: RestaurantTable): number {
    return (table.positionY - this.bounds().minY + PADDING) * this.zoom();
  }
  canvasWidth(): number {
    return this.bounds().width * this.zoom();
  }
  canvasHeight(): number {
    return this.bounds().height * this.zoom();
  }
  zoomIn(): void {
    this.setZoom(this.zoom() + ZOOM_STEP);
  }
  zoomOut(): void {
    this.setZoom(this.zoom() - ZOOM_STEP);
  }
  resetZoom(): void {
    this.setZoom(1);
  }

  beginPan(event: PointerEvent): void {
    if ((event.target as Element).closest('button')) return;
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    this.panStart = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
  }

  pan(event: PointerEvent): void {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport || !this.panStart) return;
    viewport.scrollLeft = this.panStart.left - (event.clientX - this.panStart.x);
    viewport.scrollTop = this.panStart.top - (event.clientY - this.panStart.y);
  }

  endPan(): void {
    this.panStart = null;
  }

  private setZoom(value: number): void {
    const previous = this.zoom();
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10));
    if (next === previous) return;
    const viewport = this.viewport()?.nativeElement;
    const centerX = viewport ? viewport.scrollLeft + viewport.clientWidth / 2 : 0;
    const centerY = viewport ? viewport.scrollTop + viewport.clientHeight / 2 : 0;
    this.zoom.set(next);
    if (!viewport) return;
    queueMicrotask(() => {
      viewport.scrollLeft = centerX * (next / previous) - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * (next / previous) - viewport.clientHeight / 2;
    });
  }
}
