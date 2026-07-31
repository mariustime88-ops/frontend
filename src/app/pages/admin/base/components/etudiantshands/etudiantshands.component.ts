import { Component, OnInit, inject } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';

export interface EtudiantHandicap {
  id: number;
  npi: string;
  nomprenoms: string;
  date_naissance: string;
  contact: string;
  sexe: string;
  annee_universitaire: string;
  isDemandeur: boolean | number;
  fiche_inscription: any;
  carte_egalite: any;
  piece_identite: any;
  photo_complete: any;
  rib: any;
  statut: number | string; // 0=Non traité, 1=Favorable, 2=Non favorable
  paiement: number | string; // 0=Non payée, 1=Payée
  departement_id: number | null;
  commune_id: number | null;
  arrondissement_id: number | null;
  quartier_id: number | null;
  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  arrondissement?: { id: number; libelle: string };
  created_at?: string;
}

@Component({
  selector: 'app-etudiantshands',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './etudiantshands.component.html',
  styleUrl: './etudiantshands.component.scss',
})
export class EtudiantshandsComponent extends AbstractCrudComponent<EtudiantHandicap> implements OnInit {
  override resourceName: string = 'etudiant_handicaps';
  override modalId: string = 'etudiantModal';
  override deleteId: string = 'delete_etudiant';
  viewDetailsId: string = 'view_etudiant';
  override formData: boolean = true;

  protected apiHttp = inject(HttpClient);

  departementsList: any[] = [];
  communesFilterList: any[] = [];
  arrondissementsFilterList: any[] = [];
  sessionsList: any[] = [];
  years: number[] = [];

  communesFormList: any[] = [];
  arrondissementsFormList: any[] = [];
  quartiersFormList: any[] = [];

  exporting: boolean = false;
  viewTarget: EtudiantHandicap | null = null;

  // Fichiers sélectionnés (avant envoi) — stockés à part pour ne pas
  // perturber les autres champs texte de currentItem.
  selectedFiles: { [key: string]: File } = {};

  searchFilters = {
    search: '',
    departement_id: '',
    commune_id: '',
    arrondissement_id: '',
    statut: '',
    paiement: '',
    annee: '',
    session_id: '',
  };

