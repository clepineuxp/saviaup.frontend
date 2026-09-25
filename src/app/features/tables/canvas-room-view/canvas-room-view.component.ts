import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
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
  readonly zoom = model(1);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private panStart: { x: number; y: number; left: number; top: number } | null = null;
  private pinchStart:
    | {
        distance: number;
        zoom: number;
        contentX: number;
        contentY: number;
      }
    | undefined;
  private pinching = false;
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

  beginPinch(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    const gesture = this.touchGesture(event, viewport);
    this.pinching = true;
    this.panStart = null;
    this.pinchStart = {
      distance: gesture.distance,
      zoom: this.zoom(),
      contentX: (viewport.scrollLeft + gesture.viewportX) / this.zoom(),
      contentY: (viewport.scrollTop + gesture.viewportY) / this.zoom(),
    };
  }

  pinch(event: TouchEvent): void {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport || !this.pinchStart || event.touches.length !== 2) return;
    const gesture = this.touchGesture(event, viewport);
    const next = this.pinchStart.zoom * (gesture.distance / this.pinchStart.distance);
    this.setZoom(
      next,
      {
        viewportX: gesture.viewportX,
        viewportY: gesture.viewportY,
        contentX: this.pinchStart.contentX,
        contentY: this.pinchStart.contentY,
      },
      false,
    );
  }

  endPinch(event: TouchEvent): void {
    if (event.touches.length >= 2) return;
    this.pinchStart = undefined;
    this.pinching = false;
  }

  beginPan(event: PointerEvent): void {
    if (this.pinching || (event.target as Element).closest('button')) return;
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
    if (!viewport || !this.panStart || this.pinching) return;
    viewport.scrollLeft = this.panStart.left - (event.clientX - this.panStart.x);
    viewport.scrollTop = this.panStart.top - (event.clientY - this.panStart.y);
  }

  endPan(): void {
    this.panStart = null;
  }

  private setZoom(
    value: number,
    anchor?: {
      viewportX: number;
      viewportY: number;
      contentX: number;
      contentY: number;
    },
    snap = true,
  ): void {
    const previous = this.zoom();
    const precision = snap ? 10 : 100;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * precision) / precision));
    if (next === previous) return;
    const viewport = this.viewport()?.nativeElement;
    const viewportX = anchor?.viewportX ?? (viewport?.clientWidth ?? 0) / 2;
    const viewportY = anchor?.viewportY ?? (viewport?.clientHeight ?? 0) / 2;
    const contentX = anchor?.contentX ?? ((viewport?.scrollLeft ?? 0) + viewportX) / previous;
    const contentY = anchor?.contentY ?? ((viewport?.scrollTop ?? 0) + viewportY) / previous;
    this.zoom.set(next);
    if (!viewport) return;
    queueMicrotask(() => {
      viewport.scrollLeft = contentX * next - viewportX;
      viewport.scrollTop = contentY * next - viewportY;
    });
  }

  private touchGesture(
    event: TouchEvent,
    viewport: HTMLElement,
  ): { distance: number; viewportX: number; viewportY: number } {
    const [first, second] = [event.touches[0], event.touches[1]];
    const rect = viewport.getBoundingClientRect();
    return {
      distance: Math.max(
        1,
        Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
      ),
      viewportX: (first.clientX + second.clientX) / 2 - rect.left,
      viewportY: (first.clientY + second.clientY) / 2 - rect.top,
    };
  }
}
