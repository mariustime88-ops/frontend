import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ContentChild,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { DataActionService } from '@app/cores/services/data-action.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import {
  ThematicData,
  DataEntry,
  DataEntryAccordionConfig,
} from './data-entry-accordion.types';
import { AdvancedResourceService } from '@app/cores/services/advanced-resource.service';
import { ApiRoutesV2 } from '@app/api.routes';
import { Router } from '@angular/router';
import { encrypt, decrypt } from '@app/cores/utils/cryptage';
import { CookieService } from 'ngx-cookie-service';
import { GlobalConfig } from '@app/app.config';
import { DataDetailsModalComponent } from '@app/shared/components/data-details-modal/data-details-modal.component';
import { UniversalDataModalComponent } from '@app/shared/components/universal-data-modal/universal-data-modal.component';
import { DialogModule } from 'primeng/dialog';
import { InputIconModule } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { ActiveLevelService } from '@app/cores/services/active-level.service';

@Component({
  selector: 'app-data-entry-accordion',
  templateUrl: './data-entry-accordion.component.html',
  styleUrls: ['./data-entry-accordion.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccordionModule,
    DropdownModule,
    ButtonModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ToastModule,
    DialogModule,
    InputIconModule,
    IconField,
  ],

  providers: [MessageService, ConfirmationService],
})
export class DataEntryAccordionComponent implements OnInit, OnChanges {
  @Input() data: ThematicData[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() config: DataEntryAccordionConfig = {
    title: 'Données',
    showStatusFilters: true,
    showThematicFilter: true,
    showPeriodFilter: true,
    showSaisirButton: true,
    showTransmetButton: true,
    showBatchValidationButton: false,
    showBatchRejectionButton: false,
    displayColumns: ['name', 'status', 'last_modified'],
    enableRowClick: true,
    mode: 'PARTNER',
  };

  // Colonnes prédéfinies
  @Input() defaultColumns: any = [
    {
      field: 'name',
      header: 'Donnée de saisie',
      sortable: true,
    },
    {
      field: 'entry_state.status',
      header: 'Statut',
      sortable: true,
      formatter: (rowData: DataEntry) => {
        return this.formatStatus(rowData.entry_state.status);
      },
    },
    {
      field: 'entry_state.last_modified_at',
      header: 'Dernière modification',
      sortable: true,
      formatter: (rowData: DataEntry) => {
        return this.formatDate(rowData.entry_state.last_modified_at);
      },
    },
  ];

  // Navigation target paths
  @Input() saisirPath: string | null = null;
  @Input() validerPath: string | null = null;
  @Input() voirDonneesReadonly: boolean = true;

  // Filtres actuels
  @Input() filters: {
    status: string | null;
    thematic_id: number | null;
    period_id: number | null;
  } = { status: null, thematic_id: null, period_id: null };

  // Événements
  @Output() filterChange = new EventEmitter<any>();
  @Output() dataUpdated = new EventEmitter<boolean>();

  // Templates personnalisables
  @ContentChild('customRowTemplate') customRowTemplate?: TemplateRef<any>;
  @ContentChild('customHeaderTemplate') customHeaderTemplate?: TemplateRef<any>;
  @ContentChild('customActionsTemplate')
  customActionsTemplate?: TemplateRef<any>;

  // Options de statut pour le filtre
  statusOptions = [
    { label: 'Tous', value: null },
    { label: 'Non commencé', value: 'NOT_STARTED' },
    { label: 'En cours', value: 'IN_PROGRESS' },
    { label: 'Complété', value: 'COMPLETED' },
    { label: 'Transmis', value: 'TRANSMITTED' },
    { label: 'Validé', value: 'VALIDATED' },
    { label: 'Rejeté', value: 'REJECTED' },
  ];

  // Terme de recherche (filtrage client-side)
  searchTerm = '';

  // Options pour les thématiques et périodes (dérivées des données chargées)
  thematicOptions: any[] = [];
  periodOptions: any[] = [];

  // États des modals
  showDetailsModal = false;
  showEditModal = false;
  showRejectModal = false;
  selectedEntry: DataEntry | null = null;
  selectedTypeDonnee: any = null;
  selectedStructureTypeDonneeId: number | null = null;
  rejectionReason = '';

  isNationalUser = false;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private resourceService: AdvancedResourceService,
    private router: Router,
    private http: HttpClient,
    private cookieService: CookieService,
    private dataAction: DataActionService,
    private activeLevelSvc: ActiveLevelService,
  ) {
    const userCookie = this.cookieService.get(GlobalConfig.user);
    const user = userCookie ? decrypt(userCookie) : null;
    const code = this.activeLevelSvc.activeLevelCode ?? user?.validation_level?.code;
    this.isNationalUser = code === 'NATIONAL';
  }

