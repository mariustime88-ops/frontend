import { Component, OnInit, inject } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment'; // Ajustez selon votre arborescence exacte

export interface DemandeInstallation {
  id: number;
  annee_enreg: number | null;
  contact: string;
  montant_demande: number | null;
  montant_accorde: number | null;
  situation_dossier: number | null;
  rapport_enquete_url: string | null;
  demande_ministre?: string | null;
  devis: string | null;
  document_projet?: string | null;
  observations_enquete: string | null;
  observations_demande: string | null;
  personne_id: number | null;
  departement_id: number | null;
  commune_id: number | null;
  type_kit_id: number | null;
  gups_id: number | null;
  ident_fiscale?: string | null;
  releve_bancaire?: string | null;
  carte_egalite?: string | null;
  carte_national?: string | null;
  personne?: { id: number; nomprenoms: string; npi?: string };
  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  created_at?: string;
}

@Component({
  selector: 'app-demandesins',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './demandesins.component.html',
  styleUrl: './demandesins.component.scss',
})
export class DemandesinsComponent extends AbstractCrudComponent<DemandeInstallation> implements OnInit {
  override resourceName: string = 'demande_installations';
  override modalId: string = 'demandeInstallationModal';
  override deleteId: string = 'delete_demande_installation';
  viewDetailsId: string = 'view_demande_installation';

  protected apiHttp = inject(HttpClient);
  protected override route = inject(ActivatedRoute); // 'protected' et 'override' pour éviter les conflits avec la classe parente

  departementsList: any[] = [];
  communesFilterList: any[] = [];
  communesFormList: any[] = [];
  gupsList: any[] = [];
  typesKitsList: any[] = [];
  personnesList: any[] = [];
  years: number[] = [];

  personnePreRemplie: boolean = false;
  viewTarget: DemandeInstallation | null = null;

  selectedFiles: { [key: string]: File } = {};

  searchFilters = {
    search: '',
    departement_id: '',
    commune_id: '',
    annee: '',
    situation_dossier: '',
  };

  columns: Column[] = [
    { field: 'personne.nomprenoms', header: 'Demandeurss', filterType: 'text' },
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    { field: 'montant_demande', header: 'Montant demandé', filterType: 'text' },
    { field: 'montant_accorde', header: 'Montant accordé', filterType: 'text' },
    { field: 'contact', header: 'Contact', filterType: 'text' },
    {
      field: 'created_at',
      header: 'Date',
      filterType: 'text',
      formatter: (row: any) => this.formatDate(row.created_at),
    },
  ];

  globalFilterFields = ['contact', 'observations_demande'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();
    this.loadLists();

    this.route.queryParams.subscribe(params => {
      if (params['personne_id']) {
        this.personnePreRemplie = true;
        setTimeout(() => {
          this.showAddForm();
          this.currentItem.personne_id = Number(params['personne_id']);
        }, 500);
      }
    });
  }

  private formatDate(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  private buildYearsRange(): void {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 2015; y--) {
      list.push(y);
    }
    this.years = list;
  }

  loadLists(): void {
    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.departementsList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('communes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        this.communesFilterList = res?.response?.data ?? [];
        this.communesFormList = res?.response?.data ?? [];
      });

    this.resourceService
      .loadResource<any>('gups', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.gupsList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('type-kits', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.typesKitsList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('personnes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.personnesList = res?.response?.data ?? []));
  }

  onFilterDepartementChange(): void {
    this.searchFilters.commune_id = '';
    const params: any = { all: '1' };
    if (this.searchFilters.departement_id) {
      params.departement_id = this.searchFilters.departement_id;
    }
    this.resourceService
      .loadResource<any>('communes', { paginate: true, params })
      .subscribe((res: any) => (this.communesFilterList = res?.response?.data ?? []));
  }

  onFormDepartementChange(): void {
    this.currentItem.commune_id = null;
    const params: any = { all: '1' };
    if (this.currentItem.departement_id) {
      params.departement_id = this.currentItem.departement_id;
    }
    this.resourceService
      .loadResource<any>('communes', { paginate: true, params })
      .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));
  }

  onFileSelected(event: any, fieldName: string): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFiles[fieldName] = file;
    }
  }

 override onSubmit(): void {
    const formData = new FormData();
    const isEdit = this.currentItem.id && this.currentItem.id > 0;

    if (isEdit) {
      formData.append('_method', 'PUT');
    }

    Object.entries(this.currentItem).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    Object.entries(this.selectedFiles).forEach(([key, file]) => {
      formData.append(key, file);
    });

    this.processing = true;

    // Récupération sécurisée du token d'authentification pour l'en-tête HTTP
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const endpoint = isEdit 
      ? `${environment.URL_API}/${this.resourceName}/${this.currentItem.id}` 
      : `${environment.URL_API}/${this.resourceName}`;

    this.apiHttp.post<any>(endpoint, formData, { headers }).subscribe({
      next: () => {
        this.processing = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: isEdit ? 'Demande modifiée avec succès.' : 'Demande ajoutée avec succès.',
        });
        
        const modalElement = document.getElementById(this.modalId);
        if (modalElement) {
          modalElement.classList.remove('active');
        }
        this.loadData();
      },
      error: (err: any) => {
        this.processing = false;
        console.error("Erreur API :", err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || "Une erreur est survenue lors de l'enregistrement.",
        });
      },
    });
  }

  applyFilters(): void {
    this.filter['search'] = this.searchFilters.search;
    this.filter['departement_id'] = this.searchFilters.departement_id;
    this.filter['commune_id'] = this.searchFilters.commune_id;
    this.filter['annee'] = this.searchFilters.annee;
    this.filter['situation_dossier'] = this.searchFilters.situation_dossier;
    this.data = [];
    this.loadData();
  }

  resetFilters(): void {
    this.searchFilters = {
      search: '',
      departement_id: '',
      commune_id: '',
      annee: '',
      situation_dossier: '',
    };
    // Typage complet requis par le filtre de base
    this.filter = {
      page: 1,
      per_page: 10,
      limit: 10,
      search: '',
      total: 0,
      totalPages: 0,
    };
    this.data = [];
    this.loadData();
  }

 showDetails(item: DemandeInstallation): void {
  this.viewTarget = item;
}

  override showAddForm(): void {
    super.showAddForm();
    this.selectedFiles = {};
    this.currentItem = {
      id: 0,
      annee_enreg: new Date().getFullYear(),
      contact: '',
      montant_demande: null,
      montant_accorde: null,
      situation_dossier: null,
      rapport_enquete_url: null,
      devis: null,
      observations_enquete: '',
      observations_demande: '',
      personne_id: null,
      departement_id: null,
      commune_id: null,
      type_kit_id: null,
      gups_id: null,
    };
  }
}