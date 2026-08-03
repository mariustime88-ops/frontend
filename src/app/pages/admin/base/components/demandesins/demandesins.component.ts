import { Component, OnInit, inject } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@app/environments/environment';

export interface DemandeInstallation {
  id: number;
  annee_enreg: number | null;
  contact: string;
  montant_demande: number | null;
  montant_accorde: number | null;
  situation_dossier: number | null; // 0 ou null = non appuyée, 1 = appuyée
  rapport_enquete_url: any;
  demande_ministre: any;
  devis: any;
  ident_fiscale: any;
  releve_bancaire: any;
  carte_egalite: any;
  carte_national: any;
  observations_enquete: string | null;
  observations_demande: string | null;
  personne_id: number | null;
  departement_id: number | null;
  commune_id: number | null;
  type_kit_id: number | null;
  gups_id: number | null;
  user_id: number | null;
  personne?: { id: number; nomprenoms: string; npi?: string };
  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  gups?: { id: number; libelle: string };
  type_kit?: { id: number; libelle: string };
  created_at?: string;
}

// Champs numériques : une chaîne vide "" revenue du serveur doit être
// convertie en null avant tout renvoi, sinon Laravel refuse (validation.integer).
const NUMERIC_FIELDS = [
  'annee_enreg', 'montant_demande', 'montant_accorde', 'situation_dossier',
  'personne_id', 'departement_id', 'commune_id', 'type_kit_id', 'gups_id', 'user_id',
];

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
  override formData: boolean = true;

  protected apiHttp = inject(HttpClient);
  protected override route = inject(ActivatedRoute);

  // Bascule entre la vue "liste" et la vue "formulaire plein écran"
  showForm: boolean = false;

  departementsList: any[] = [];
  communesFormList: any[] = [];
  communesFilterList: any[] = [];
  gupsList: any[] = [];
  typesKitsList: any[] = [];
  personnesList: any[] = [];