  // Colonnes à afficher (combinées ou personnalisées)
  displayedColumns: any[] = [];

  ngOnInit(): void {
    this.updateThematicOptions();
    this.initializeColumns();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateThematicOptions();
    }
  }

  // Données filtrées (thématique filter = API, search = client-side)
  get filteredData(): ThematicData[] {
    const term = this.searchTerm?.trim().toLowerCase();
    if (!term) return this.data;
    return this.data.reduce((acc, thematic) => {
      const thematicMatches = thematic.thematic.name.toLowerCase().includes(term);
      if (thematicMatches) {
        acc.push(thematic);
      } else {
        const matchingEntries = thematic.data_entries.filter((entry: any) =>
          (entry.name || entry.data_entry?.name || '').toLowerCase().includes(term)
        );
        if (matchingEntries.length > 0) {
          acc.push({ ...thematic, data_entries: matchingEntries });
        }
      }
      return acc;
    }, [] as ThematicData[]);
  }

  // Initialiser les colonnes en fonction de la configuration
  private initializeColumns(): void {
    // if (this.config.columns && this.config.columns.length > 0) {
    //   // Utiliser les colonnes personnalisées si elles sont fournies
    //   this.displayedColumns = this.config.columns;
    // } else if (this.config.displayColumns && this.config.displayColumns.length > 0) {
    //   // Sinon, utiliser la sélection simple basée sur les noms de colonnes
    //   this.displayedColumns = this.defaultColumns.filter(col => {
    //     // Tente de faire correspondre le nom de colonne direct ou le dernier segment d'un chemin
    //     return this.config.displayColumns?.includes(col.field) ||
    //            this.config.displayColumns?.includes(col.field.split('.').pop() || '');
    //   });
    // } else {
    //   // Fallback sur toutes les colonnes par défaut
    // }
    this.displayedColumns = this.defaultColumns;

    // Debug des colonnes sélectionnées
    console.log('Colonnes affichées:', this.displayedColumns);
    console.log('Config colonnes:', this.config.displayColumns);
  }

  private updateThematicOptions(): void {
    if (this.data && this.data.length > 0) {
      this.thematicOptions = this.data.map((item) => ({
        id: item.thematic.id,
        name: item.thematic.name,
      }));
    }
  }

  // ==================== MÉTHODES DE FILTRAGE ====================

  // Appliquer le filtre
  onFilterChange(): void {
    this.filterChange.emit(this.filters);
  }

  // ==================== MÉTHODES DE NAVIGATION ====================

  // Navigation vers la page de saisie pour une thématique
  navigateToDataEntry(thematic: ThematicData): void {
    if (this.saisirPath) {
      // Déterminer le contexte en fonction du statut dominant dans la thématique
      let context = 'to-enter'; // contexte par défaut

      // Si on filtre par statut spécifique, utiliser ce statut pour le contexte
      if (this.filters.status) {
        switch (this.filters.status) {
          case 'REJECTED':
            context = 'rejected';
            break;
          case 'VALIDATED':
            context = 'validated';
            break;
          case 'TRANSMITTED':
            context = 'transmitted';
            break;
          default:
            context = 'to-enter';
        }
      }

      const queryParams = {
        context: context,
        readonly:
          context === 'validated' || context === 'transmitted'
            ? 'true'
            : 'false',
      };

      this.router.navigate([this.saisirPath, encrypt(thematic.thematic.id)], {
        queryParams,
      });
    }
  }

  // Navigation vers la page de validation pour une thématique
  navigateToValidation(thematic: ThematicData, readonly = false): void {
    if (this.validerPath) {
      const queryParams: any = {};
      if (this.filters.status) {
        queryParams['status'] = this.filters.status;
      }
      if (this.filters.period_id) {
        queryParams['period_id'] = this.filters.period_id;
      }
      if (readonly) {
        queryParams['readonly'] = 'true';
      }
      const levelCode = this.activeLevelSvc.activeLevelCode;
      if (levelCode) {
        queryParams['active_level'] = levelCode;
      }
      this.router.navigate([this.validerPath, encrypt(thematic.thematic.id)], {
        queryParams,
      });
    }
  }

  // ==================== MÉTHODES DE GESTION DES DONNÉES ====================

  // -------------------- Actions sur les entrées (row) --------------------

  // Clic sur une ligne
  onRowClicked(entry: DataEntry): void {
    if (this.config.enableRowClick) {
      this.openDetailsModal(entry);
    }
  }

  // Clic sur le bouton Modifier/Saisir
  onEditClicked(event: Event, entry: DataEntry): void {
    event.stopPropagation();
    this.openEditModal(entry);
  }

  // Clic sur le bouton Transmettre une entrée
  onTransmitClicked(event: Event, entry: DataEntry): void {
    event.stopPropagation();
    this.confirmTransmitEntry(entry);
  }

  // Clic sur le bouton Valider une entrée
  onValidateClicked(event: Event, entry: DataEntry): void {
    event.stopPropagation();
    this.confirmValidateEntry(entry);
  }

  // Clic sur le bouton Rejeter une entrée
  onRejectClicked(event: Event, entry: DataEntry): void {
    event.stopPropagation();
    this.openRejectModal(entry);
  }

  // -------------------- Actions sur les thématiques (header) --------------------

  // Clic sur le bouton Saisir les données d'une thématique
  onSaisirThematicClicked(event: Event, thematic: ThematicData): void {
    event.stopPropagation();
    this.navigateToDataEntry(thematic);
  }

  // Clic sur le bouton Transmettre tous les données d'une thématique
  onTransmitThematicClicked(event: Event, thematic: ThematicData): void {
    event.stopPropagation();
    this.confirmTransmitThematic(thematic);
  }

  // Clic sur le bouton Voir les données (validateur ou partenaire en lecture seule)
  onVoirDonneesClicked(event: Event, thematic: ThematicData): void {
    event.stopPropagation();
    if (this.config.mode === 'PARTNER' && this.saisirPath) {
      const queryParams: any = { context: 'view', readonly: 'true' };
      if (this.filters.period_id) {
        queryParams['period_id'] = this.filters.period_id;
      }
      this.router.navigate([this.saisirPath, encrypt(thematic.thematic.id)], {
        queryParams,
      });
    } else {
      this.navigateToValidation(thematic, this.voirDonneesReadonly);
    }
  }

  // Ouvrir en mode édition uniquement les entrées VALIDATED non encore transmises
  onModifierDecisionsClicked(event: Event, thematic: ThematicData): void {
    event.stopPropagation();
    if (!this.validerPath) return;
    const queryParams: any = { status: 'VALIDATED_NOT_TRANSMITTED' };
    if (this.filters.period_id) queryParams['period_id'] = this.filters.period_id;
    const levelCode = this.activeLevelSvc.activeLevelCode;
    if (levelCode) queryParams['active_level'] = levelCode;
    this.router.navigate([this.validerPath, encrypt(thematic.thematic.id)], { queryParams });
  }

  // True si la thématique contient des entrées au-delà des VALIDATED non transmises (déjà transmises/validées sup)
  hasOtherDataBeyondValidated(thematic: ThematicData): boolean {
    return thematic.data_entries.some(e => e.entry_state?.status !== 'VALIDATED');
  }

  // Clic sur le bouton Valider tous les données d'une thématique
  onValidateThematicClicked(event: Event, thematic: ThematicData): void {
    event.stopPropagation();
    this.confirmValidateThematic(thematic);
  }

  // ==================== MÉTHODES DE CONFIRMATION ====================

  // Confirmation pour transmettre une entrée
  private confirmTransmitEntry(entry: DataEntry): void {
    const entryState = entry.entry_state;
    if (!entry.data_entry) return;

    if (
      entryState.status !== 'COMPLETED' &&
      entryState.status !== 'VALIDATED'
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Transmission impossible',
        detail: 'Les données doivent être complétées avant transmission.',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir transmettre "${entry.data_entry.name}" au niveau supérieur ? Cette action est irréversible.`,
      header: 'Confirmation de transmission',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Transmettre',
      rejectLabel: 'Annuler',
      rejectButtonStyleClass: 'p-button-danger',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.performEntryTransmission(entry);
      },
    });
  }

  // Confirmation pour transmettre une thématique entière
  private confirmTransmitThematic(thematic: ThematicData): void {
    const thematicId = thematic.thematic.id;

    // Check if all entries are completed or validated
    const incompleteEntries = thematic.data_entries.filter(
      (entry) => entry.completion_value != 100,
    );

    if (incompleteEntries.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Transmission impossible',
        detail: `${incompleteEntries.length} élément(s) ne sont pas complétés. Tous les éléments doivent être complétés pour une transmission globale.`,
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir transmettre toutes les données de la thématique "${thematic.thematic.name}" au niveau supérieur ? Cette action est irréversible.`,
      header: 'Confirmation de transmission globale',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Transmettre tout',
      rejectLabel: 'Annuler',
      rejectButtonStyleClass: 'p-button-danger',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.performThematicTransmission(thematicId);
      },
    });
  }

  // Confirmation pour valider une entrée
  private confirmValidateEntry(entry: DataEntry): void {
    if (!entry.data_entry) return;

    if (entry.entry_state.status !== 'TRANSMITTED') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation impossible',
        detail: 'Seules les données transmises peuvent être validées.',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir valider "${entry.data_entry.name}" ? Cette action est irréversible.`,
      header: 'Confirmation de validation',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Valider',
      rejectLabel: 'Annuler',
      rejectButtonStyleClass: 'p-button-danger',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.performEntryValidation(entry);
      },
    });
  }

  // Confirmation pour valider toute une thématique
  private confirmValidateThematic(thematic: ThematicData): void {
    const transmittedEntries = thematic.data_entries.filter(
      (entry) => entry.entry_state.status === 'TRANSMITTED',
    );

    if (transmittedEntries.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation impossible',
        detail: 'Aucune donnée transmise à valider dans cette thématique.',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir valider toutes les données transmises de la thématique "${thematic.thematic.name}" ? Cette action est irréversible.`,
      header: 'Confirmation de validation globale',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Valider tout',
      rejectLabel: 'Annuler',
      rejectButtonStyleClass: 'p-button-danger',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.performThematicValidation(thematic);
      },
    });
  }

  // ==================== MÉTHODES D'EXÉCUTION DES ACTIONS ====================

  // Transmission d'une entrée
  private performEntryTransmission(entry: DataEntry): void {
    let api = '';

    if (this.config.mode === 'PARTNER') {
      api = ApiRoutesV2.THEMATIC_TRANSMIT.replace('{id}', entry.thematic_id.toString());
    } else {
      api = ApiRoutesV2.VALIDATORS_THEMATIC_TRANSMIT.replace('{thematicId}', entry.thematic_id.toString());
    }

    this.resourceService
      .updateCustom(api, { comment: 'Transmission individuelle' })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Transmission réussie',
            detail: 'Les données ont été transmises au niveau supérieur.',
          });
          this.dataUpdated.emit(true);
          this.dataAction.emit('any');
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de transmission',
            detail:
              error.error.message ??
              'Une erreur est survenue lors de la transmission.',
          });
        },
      });
  }

  // Transmission d'une thématique entière
  private performThematicTransmission(thematicId: number): void {
    const api = this.config.mode === 'PARTNER'
      ? ApiRoutesV2.THEMATIC_TRANSMIT.replace('{id}', thematicId.toString())
      : ApiRoutesV2.VALIDATORS_THEMATIC_TRANSMIT.replace('{thematicId}', thematicId.toString());

    this.resourceService
      .updateCustom(api, { comment: 'Transmission globale de toutes les données' })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Transmission globale réussie',
            detail:
              'Toutes les données ont été transmises au niveau supérieur.',
          });
          this.dataUpdated.emit(true);
          this.dataAction.emit('any');
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de transmission',
            detail:
              error.error.message ??
              'Une erreur est survenue lors de la transmission globale.',
          });
        },
      });
  }

  // Validation d'une entrée
  private performEntryValidation(entry: DataEntry): void {
    this.resourceService
      .updateCustom(
        ApiRoutesV2.VALIDATION_VALIDATE.replace(
          '{dataStateId}',
          entry.entry_state.id.toString(),
        ),
        {},
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Validation réussie',
            detail: 'Les données ont été validées avec succès.',
          });
          this.dataUpdated.emit(true);
          this.dataAction.emit('any');
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de validation',
            detail:
              error.error.message ??
              'Une erreur est survenue lors de la validation.',
          });
        },
      });
  }

  // Validation de toutes les entrées d'une thématique
  private performThematicValidation(thematic: ThematicData): void {
    // Récupérer les IDs des états d'entrée à valider
    const entryStateIds = thematic.data_entries
      .filter((entry) => entry.entry_state.status === 'TRANSMITTED')
      .map((entry) => entry.entry_state.id);

    if (entryStateIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation impossible',
        detail: 'Aucune donnée à valider.',
      });
      return;
    }

    this.resourceService
      .updateCustom(ApiRoutesV2.VALIDATORS_BATCH_PROCESS, {
        validations: entryStateIds.map((id) => ({ entry_state_id: id })),
        rejections: [],
      })
      .subscribe({
        next: (response: any) => {
          const successCount = response.data?.validations?.success?.length || 0;
          this.messageService.add({
            severity: 'success',
            summary: 'Validation globale réussie',
            detail: `${successCount} donnée(s) validée(s) avec succès.`,
          });
          this.dataUpdated.emit(true);
          this.dataAction.emit('any');
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de validation globale',
            detail:
              error.error.message ??
              'Une erreur est survenue lors de la validation globale.',
          });
        },
      });
  }

  // Rejet d'une entrée
  private performEntryRejection(entry: DataEntry, reason: string): void {
    this.resourceService
      .updateCustom(
        ApiRoutesV2.VALIDATION_REJECT.replace(
          '{dataStateId}',
          entry.entry_state.id.toString(),
        ),
        { reason: reason },
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Rejet effectué',
            detail: 'Les données ont été rejetées avec succès.',
          });
          this.dataUpdated.emit(true);
          this.dataAction.emit('any');
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de rejet',
            detail:
              error.error.message ?? 'Une erreur est survenue lors du rejet.',
          });
        },
      });
  }

  hasAnyTransmittedEntry(thematic: ThematicData): boolean {
    return thematic.data_entries.some(entry => entry.entry_state.status === 'TRANSMITTED');
  }

  countValidatedNotTransmitted(thematic: ThematicData): number {
    return thematic.data_entries.filter(e => e.entry_state?.status === 'VALIDATED').length;
  }

  // ==================== GESTION DES MODALS ====================

  // Modal de détails
  openDetailsModal(entry: DataEntry): void {
    this.selectedEntry = entry;
    this.selectedTypeDonnee = this.transformDataEntryToTypeDonnee(entry);
    this.showDetailsModal = true;
  }

  onDetailsModalClose(): void {
    this.showDetailsModal = false;
    this.selectedEntry = null;
    this.selectedTypeDonnee = null;
  }

  // Modal d'édition
  openEditModal(entry: DataEntry): void {
    this.selectedEntry = entry;
    this.selectedTypeDonnee = this.transformDataEntryToTypeDonnee(entry);
    this.selectedStructureTypeDonneeId = entry.data_entry.id;
    this.showEditModal = true;
  }

  onEditModalClose(): void {
    this.showEditModal = false;
    this.selectedEntry = null;
    this.selectedTypeDonnee = null;
    this.selectedStructureTypeDonneeId = null;
  }

  onDataSaved(data: any): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Modification réussie',
      detail: 'Les données ont été modifiées avec succès.',
    });
    this.dataUpdated.emit(true);
    this.onEditModalClose();
  }

  // Modal de rejet
  openRejectModal(entry: DataEntry): void {
    this.selectedEntry = entry;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  onRejectModalClose(): void {
    this.showRejectModal = false;
    this.selectedEntry = null;
    this.rejectionReason = '';
  }

  onRejectConfirm(): void {
    if (!this.selectedEntry) return;

    if (!this.rejectionReason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Motif requis',
        detail: 'Veuillez fournir un motif de rejet.',
      });
      return;
    }

    this.performEntryRejection(this.selectedEntry, this.rejectionReason);
    this.onRejectModalClose();
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Récupère une valeur imbriquée à partir d'un chemin (ex: "data_entry.name")
   */
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev ? prev[curr] : null;
    }, obj);
  }

  // Formatters pour l'affichage des données
  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      NOT_STARTED: 'Non commencé',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Complété',
      TRANSMITTED: 'Transmis',
      VALIDATED: 'Validé',
      REJECTED: 'Rejeté',
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      NOT_STARTED: 'status-not-started',
      IN_PROGRESS: 'status-in-progress',
      COMPLETED: 'status-completed',
      TRANSMITTED: 'status-transmitted',
      VALIDATED: 'status-validated',
      REJECTED: 'status-rejected',
    };
    return classMap[status] || '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Vérification des permissions
  canTransmitEntry(entry: DataEntry): boolean {
    return (
      entry.entry_state.status === 'COMPLETED' ||
      entry.entry_state.status === 'VALIDATED'
    );
  }

  canTransmitThematic(thematic: ThematicData): boolean {
    // Vérifie si toutes les entrées sont complétées ou validées
    return !thematic.data_entries.some(
      (entry) =>
        entry.entry_state.status !== 'COMPLETED' &&
        entry.entry_state.status !== 'VALIDATED',
    );
  }

  hasTransmittableEntries(thematic: ThematicData): boolean {
    return thematic.data_entries.some(
      (entry) =>
        entry.entry_state.status === 'COMPLETED' ||
        entry.entry_state.status === 'VALIDATED',
    );
  }

  canValidateEntry(entry: DataEntry): boolean {
    return (
      entry.entry_state.status === 'TRANSMITTED' &&
      (this.config.mode === 'LEVEL_1' ||
        this.config.mode === 'LEVEL_2' ||
        this.config.mode === 'NATIONAL')
    );
  }

  canRejectEntry(entry: DataEntry): boolean {
    return (
      entry.entry_state.status === 'TRANSMITTED' &&
      (this.config.mode === 'LEVEL_1' ||
        this.config.mode === 'LEVEL_2' ||
        this.config.mode === 'NATIONAL')
    );
  }

  canValidateThematic(thematic: ThematicData): boolean {
    // Vérifie s'il y a au moins une entrée transmise à valider
    return (
      thematic.data_entries.some(
        (entry) => entry.entry_state.status === 'TRANSMITTED',
      ) &&
      (this.config.mode === 'LEVEL_1' ||
        this.config.mode === 'LEVEL_2' ||
        this.config.mode === 'NATIONAL')
    );
  }

  // Transformation d'un DataEntry pour les modals existants
  private transformDataEntryToTypeDonnee(entry: DataEntry): any {
    return {
      id: entry.entry_state.id,
      code: entry.data_entry.code,
      nom: entry.data_entry.name,
      description:
        entry.data_entry.description || `Données de ${entry.data_entry.name}`,
      type: 'data_entry',
      unite_mesure: entry.data_entry.unit || '',
      structure_type_donnee_id: entry.data_entry.id,
      statut: entry.entry_state.status,
      values_count: entry.values ? entry.values.length : 0,
      last_modified_at: entry.entry_state.last_modified_at,
    };
  }
}
