import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalizationService } from '../../../shared/i18n/localization.service';
import { UnitFormComponent } from './unit-form.component';

describe('UnitFormComponent', () => {
  let fixture: ComponentFixture<UnitFormComponent>;
  let component: UnitFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitFormComponent],
      providers: [
        {
          provide: LocalizationService,
          useValue: { language: () => 'es', translate: (key: string) => key },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UnitFormComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
    component = fixture.componentInstance;
  });

  it('requires bounded non-blank code and name values', () => {
    component.form.setValue({ code: ' '.repeat(2), name: ' '.repeat(2) });
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ code: 'a'.repeat(21), name: 'a'.repeat(121) });
    expect(component.form.controls.code.hasError('maxlength')).toBe(true);
    expect(component.form.controls.name.hasError('maxlength')).toBe(true);
  });

  it('normalizes the code and name before submit', () => {
    let submitted: unknown;
    component.submitted.subscribe((request) => (submitted = request));
    component.form.setValue({ code: '  ml  ', name: '  mili   litros ' });

    component.submit();

    expect(submitted).toEqual({ code: 'ml', name: 'mili litros' });
  });
});
