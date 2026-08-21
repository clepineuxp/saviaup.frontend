import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DiningAreaTables, RestaurantTable } from '../models/table.model';
import { TableCardComponent } from '../table-card/table-card.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { tableShapeDimensions } from '../models/table-shape';

const PADDING = 36;

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
    return table.positionX - this.bounds().minX + PADDING;
  }
  top(table: RestaurantTable): number {
    return table.positionY - this.bounds().minY + PADDING;
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
}
