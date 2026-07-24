import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { AdvancedResourceService } from '@app/cores/services/advanced-resource.service';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ModalComponent } from '@app/shared/components/modal/modal.component';

export type ModalMode = 'view' | 'edit' | 'create';

@Component({
  selector: 'app-universal-data-modal',
  templateUrl: './universal-data-modal.component.html',
  styleUrls: ['./universal-data-modal.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    InputSwitchModule,
    ModalComponent
  ]
})
export class UniversalDataModalComponent implements OnInit, OnDestroy {
  @Input() modalId: string = '';
  @Input() mode: ModalMode = 'view';
  @Input() title = '';
  @Input() typeDonnee: any = null;
  @Input() structureTypeDonneeId: string | number | null = null;
  @Input() canEdit = false;
  @Input() canSwitchMode = true;

  @Output() saved = new EventEmitter<any>();
  @Output() modeChanged = new EventEmitter<ModalMode>();
  @Output() modalClose = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;
  dataValues: any[] = [];
  criteresSaisies: any[] = [];
  private _editModeSwitch = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private resourceService: AdvancedResourceService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(): void {
    this.initForm();
    if (this.typeDonnee && this.structureTypeDonneeId) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.form = this.fb.group({});
  }

  onShow(): void {
    if (this.typeDonnee && this.structureTypeDonneeId) {
      this.loadData();
    }
  }

  onHide(): void {
    this.modalClose.emit();
    this.resetForm();
  }

  onModalOpen(): void {
    this.onShow();
  }

  loadData(): void {
    if (!this.typeDonnee || !this.structureTypeDonneeId) return;

    this.loading = true;
    // Charger les valeurs saisies existantes
    this.resourceService.loadResource('admin/data-values', {
      params: {
        type_donnee_id: this.typeDonnee.id,
        structure_type_donnee_id: String(this.structureTypeDonneeId)
      }
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.dataValues = response.list.valeurs || [];
          this.buildFormFromData();
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement des données'
        });
        this.loading = false;
      }
    });
  }

  buildFormFromData(): void {
    // Reconstruire le formulaire basé sur les données chargées
    this.form = this.fb.group({});

    this.dataValues.forEach(value => {
      const controlName = `value_${value.critere_saisie_id}`;
      this.form.addControl(controlName, this.fb.control(value.valeur || ''));
    });

    // Effectuer les calculs automatiques initiaux
    this.performInitialCalculations();
  }

  switchMode(newMode: ModalMode): void {
    if (this.canSwitchMode) {
      this.mode = newMode;
      this.modeChanged.emit(newMode);
    }
  }

  toggleMode(): void {
    const newMode = this.isEditMode() ? 'view' : 'edit';
    this.switchMode(newMode);
  }

  save(): void {
    if (!this.form.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez corriger les erreurs dans le formulaire'
      });
      return;
    }

    this.loading = true;
    const formData = this.form.value;

    // Préparer les données à sauvegarder
    const dataToSave = this.dataValues.map(value => ({
      id: value.id,
      critere_saisie_id: value.critere_saisie_id,
      valeur: formData[`value_${value.critere_saisie_id}`] || value.valeur
    }));

    // TODO: Implémenter la sauvegarde via API
    this.resourceService.addResourceItem('admin/data-values', {
      type_donnee_id: this.typeDonnee.id,
      structure_type_donnee_id: this.structureTypeDonneeId,
      valeurs: dataToSave
    }).subscribe({
      next: (response: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Données sauvegardées avec succès'
        });
        this.saved.emit(response.data);
        this.closeAllModals();
        this.loading = false;
        this.onHide();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la sauvegarde'
        });
        this.loading = false;
      }
    });
  }

  resetForm(): void {
    this.form.reset();
    this.dataValues = [];
  }

  getFormValue(critereId: number): string {
    const controlName = `value_${critereId}`;
    return this.form.get(controlName)?.value || '';
  }

  isEditMode(): boolean {
    return this.mode === 'edit';
  }

  isViewMode(): boolean {
    return this.mode === 'view';
  }

  canSave(): boolean {
    return this.isEditMode() && this.canEdit && this.form.valid;
  }

  get editModeSwitch(): boolean {
    return this.isEditMode();
  }

  set editModeSwitch(value: boolean) {
    this._editModeSwitch = value;
    this.toggleMode();
  }

  /**
   * Handle value change for automatic calculations
   */
  onValueChange(event: any, dataValue: any): void {
    const newValue = parseFloat(event.target.value) || 0;

    // Update the form control
    const controlName = `value_${dataValue.critere_saisie_id}`;
    this.form.get(controlName)?.setValue(newValue);

    // Trigger automatic calculations
    this.performAutomaticCalculations(dataValue.critere_saisie_id, newValue);
  }

  /**
   * Perform initial calculations when modal opens
   */
  private performInitialCalculations(): void {
    // Calculate all calculated fields initially
    this.dataValues.forEach(dataValue => {
      if (!dataValue.critere_saisie?.is_enterable) {
        // This is a calculated field
        const calculatedValue = this.calculateFieldValue(dataValue);
        if (calculatedValue !== null) {
          // Update the display value
          dataValue.valeur = calculatedValue;
        }
      }
    });
  }

  /**
   * Perform automatic calculations like in Excel
   */
  private performAutomaticCalculations(changedCritereId: number, newValue: number): void {
    // Find calculated fields that depend on this value
    this.dataValues.forEach(dataValue => {
      if (!dataValue.critere_saisie?.is_enterable) {
        // This is a calculated field
        const calculatedValue = this.calculateFieldValue(dataValue);
        if (calculatedValue !== null) {
          // Update the display value
          dataValue.valeur = calculatedValue;
        }
      }
    });
  }

  /**
   * Calculate the value for a field based on formulas
   * This is a simplified version - in a real app, you'd have more complex formula parsing
   */
  private calculateFieldValue(dataValue: any): number | null {
    // For now, implement simple sum calculations
    // In a real implementation, you'd parse formula expressions

    // Example: If this is a "Total" field, sum related fields
    const critereName = dataValue.critere_saisie?.nom?.toLowerCase() || '';

    if (critereName.includes('total') || critereName.includes('t')) {
      // Sum all enterable fields in the same category
      let sum = 0;
      this.dataValues.forEach(otherValue => {
        if (otherValue.critere_saisie?.is_enterable &&
            otherValue.critere_saisie_id !== dataValue.critere_saisie_id) {
          const controlName = `value_${otherValue.critere_saisie_id}`;
          const value = parseFloat(this.form.get(controlName)?.value) || 0;
          sum += value;
        }
      });
      return sum;
    }

    // For other calculated fields, return current value or 0
    return parseFloat(dataValue.valeur) || 0;
  }



  closeAllModals() {
    const modals = document.querySelectorAll(
      '[data-modal-dismiss="true"].btn_close',
    )!;
    modals.forEach((modal) => {
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      this.resetForm();
    });
  }
}
