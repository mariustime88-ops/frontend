import { Component, OnInit, inject } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';

export interface CarteEgalite {
  id: number;
  personne_id: number | null;
  gups_id: number | null;
  departement_id: number | null;
  rapport_enquete: any;
  certificat_medical: any;
  attestation_residence: any;
  piece_identite: any;
  photo_complete: any;
  statut: number | string; // 1 = Validé / Favorable, etc.
  user_id: number | null;
  motif: string;
  departement?: { id: number; libelle: string };
  gups?: { id: number; libelle: string };
  personne?: { id: number; nomprenoms?: string; npi?: string; date_naissance?: string; sexe?: string };
  created_at?: string;
}

@Component({
  selector: 'app-cartes',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './cartes.component.html',
  styleUrl: './cartes.component.scss',
})
export class CartesComponent extends AbstractCrudComponent<CarteEgalite> implements OnInit {
  override resourceName: string = 'carte_egalites';
  override modalId: string = 'carteModal';
  override deleteId: string = 'delete_carte';
  viewDetailsId: string = 'view_carte';
  override formData: boolean = true;

  protected apiHttp = inject(HttpClient);

  departementsList: any[] = [];
  gupsFilterList: any[] = [];
  gupsFormList: any[] = [];
  sessionsList: any[] = [];
  years: number[] = [];

  exporting: boolean = false;
  viewTarget: CarteEgalite | null = null;

  // Fichiers sélectionnés stockés à part pour éviter d'écraser les chemins existants en modification
  selectedFiles: { [key: string]: File } = {};

  searchFilters = {
    search: '',
    departement_id: '',
    gups_id: '',
    statut: '',
    annee: '',
    session_id: '',
  };

  columns: Column[] = [
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    { field: 'gups.libelle', header: 'GUPS', filterType: 'text' },
    { field: 'personne.nomprenoms', header: 'Demandeur', filterType: 'text' },
    { field: 'personne.npi', header: 'NPI', filterType: 'text' },
    {
      field: 'statut',
      header: 'Décision',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.decisionBadge(row.statut),
    },
    { 
      field: 'created_at', 
      header: 'Date Enreg', 
      filterType: 'text',
      formatter: (row: any) => {
        if (!row.created_at) return '-';
        const date = new Date(row.created_at);
        return isNaN(date.getTime()) ? row.created_at : date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },
  ];

  globalFilterFields = ['personne.nomprenoms', 'personne.npi'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();
    this.loadFilterLists();
  }

  private decisionBadge(statut: any): string {
    if (statut == 1) return '<span class="badge-pill badge-pill-green">Validé</span>';
    if (statut == 2) return '<span class="badge-pill badge-pill-red">Rejeté</span>';
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
      .loadResource<any>('gups', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.gupsFilterList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('diss_sessions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.sessionsList = res?.response?.data ?? []));
  }

  // --- Cascade des filtres ---
  onFilterDepartementChange(): void {
    this.searchFilters.gups_id = '';
    const params: any = { all: '1' };
    if (this.searchFilters.departement_id) {
      params.departement_id = this.searchFilters.departement_id;
    }
    this.resourceService
      .loadResource<any>('gups', { paginate: true, params })
      .subscribe((res: any) => (this.gupsFilterList = res?.response?.data ?? []));
  }

  applyFilters(): void {
    this.filter['search'] = this.searchFilters.search;
    this.filter['departement_id'] = this.searchFilters.departement_id;
    this.filter['gups_id'] = this.searchFilters.gups_id;
    this.filter['statut'] = this.searchFilters.statut;
    this.filter['annee'] = this.searchFilters.annee;
    this.filter['session_id'] = this.searchFilters.session_id;
    this.data = [];
    this.loadData();
  }

  resetFilters(): void {
    this.searchFilters = {
      search: '', departement_id: '', gups_id: '', statut: '', annee: '', session_id: '',
    };
    this.loadFilterLists();
    Object.keys(this.filter).forEach(k => { this.filter[k] = ''; });
    this.data = [];
    this.loadData();
  }

  // --- Cascade du formulaire ---
  onFormDepartementChange(): void {
    this.currentItem.gups_id = null;
    this.gupsFormList = [];
    if (!this.currentItem.departement_id) return;

    this.resourceService
      .loadResource<any>('gups', {
        paginate: true,
        params: { all: '1', departement_id: this.currentItem.departement_id } as any,
      })
      .subscribe((res: any) => (this.gupsFormList = res?.response?.data ?? []));
  }

  override showAddForm(): void {
    super.showAddForm();
    this.gupsFormList = [];
    this.selectedFiles = {};
    this.currentItem = {
      id: 0,
      personne_id: null,
      gups_id: null,
      departement_id: null,
      rapport_enquete: null,
      certificat_medical: null,
      attestation_residence: null,
      piece_identite: null,
      photo_complete: null,
      statut: 0,
      user_id: null,
      motif: '',
    };
  }

  override editItem(item: CarteEgalite): void {
    super.editItem(item);
    this.selectedFiles = {};

    if (item.departement_id) {
      this.resourceService
        .loadResource<any>('gups', {
          paginate: true,
          params: { all: '1', departement_id: item.departement_id } as any,
        })
        .subscribe((res: any) => (this.gupsFormList = res?.response?.data ?? []));
    }
  }

  onFileSelected(event: Event, field: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFiles[field] = file;
      (this.currentItem as any)[field] = file;
    }
  }

  override onSubmit(): void {
    ['rapport_enquete', 'certificat_medical', 'attestation_residence', 'piece_identite', 'photo_complete'].forEach(field => {
      if (!this.selectedFiles[field]) {
        delete (this.currentItem as any)[field];
      }
    });

    if (this.currentItem && this.currentItem.id) {
      this.processing = true;
      const formData = new FormData();
      
      Object.keys(this.currentItem).forEach(key => {
        const val = (this.currentItem as any)[key];
        if (val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });

      const url = `${environment.URL_API}/carte_egalites/${this.currentItem.id}/update`;

      // Récupération du token d'authentification stocké localement (adaptez la clé si besoin, ex: 'token', 'auth_token', etc.)
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      this.apiHttp.post(url, formData, { headers }).subscribe({
        next: () => {
          this.processing = false;
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Modification enregistrée avec succès.' });
          this.loadData();
        },
        error: (err) => {
          this.processing = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message || "Erreur lors de l'enregistrement." });
        }
      });
    } else {
      super.onSubmit();
    }
  }

  showDetails(item: CarteEgalite): void {
    this.viewTarget = item;
  }

  fileUrl(path: string | null | undefined): string | null {
    if (!path || typeof path !== 'string') return null;
    if (path.startsWith('http')) return path;
    const base = environment.URL_API.replace(/\/api\/?$/, '');
    return `${base}/storage/${path}`;
  }

  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;

    const params = new URLSearchParams();
    Object.entries(this.filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });

    const url = `${environment.URL_API}/carte_egalites/export?${params.toString()}`;

    this.apiHttp.get(url, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `cartes_egalites_${new Date().getTime()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(objectUrl);
      },
      error: () => {
        this.exporting = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'exporter la liste." });
      },
    });
  }
}