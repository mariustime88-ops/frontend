import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

@Component({
  selector: 'app-custom-pagination',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './custom-pagination.component.html',
  styleUrl: './custom-pagination.component.scss',
})
export class CustomPaginationComponent implements OnChanges {
  @Input() page: number = 1;
  @Input() totalItems: number = 0;
  @Input() limit: number = 5;

  @Output() pageChange = new EventEmitter<number>();

  currentPage: number = 1;

  ngOnChanges(): void {
    this.currentPage = this.page;
  }

  get totalPages(): number {
    if (!this.limit || this.limit <= 0) return 1;
    return Math.max(1, Math.ceil(this.totalItems / this.limit));
  }

  get pageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const visiblePages = 5;
    const halfVisiblePages = Math.floor(visiblePages / 2);

    if (this.totalPages <= visiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - halfVisiblePages);
      let endPage = Math.min(this.totalPages, this.currentPage + halfVisiblePages);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) pages.push('...');
        pages.push(this.totalPages);
      }
    }

    return pages;
  }

  changePage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.pageChange.emit(page);
    }
  }
}
