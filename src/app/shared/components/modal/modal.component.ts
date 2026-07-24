// app/shared/components/ui/modal/modal.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  ElementRef,
} from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  @Input() title: string = '';
  @Input() maxWidth: string = '600px';
  @Input() maxHeight: string = '90vh';
  @Input() showSaveButton: boolean = true;
  @Input() forDelete: boolean = false;
  @Input() forSuccess: boolean = false;
  @Input() forInfo: boolean = false;
  @Input() saveButtonText: string = 'Enregistrer';
  @Input() saveButtonIcon: string = 'fas fa-floppy-disk';
  @Input() loading: boolean = false;
  @Input() hasCustomFooter: boolean = true;

  @Output() onSave = new EventEmitter<NgForm>();
  @Output() onClose = new EventEmitter<void>();

  visible: boolean = false;

  open(): void {
    this.visible = true;
    // Ajouter une classe au body pour empêcher le défilement
    document.body.classList.add('overflow-hidden');
  }

  close(): void {
    this.visible = false;
    document.body.classList.remove('overflow-hidden');
    this.onClose.emit();
  }

  handleFormSubmit(form: NgForm) {
    this.onSave.emit(form);
  }
}
