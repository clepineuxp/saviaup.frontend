import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { DiningAreaTables } from '../models/table.model';
import { CanvasRoomViewComponent } from './canvas-room-view.component';

const area: DiningAreaTables = {
  area: {
    id: 'area-1',
    name: 'Salón',
    order: 1,
    isActive: true,
    createdAt: '2026-09-25T00:00:00Z',
    updatedAt: '2026-09-25T00:00:00Z',
  },
  tables: [
    {
      id: 'table-1',
      diningAreaId: 'area-1',
      name: 'Mesa 1',
      capacity: 4,
      positionX: 100,
      positionY: 80,
      shape: 'SQUARE',
      isDelivery: false,
      isCashRegister: false,
      status: 'AVAILABLE',
      activeOrderId: null,
      activeOrderTotal: 0,
      occupiedAt: null,
      createdAt: '2026-09-25T00:00:00Z',
      updatedAt: '2026-09-25T00:00:00Z',
    },
  ],
};

describe('CanvasRoomViewComponent', () => {
  let fixture: ComponentFixture<CanvasRoomViewComponent>;
  let component: CanvasRoomViewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasRoomViewComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: {
            language: signal('es').asReadonly(),
            translate: (key: string) => key,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CanvasRoomViewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('area', area);
    fixture.detectChanges();
  });

  it('zooms only the room plane and keeps table coordinates proportional', () => {
    const initialLeft = component.left(area.tables[0]);
    const initialWidth = component.canvasWidth();

    component.zoomIn();

    expect(component.zoomPercent()).toBe(110);
    expect(component.left(area.tables[0])).toBeCloseTo(initialLeft * 1.1);
    expect(component.canvasWidth()).toBeCloseTo(initialWidth * 1.1);
  });

  it('enforces zoom limits and can reset to one hundred percent', () => {
    for (let index = 0; index < 20; index++) component.zoomOut();
    expect(component.zoom()).toBe(0.5);

    for (let index = 0; index < 20; index++) component.zoomIn();
    expect(component.zoom()).toBe(1.75);

    component.resetZoom();
    expect(component.zoom()).toBe(1);
  });

  it('supports two-finger pinch zoom on touch screens', () => {
    component.beginPinch(
      touchEvent([
        [0, 0],
        [100, 0],
      ]),
    );
    component.pinch(
      touchEvent([
        [0, 0],
        [150, 0],
      ]),
    );
    component.endPinch(touchEvent([[0, 0]]));

    expect(component.zoom()).toBe(1.5);
  });
});

function touchEvent(points: [number, number][]): TouchEvent {
  return {
    touches: points.map(([clientX, clientY]) => ({ clientX, clientY })),
  } as unknown as TouchEvent;
}
