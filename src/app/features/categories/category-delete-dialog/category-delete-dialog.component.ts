import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { CategoryOperationError } from '../data-access/category-store.service';
import { Category } from '../models/category.model';

@Component({
  selector: 'app-category-delete-dialog',
  imports: [UiAlertComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './category-delete-dialog.component.html',
  styleUrl: './category-delete-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDeleteDialogComponent {
  readonly category = input.required<Category>();
  readonly submitting = input(false);
  readonly error = input<CategoryOperationError | null>(null);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  cancel(): void {
    if (!this.submitting()) this.cancelled.emit();
  }

  confirm(): void {
    if (!this.submitting()) this.confirmed.emit();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.cancel();
  }
}
