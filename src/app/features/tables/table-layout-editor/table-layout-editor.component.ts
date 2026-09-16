import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { RestaurantTable } from '../models/table.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TableCardComponent } from '../table-card/table-card.component';
import { TableShapeDimensions, tableShapeDimensions } from '../models/table-shape';

const CANVAS_PADDING = 32;
const MIN_CANVAS_WIDTH = 920;
const MIN_CANVAS_HEIGHT = 520;

export interface TablePositionChange {
  readonly table: RestaurantTable;
  readonly positionX: number;
  readonly positionY: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface DragState {
  readonly table: RestaurantTable;
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly origin: Point;
}

@Component({
  selector: 'app-table-layout-editor',
  imports: [TableCardComponent, TranslatePipe],
  templateUrl: './table-layout-editor.component.html',
  styleUrl: './table-layout-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableLayoutEditorComponent {
  readonly tables = input.required<readonly RestaurantTable[]>();
  readonly busy = input(false);
  readonly positionChanged = output<TablePositionChange>();
  readonly editRequested = output<RestaurantTable>();

  private readonly previewPositions = signal<Record<string, Point>>({});
  private dragState: DragState | null = null;

  readonly canvasWidth = computed(() =>
    Math.max(
      MIN_CANVAS_WIDTH,
      ...this.tables().map(
        (table) => this.position(table).x + this.dimensions(table).width + CANVAS_PADDING * 2,
      ),
    ),
  );
  readonly canvasHeight = computed(() =>
    Math.max(
      MIN_CANVAS_HEIGHT,
      ...this.tables().map(
        (table) => this.position(table).y + this.dimensions(table).height + CANVAS_PADDING * 2,
      ),
    ),
  );

  constructor() {
    effect(() => {
      const positions = Object.fromEntries(
        this.tables().map((table) => [
          table.id,
          { x: Math.max(0, table.positionX), y: Math.max(0, table.positionY) },
        ]),
      );
      this.previewPositions.set(positions);
    });
  }

  position(table: RestaurantTable): Point {
    return (
      this.previewPositions()[table.id] ?? {
        x: Math.max(0, table.positionX),
        y: Math.max(0, table.positionY),
      }
    );
  }

  dimensions(table: RestaurantTable): TableShapeDimensions {
    return tableShapeDimensions(table.shape);
  }

  beginDrag(event: PointerEvent, table: RestaurantTable): void {
    if (this.busy()) return;
    event.preventDefault();
    this.dragState = {
      table,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      origin: this.position(table),
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  drag(event: PointerEvent): void {
    const drag = this.dragState;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.setPreview(drag.table.id, {
      x: Math.max(0, Math.round(drag.origin.x + event.clientX - drag.clientX)),
      y: Math.max(0, Math.round(drag.origin.y + event.clientY - drag.clientY)),
    });
  }

  endDrag(event: PointerEvent): void {
    const drag = this.dragState;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const position = this.position(drag.table);
    this.dragState = null;
    if (position.x === drag.table.positionX && position.y === drag.table.positionY) return;
    this.positionChanged.emit({
      table: drag.table,
      positionX: position.x,
      positionY: position.y,
    });
  }

  cancelDrag(event: PointerEvent): void {
    const drag = this.dragState;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.setPreview(drag.table.id, { x: drag.table.positionX, y: drag.table.positionY });
    this.dragState = null;
  }

  nudge(event: KeyboardEvent, table: RestaurantTable): void {
    if (this.busy()) return;
    const step = event.shiftKey ? 1 : 10;
    const deltas: Partial<Record<string, Point>> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const current = this.position(table);
    const position = {
      x: Math.max(0, current.x + delta.x),
      y: Math.max(0, current.y + delta.y),
    };
    this.setPreview(table.id, position);
    this.positionChanged.emit({ table, positionX: position.x, positionY: position.y });
  }

  private setPreview(tableId: string, position: Point): void {
    this.previewPositions.update((positions) => ({ ...positions, [tableId]: position }));
  }
}