  columns: Column[] = [
    { field: 'commune.libelle', header: 'Commune', filterType: 'text' },
    { field: 'nomprenoms', header: 'Nom et Prénoms', filterType: 'text' },
    {
      field: 'statut',
      header: 'Décision',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.decisionBadge(row.statut),
    },
    {
      field: 'paiement',
      header: 'Paiement',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) =>
        row.paiement == 1
          ? '<span class="badge-pill badge-pill-green">Payée</span>'
          : '<span class="badge-pill badge-pill-red">Non payée</span>',
    },
  ];

  globalFilterFields = ['nomprenoms', 'npi'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();
    this.loadFilterLists();
  }

  private decisionBadge(statut: any): string {
    if (statut == 1) return '<span class="badge-pill badge-pill-green">Favorable</span>';
    if (statut == 2) return '<span class="badge-pill badge-pill-red">Non favorable</span>';
    return '<span class="badge-pill badge-pill-gray">Pas de décision</span>';
  }

  private buildYearsRange(): void {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 2015; y--) {
      list.push(y);
    }
    this.years = list;
  }

  loadFilterLists(): void {
    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.departementsList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('communes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.communesFilterList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('arrondissements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.arrondissementsFilterList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('diss_sessions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.sessionsList = res?.response?.data ?? []));
  }

  // --- Cascade des filtres ---
  onFilterDepartementChange(): void {
    this.searchFilters.commune_id = '';
    this.searchFilters.arrondissement_id = '';

    const params: any = { all: '1' };
    if (this.searchFilters.departement_id) {
      params.departement_id = this.searchFilters.departement_id;
    }
    this.resourceService
      .loadResource<any>('communes', { paginate: true, params })
      .subscribe((res: any) => (this.communesFilterList = res?.response?.data ?? []));

    this.loadFilterArrondissements();
  }

  onFilterCommuneChange(): void {
    this.searchFilters.arrondissement_id = '';
    this.loadFilterArrondissements();
  }

  private loadFilterArrondissements(): void {
    const params: any = { all: '1' };
    if (this.searchFilters.commune_id) {
      params.commune_id = this.searchFilters.commune_id;
    }
    this.resourceService
      .loadResource<any>('arrondissements', { paginate: true, params })
      .subscribe((res: any) => (this.arrondissementsFilterList = res?.response?.data ?? []));
  }

  applyFilters(): void {
    this.filter['search'] = this.searchFilters.search;
    this.filter['departement_id'] = this.searchFilters.departement_id;
    this.filter['commune_id'] = this.searchFilters.commune_id;
    this.filter['arrondissement_id'] = this.searchFilters.arrondissement_id;
    this.filter['statut'] = this.searchFilters.statut;
    this.filter['paiement'] = this.searchFilters.paiement;
    this.filter['annee'] = this.searchFilters.annee;
    this.filter['session_id'] = this.searchFilters.session_id;
    this.data = [];
    this.loadData();
  }

  resetFilters(): void {
    this.searchFilters = {
      search: '', departement_id: '', commune_id: '', arrondissement_id: '',
      statut: '', paiement: '', annee: '', session_id: '',
    };
    this.loadFilterLists();
    this.filter['search'] = '';
    this.filter['departement_id'] = '';
    this.filter['commune_id'] = '';
    this.filter['arrondissement_id'] = '';
    this.filter['statut'] = '';
    this.filter['paiement'] = '';
    this.filter['annee'] = '';
    this.filter['session_id'] = '';
    this.data = [];
    this.loadData();
  }

  // --- Cascade du formulaire ---
  onFormDepartementChange(): void {
    this.currentItem.commune_id = null;
    this.currentItem.arrondissement_id = null;
    this.currentItem.quartier_id = null;
    this.communesFormList = [];
    this.arrondissementsFormList = [];
    this.quartiersFormList = [];
    if (!this.currentItem.departement_id) return;

    this.resourceService
      .loadResource<any>('communes', {
        paginate: true,
        params: { all: '1', departement_id: this.currentItem.departement_id } as any,
      })
      .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));
  }

  onFormCommuneChange(): void {
    this.currentItem.arrondissement_id = null;
    this.currentItem.quartier_id = null;
    this.arrondissementsFormList = [];
    this.quartiersFormList = [];
    if (!this.currentItem.commune_id) return;

    this.resourceService
      .loadResource<any>('arrondissements', {
        paginate: true,
        params: { all: '1', commune_id: this.currentItem.commune_id } as any,
      })
      .subscribe((res: any) => (this.arrondissementsFormList = res?.response?.data ?? []));
  }

  onFormArrondissementChange(): void {
    this.currentItem.quartier_id = null;
    this.quartiersFormList = [];
    if (!this.currentItem.arrondissement_id) return;

    this.resourceService
      .loadResource<any>('quartiers', {
        paginate: true,
        params: { all: '1', arrondissement_id: this.currentItem.arrondissement_id } as any,
      })
      .subscribe((res: any) => (this.quartiersFormList = res?.response?.data ?? []));
  }

  override showAddForm(): void {
    super.showAddForm();
    this.communesFormList = [];
    this.arrondissementsFormList = [];
    this.quartiersFormList = [];
    this.selectedFiles = {};
    this.currentItem = {
      id: 0,
      npi: '',
      nomprenoms: '',
      date_naissance: '',
      contact: '',
      sexe: '',
      annee_universitaire: '',
      isDemandeur: 0,
      fiche_inscription: null,
      carte_egalite: null,
      piece_identite: null,
      photo_complete: null,
      rib: null,
      statut: 0,
      paiement: 0,
      departement_id: null,
      commune_id: null,
      arrondissement_id: null,
      quartier_id: null,
    };
  }

 override editItem(item: EtudiantHandicap): void {
    super.editItem(item);
    // Force la copie pour s'assurer que l'ID et toutes les propriétés sont bien liés au formulaire
    this.currentItem = { ...item };
    this.selectedFiles = {};

    if (item.departement_id) {
      this.resourceService
        .loadResource<any>('communes', {
          paginate: true,
          params: { all: '1', departement_id: item.departement_id } as any,
        })
        .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));
    }
    if (item.commune_id) {
      this.resourceService
        .loadResource<any>('arrondissements', {
          paginate: true,
          params: { all: '1', commune_id: item.commune_id } as any,
        })
        .subscribe((res: any) => (this.arrondissementsFormList = res?.response?.data ?? []));
    }
    if (item.arrondissement_id) {
      this.resourceService
        .loadResource<any>('quartiers', {
          paginate: true,
          params: { all: '1', arrondissement_id: item.arrondissement_id } as any,
        })
        .subscribe((res: any) => (this.quartiersFormList = res?.response?.data ?? []));
    }
  }
 onFileSelected(event: Event, field: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFiles[field] = file;
      (this.currentItem as any)[field] = file; // On met à jour uniquement si un nouveau fichier est choisi
    }
  }
 override onSubmit(): void {
    // 1. Nettoyer les fichiers non modifiés
    ['fiche_inscription', 'carte_egalite', 'piece_identite', 'photo_complete', 'rib'].forEach(field => {
      if (!this.selectedFiles[field]) {
        delete (this.currentItem as any)[field];
      }
    });

    // 2. Si on est en modification, on s'assure que l'ID est bien présent 
    // et on laisse la classe parente exécuter sa méthode de soumission normale
    super.onSubmit();
  }
   showDetails(item: EtudiantHandicap): void {
    this.viewTarget = item;
  }

  fileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (typeof path !== 'string') return null;
    if (path.startsWith('http')) return path;
    // Les fichiers sont servis par Laravel via le disque "public"
    // (storage/app/public/... -> accessible sur /storage/...).
    const base = environment.URL_API.replace(/\/api\/?$/, '');
    return `${base}/storage/${path}`;
  }

  // --- Export Excel ---
  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;

    const params = new URLSearchParams();
    Object.entries(this.filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });

    const url = `${environment.URL_API}/etudiant_handicaps/export?${params.toString()}`;

    this.apiHttp.get(url, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `etudiants_handicapes_${new Date().getTime()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(objectUrl);
      },
      error: (error: any) => {
        this.exporting = false;
        const errorBlob: Blob | undefined = error?.error instanceof Blob ? error.error : undefined;
        if (errorBlob) {
          const reader = new FileReader();
          reader.onload = () => {
            let detail = `Erreur ${error.status} lors de l'export.`;
            try {
              detail = JSON.parse(reader.result as string).message || detail;
            } catch {}
            this.messageService.add({ severity: 'error', summary: 'Erreur export', detail, life: 8000 });
          };
          reader.readAsText(errorBlob);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: `Erreur ${error?.status ?? ''} : impossible d'exporter la liste.`,
          });
        }
      },
    });
  }
}