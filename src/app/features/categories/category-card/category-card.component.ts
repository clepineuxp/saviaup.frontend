import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Category } from '../models/category.model';

@Component({
  selector: 'app-category-card',
  imports: [TranslatePipe],
  templateUrl: './category-card.component.html',
  styleUrl: './category-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCardComponent {
  readonly category = input.required<Category>();
  readonly canManage = input(false);
  readonly mutating = input(false);
  readonly editRequested = output<Category>();
  readonly statusRequested = output<Category>();
  readonly deleteRequested = output<Category>();
  readonly imageFailed = signal(false);

  markImageFailed(): void {
    this.imageFailed.set(true);
  }
}
