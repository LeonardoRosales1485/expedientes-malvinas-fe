import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-paginator',
  standalone: true,
  template: `
    @if (totalPages > 1) {
      <div class="paginator">
        <button type="button" class="btn-secondary small" [disabled]="page === 0" (click)="go(page - 1)">‹ Anterior</button>
        <span class="paginator-info">Página {{ page + 1 }} de {{ totalPages }} ({{ totalElements }} total)</span>
        <button type="button" class="btn-secondary small" [disabled]="page >= totalPages - 1" (click)="go(page + 1)">Siguiente ›</button>
      </div>
    }
  `,
  styles: [`
    .paginator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 1rem 0;
    }
    .paginator-info {
      font-size: 0.85rem;
      color: var(--muted, #6b7280);
    }
  `],
})
export class PaginatorComponent {
  @Input() page = 0;
  @Input() totalPages = 1;
  @Input() totalElements = 0;
  @Output() pageChange = new EventEmitter<number>();

  go(p: number): void {
    this.pageChange.emit(p);
  }
}
