import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rejection-modal',
  templateUrl: './rejection-modal.component.html',
  styleUrls: ['./rejection-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule
  ]
})
export class RejectionModalComponent {
  @Input() modalId = '';
  @Input() visible = false;
  @Input() title = 'Motif de rejet';
  @Input() typeDonnee: any = null;

  @Output() modalClose = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<string>();

  motif = '';
  loading = false;

  constructor(
    private messageService: MessageService
  ) {}

  onShow(): void {
    this.motif = '';
  }

  onHide(): void {
    this.modalClose.emit();
    this.motif = '';
  }

  submit(): void {
    if (!this.motif || this.motif.trim().length < 10) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Le motif doit contenir au moins 10 caractères'
      });
      return;
    }

    const motif = this.motif.trim();
    this.rejected.emit(motif);
    this.onHide();
  }

  isMotifInvalid(): boolean {
    return !this.motif || this.motif.trim().length < 10;
  }

  getMotifErrorMessage(): string {
    if (!this.motif || this.motif.trim().length === 0) {
      return 'Le motif de rejet est obligatoire';
    }
    if (this.motif.trim().length < 10) {
      return 'Le motif doit contenir au moins 10 caractères';
    }
    return '';
  }
}
