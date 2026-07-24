import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  EnvironmentInjector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AdvancedResourceService } from '@app/cores/services/advanced-resource.service';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { getDefaultUser } from '@app/cores/utils/get-user';

interface TypeDonneeDetail {
  id: number;
  code: string;
  nom: string;
  description: string;
  type: string;
  unite_mesure: string;
  thematique_id: number;
  thematique_nom: string;
  structure_nom?: string;
  statut: string;
  date_transmission?: string;
  date_validation?: string;
  date_rejet?: string;
  commentaire_validation?: string;
  motif_rejet?: string;
  validateur?: string;
  niveau_validation?: string;
}

interface CritereSaisie {
  id: number;
  code: string;
  nom: string;
  description?: string;
  ordre: number;
  is_enterable: boolean | number;
  formula?: string;
}

interface ValeurSaisie {
  id: number;
  critere_saisie_id: number;
  valeur: number | string | null;
  is_calculated: boolean;
  critere_saisie?: CritereSaisie;
  critere?: string; // For backward compatibility
  desagregation?: string;
  date_saisie?: string;
}

@Component({
  selector: 'app-data-details-modal',
  standalone: true,
  imports: [CommonModule, CrudImports],
  templateUrl: './data-details-modal.component.html',
  styleUrls: ['./data-details-modal.component.scss'],
})
export class DataDetailsModalComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() typeDonnee: TypeDonneeDetail | null = null;
  @Input() thematicId: number | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();

  criteresSaisie: CritereSaisie[] = [];
  valeursSaisies: ValeurSaisie[] = [];
  loading = false;

  constructor(private advancedService: AdvancedResourceService, private injector: EnvironmentInjector) {}

  ngOnInit() {
    if (this.visible && this.thematicId) {
      this.loadData();
    }
  }

  ngOnChanges() {
    if (this.visible && this.typeDonnee && this.thematicId) {
      // alert(this.typeDonnee.id)
      this.loadData();
    }
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private loadData() {
    if (!this.typeDonnee) return;

    this.loading = true;

    const is_partenaire = getDefaultUser(this.injector).structure?.is_partenaire;

    if (is_partenaire) {
      // For partners: use existing thematiques API
      if (!this.thematicId) return;

      const requests = [
        `thematiques/${this.thematicId}/criteres-saisie`,
        `thematiques/${this.thematicId}/valeurs-saisies`,
      ];

      this.advancedService
        .chainLoad(requests)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Load criteria
            const criteresResult = response.get(
              `thematiques/${this.thematicId}/criteres-saisie`,
            );
            if (criteresResult && criteresResult.list) {
              this.criteresSaisie = (criteresResult.list.data || []).sort(
                (a: CritereSaisie, b: CritereSaisie) => a.ordre - b.ordre,
              );
            }

            // Load values and filter for this type de donnée
            const valeursResult = response.get(
              `thematiques/${this.thematicId}/valeurs-saisies`,
            );
            if (valeursResult && valeursResult.list) {
              const allValeurs = valeursResult.list.data || [];
              // Filter values for this specific type de donnée
              this.valeursSaisies = allValeurs.filter(
                (valeur: any) => valeur.structure_type_donnees_id === this.typeDonnee?.id,
              );
            }

            this.loading = false;
          },
          error: (error: any) => {
            this.loading = false;
            console.error('Error loading data details:', error);
          },
        });
    } else {
      // For admins: use admin validation API
      const structureId = (this.typeDonnee as any).structure_id;
      const thematiqueId = (this.typeDonnee as any).thematique_id;
      let url = `admin/validations/${this.typeDonnee.id}/values`;
      const params = [];
      if (structureId) params.push(`structure_id=${structureId}`);
      if (thematiqueId) params.push(`thematique_id=${thematiqueId}`);
      if (params.length > 0) url += '?' + params.join('&');
      const requests = [url];

      this.advancedService
        .chainLoad(requests)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (!response) return;
            const result = response.get(url) as any;

            if (result !== null && result !== undefined && result.list.valeurs) {
              // The admin API returns valeurs directly
              this.valeursSaisies = result.list.valeurs.map((v: any) => ({
                id: v.id,
                critere_saisie_id: v.critere_saisie_id,
                valeur: v.valeur,
                is_calculated: v.is_calculated, // Assume not calculated for now
                critere_saisie: {
                  id: v.critere_saisie_id,
                  code: v.critere_saisie.code,
                  nom: v.critere_saisie.nom,
                  ordre: v.critere_saisie.ordre,
                  is_enterable: v.critere_saisie.is_enterable,
                },
              }));
            }

            // Extract unique criteria from valeurs
            const uniqueCriteres = new Map();
            this.valeursSaisies.forEach((valeur: any) => {
              if (valeur.critere_saisie && !uniqueCriteres.has(valeur.critere_saisie.id)) {
                uniqueCriteres.set(valeur.critere_saisie.id, valeur.critere_saisie);
              }
            });
            this.criteresSaisie = Array.from(uniqueCriteres.values()).sort(
              (a: CritereSaisie, b: CritereSaisie) => a.ordre - b.ordre,
            );



            this.loading = false;
          },
          error: (error: any) => {
            this.loading = false;
            console.error('Error loading data details:', error);
          },
        });
    }
  }

  getValeurForCritere(critereId: number): ValeurSaisie | null {

    return (
      this.valeursSaisies.find((v) => v.critere_saisie_id === critereId) || null
    );
  }

  isEnterable(critere: CritereSaisie): boolean {
    return critere.is_enterable === true || critere.is_enterable === 1;
  }

  getStatusColor(): string {
    const statut = this.typeDonnee?.statut || '';

    if (statut.includes('valide') || statut === 'finalise') {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statut.includes('rejete')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (statut.includes('transmis')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (statut === 'a_saisir') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statut === 'termine') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (statut === 'en_cours') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getStatusLabel(): string {
    const statut = this.typeDonnee?.statut || '';

    if (statut === 'finalise') {
      return 'Finalisé';
    } else if (statut.includes('valide_niveau_')) {
      const niveau = statut.replace('valide_niveau_', '').replace('_transmis_niveau_', '');
      return `Validé Niveau ${niveau}`;
    } else if (statut.includes('rejete_niveau_')) {
      const niveau = statut.replace('rejete_niveau_', '');
      return `Rejeté Niveau ${niveau}`;
    } else if (statut.includes('transmis')) {
      return 'Transmis';
    } else if (statut === 'valide') {
      return 'Validé';
    } else if (statut === 'rejete') {
      return 'Rejeté';
    } else if (statut === 'a_saisir') {
      return 'À saisir';
    } else if (statut === 'termine') {
      return 'Terminé';
    } else if (statut === 'en_cours') {
      return 'En cours';
    } else {
      return statut || 'Inconnu';
    }
  }

  getStatusIcon(): string {
    const statut = this.typeDonnee?.statut || '';

    if (statut.includes('valide') || statut === 'finalise') {
      return 'fas fa-check-circle';
    } else if (statut.includes('rejete')) {
      return 'fas fa-times-circle';
    } else if (statut.includes('transmis')) {
      return 'fas fa-paper-plane';
    } else if (statut === 'a_saisir') {
      return 'fas fa-edit';
    } else if (statut === 'termine') {
      return 'fas fa-check';
    } else if (statut === 'en_cours') {
      return 'fas fa-clock';
    } else {
      return 'fas fa-question-circle';
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString('fr-FR') +
        ' ' +
        date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return 'N/A';
    }
  }

  hasValidationInfo(): boolean {
    return !!(this.typeDonnee?.date_validation || (this.typeDonnee as any)?.validateur);
  }

  hasRejectionInfo(): boolean {
    return !!(this.typeDonnee?.date_rejet || (this.typeDonnee as any)?.validateur);
  }

  getValidationDate(): string {
    return this.formatDate(this.typeDonnee?.date_validation || (this.typeDonnee as any)?.date_validation);
  }

  getRejectionDate(): string {
    return this.formatDate(this.typeDonnee?.date_rejet || (this.typeDonnee as any)?.date_rejet);
  }

  getValidateur(): string {
    return (this.typeDonnee as any)?.validateur || '';
  }

  getNiveauValidation(): string {
    return (this.typeDonnee as any)?.niveau_validation || '';
  }

  hasComments(): boolean {
    return !!(this.typeDonnee?.commentaire_validation ||
              this.typeDonnee?.motif_rejet ||
              (this.typeDonnee as any)?.commentaire_validation ||
              (this.typeDonnee as any)?.motif_rejet);
  }

  getCommentTitle(): string {
    return (this.typeDonnee?.commentaire_validation || (this.typeDonnee as any)?.commentaire_validation)
      ? 'Commentaire de validation'
      : 'Motif de rejet';
  }

  getCommentText(): string {
    return this.typeDonnee?.commentaire_validation ||
           this.typeDonnee?.motif_rejet ||
           (this.typeDonnee as any)?.commentaire_validation ||
           (this.typeDonnee as any)?.motif_rejet ||
           '';
  }
}