sessionsList: any[] = [];
  searchFilters = {
    departement_id: '',
    commune_id: '',
    gups_id: '',
    type_kit_id: '', // Ajoutez cette ligne ici
    situation_dossier: '',
    annee_enreg: '',
    session: '',
    search: '', // Barre de recherche automatique (au-dessus du tableau, comme dans demandeurs)
  };
  years: number[] = [];

  personnePreRemplie: boolean = false;
  viewTarget: DemandeInstallation | null = null;

  selectedFiles: { [key: string]: File } = {};

  // Cible du bouton "marteau" (appuyer / désappuyer)
  toggleTarget: DemandeInstallation | null = null;
  toggling: boolean = false;
  toggleId: string = 'toggle_appuye';

  columns: Column[] = [
    { field: 'personne.nomprenoms', header: 'Demandeursss', filterType: 'text' },
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    { field: 'montant_demande', header: 'Montant demandé', filterType: 'text' },
    { field: 'montant_accorde', header: 'Montant accordé', filterType: 'text' },
    {
      field: 'situation_dossier',
      header: 'Décision',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) =>
        row.situation_dossier == 1
          ? '<span class="badge-pill badge-pill-green">Appuyée</span>'
          : '<span class="badge-pill badge-pill-gray">Non appuyée</span>',
    },
    {
      field: 'created_at',
      header: 'Date',
      filterType: 'text',
      formatter: (row: any) => this.formatDate(row.created_at),
    },
  ];

  globalFilterFields = ['personne.nomprenoms', 'personne.npi', 'contact', 'observations_demande'];

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
// --- Recherche en temps réel (barre de recherche au-dessus du tableau, comme demandeurs) ---
  private searchDebounce: any;

  onTableSearch(term: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.searchFilters.search = term;
      const value = (term || '').trim();
      if (value) {
        this.filter['search'] = value;
      } else {
        delete (this.filter as any)['search'];
      }
      this.filter.page = 1;
      this.data = [];
      this.loadData();
    }, 350);
  }

  private buildYearsRange(): void {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 2015; y--) list.push(y);
    this.years = list;
  }

  private formatDate(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  
 loadLists(): void {
    // 1. Départements
    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.departementsList = res?.response?.data ?? res?.data ?? []));

    // 2. GUPS
    this.resourceService
      .loadResource<any>('gups', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.gupsList = res?.response?.data ?? res?.data ?? []));

    // 3. Types de kits (Vérifiez si la route API est 'type-kits' ou 'type_kits')
    this.resourceService
      .loadResource<any>('type-kits', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.typesKitsList = res?.response?.data ?? res?.data ?? []));

    // 4. Personnes
    this.resourceService
      .loadResource<any>('personnes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.personnesList = res?.response?.data ?? res?.data ?? []));

    // 5. Sessions (Modifiez 'sessions' par le nom exact de votre route API si besoin, ex: 'annee-sessions')
    this.resourceService
      .loadResource<any>('sessions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.sessionsList = res?.response?.data ?? res?.data ?? []));
  }
  // --- Filtres (auto-application, pas de bouton) ---
  onFilterDepartementChange(): void {
    this.searchFilters.commune_id = '';
    this.communesFilterList = [];
    if (this.searchFilters.departement_id) {
      this.resourceService
        .loadResource<any>('communes', {
          paginate: true,
          params: { all: '1', departement_id: this.searchFilters.departement_id } as any,
        })
        .subscribe((res: any) => {
          this.communesFilterList = res?.response?.data ?? res?.data ?? [];
        });
    }
    this.applyFilters();
  }

  applyFilters(): void {
    this.filter['departement_id'] = this.searchFilters.departement_id;
    this.filter['commune_id'] = this.searchFilters.commune_id;
    this.filter['gups_id'] = this.searchFilters.gups_id;
    this.filter['type_kit_id'] = this.searchFilters.type_kit_id; // Ajoutez cette ligne ici
    this.filter['situation_dossier'] = this.searchFilters.situation_dossier;
    this.filter['annee_enreg'] = this.searchFilters.annee_enreg;
    this.filter['session'] = this.searchFilters.session; // Ajouté ici
    this.data = [];
    this.loadData();
  }

 resetFilters(): void {
    this.searchFilters = {
      departement_id: '',
      commune_id: '',
      gups_id: '',
      type_kit_id: '',
      session: '',
      situation_dossier: '',
      annee_enreg: '',
      search: '',
    };
    this.communesFilterList = [];
    delete (this.filter as any)['search'];
    this.applyFilters();
  }

  // --- Cascade du formulaire ---
  onFormDepartementChange(): void {
    this.currentItem.commune_id = null;
    this.communesFormList = [];
    if (!this.currentItem.departement_id) return;

    this.resourceService
      .loadResource<any>('communes', {
        paginate: true,
        params: { all: '1', departement_id: this.currentItem.departement_id } as any,
      })
      .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));
  }

  onFileSelected(event: any, fieldName: string): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFiles[fieldName] = file;
      (this.currentItem as any)[fieldName] = file;
    }
  }

  override showAddForm(): void {
    super.showAddForm();
    this.selectedFiles = {};
    this.communesFormList = [];
    this.currentItem = {
      id: 0,
      annee_enreg: new Date().getFullYear(),
      contact: '',
      montant_demande: null,
      montant_accorde: null,
      situation_dossier: 0,
      rapport_enquete_url: null,
      demande_ministre: null,
      devis: null,
      ident_fiscale: null,
      releve_bancaire: null,
      carte_egalite: null,
      carte_national: null,
      observations_enquete: '',
      observations_demande: '',
      personne_id: null,
      departement_id: null,
      commune_id: null,
      type_kit_id: null,
      gups_id: null,
      user_id: null,
    };
    this.showForm = true;
  }

  override editItem(item: DemandeInstallation): void {
    super.editItem(item);
    this.selectedFiles = {};

    if (item.departement_id) {
      this.resourceService
        .loadResource<any>('communes', {
          paginate: true,
          params: { all: '1', departement_id: item.departement_id } as any,
        })
        .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));
    }
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
    this.personnePreRemplie = false;
  }

  protected override afterItemCreated(item: DemandeInstallation): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: DemandeInstallation): void {
    this.showForm = false;
  }

  // Nettoie les champs numériques avant l'envoi : une chaîne vide "" doit
  // devenir null, sinon Laravel refuse avec "validation.integer".
  override onSubmit(event?: any): void {
    NUMERIC_FIELDS.forEach((field) => {
      const value = (this.currentItem as any)[field];
      if (value === '' || value === undefined) {
        (this.currentItem as any)[field] = null;
      }
    });
    super.onSubmit(event);
  }

  showDetails(item: DemandeInstallation): void {
    this.viewTarget = item;
  }

  fileUrl(path: string | null | undefined): string | null {
    if (!path || typeof path !== 'string') return null;
    if (path.startsWith('http')) return path;
    const base = environment.URL_API.replace(/\/api\/?$/, '');
    return `${base}/storage/${path}`;
  }

  // --- Bouton marteau : Appuyer / Désappuyer un dossier ---
  prepareToggle(item: DemandeInstallation): void {
    this.toggleTarget = item;
  }

  closeToggleModal(): void {
    const closeBtn = document.querySelector(`#${this.toggleId} [data-modal-dismiss]`);
    if (closeBtn) (closeBtn as HTMLElement).click();
    this.toggleTarget = null;
  }

  executeToggle(): void {
    if (!this.toggleTarget || this.toggling) return;

    const item = this.toggleTarget;
    const newValue = item.situation_dossier == 1 ? 0 : 1;
    this.toggling = true;

    this.resourceService
      .updateResourceItem<any>('demande_installations', { id: item.id, situation_dossier: newValue })
      .subscribe({
        next: () => {
          this.toggling = false;
          const index = this.data.findIndex((d) => d.id === item.id);
          if (index !== -1) {
            this.data[index] = { ...this.data[index], situation_dossier: newValue };
            this.data = [...this.data];
          }
          this.messageService.add({
            severity: 'success',
            summary: newValue === 1 ? 'Dossier appuyé' : 'Dossier désappuyé',
            detail: '',
          });
          this.closeToggleModal();
        },
        error: () => {
          this.toggling = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible de modifier la décision." });
        },
      });
  }

  // --- Export Excel ---
  exporting: boolean = false;
  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;

    const params = new URLSearchParams();
    Object.entries(this.filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });

    const url = `${environment.URL_API}/demande_installations/export?${params.toString()}`;

    this.apiHttp.get(url, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `demandes_installation_${new Date().getTime()}.xlsx`;
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
            try { detail = JSON.parse(reader.result as string).message || detail; } catch {}
            this.messageService.add({ severity: 'error', summary: 'Erreur export', detail, life: 8000 });
          };
          reader.readAsText(errorBlob);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: `Erreur ${error?.status ?? ''} : impossible d'exporter la liste.` });
        }
      },
    });
  }
}