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

// Cascade : Département -> Commune -> GUPS -> Type de kit.
// Tant que le niveau précédent n'est pas choisi, le niveau suivant reste vide et désactivé
// (comme la cascade géographique de demandeurs.component.ts). Utilisée à la fois dans les
// filtres (filterGeo) et dans le formulaire d'ajout/modification (formGeo).
type GeoLevel = 'departement' | 'commune' | 'gups' | 'typeKit';

interface GeoState {
  list: any[];
  filtered: any[];
  open: boolean;
  label: string;
  id: any;
}

function emptyGeoState(): GeoState {
  return { list: [], filtered: [], open: false, label: '', id: '' };
}

function emptyGeo(): { [key in GeoLevel]: GeoState } {
  return {
    departement: emptyGeoState(),
    commune: emptyGeoState(),
    gups: emptyGeoState(),
    typeKit: emptyGeoState(),
  };
}

const GEO_ORDER: GeoLevel[] = ['departement', 'commune', 'gups', 'typeKit'];
const GEO_NEXT_RESOURCE: { [key in GeoLevel]?: string } = {
  departement: 'communes',
  commune: 'gups',
  gups: 'type-kits',
};
const GEO_PARENT_PARAM: { [key in GeoLevel]?: string } = {
  departement: 'departement_id',
  commune: 'commune_id',
  gups: 'gups_id',
};

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

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route
  // différente, voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

  // Liste "racine" (premier niveau de la cascade) : chargée une fois, partagée
  // entre les filtres (filterGeo) et le formulaire (formGeo).
  departementsList: any[] = [];
  personnesList: any[] = [];
sessionsList: any[] = [];

  // Cascade recherchable des filtres : Département -> Commune -> GUPS -> Type de kit
  filterGeo = emptyGeo();
  // Cascade recherchable du formulaire (mêmes 4 niveaux)
  formGeo = emptyGeo();

  searchFilters = {
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
    { field: 'personne.nomprenoms', header: 'Demandeurs', filterType: 'text' },
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

    // Lu depuis app.routes.ts : { path: Paths.DEMANDESINS_SESSION, component: DemandesinsComponent,
    // data: { sessionScoped: true } }. Même composant, juste ce flag qui change de route.
    this.sessionScoped = !!this.route.snapshot.data['sessionScoped'];

    
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

  // Évite l'erreur TS2790 (delete sur une propriété non optionnelle) en passant
  // par une clé générique de type string, comme dans demandeurs.component.ts.
  private setOrDeleteFilter(key: string, value: any): void {
    if (value === null || value === undefined || value === '') {
      delete this.filter[key];
    } else {
      this.filter[key] = value;
    }
  }

  onTableSearch(term: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.searchFilters.search = term;
      this.setOrDeleteFilter('search', (term || '').trim());
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
    // 1. Départements (premier niveau de la cascade filtres + formulaire)
    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        const list = res?.response?.data ?? res?.data ?? [];
        this.departementsList = list;
        this.filterGeo.departement.list = list;
        this.filterGeo.departement.filtered = list;
      });

    // 2. Personnes
    this.resourceService
      .loadResource<any>('personnes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.personnesList = res?.response?.data ?? res?.data ?? []));

    // 3. Sessions (Modifiez 'sessions' par le nom exact de votre route API si besoin, ex: 'annee-sessions')
    this.resourceService
      .loadResource<any>('sessions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        this.sessionsList = res?.response?.data ?? res?.data ?? [];

        // Vue "Session active" : on verrouille filtres + tableau sur la session en cours.
        if (this.sessionScoped) {
          this.lockToActiveSession();
        }
      });
  }

  // ============================================================
  //  SESSION ACTIVE
  //  Cherche dans sessionsList la session avec is_actif = 1 (colonne de `diss_sessions`)
  //  et verrouille dessus les filtres + le tableau. S'il n'y a aucune session en cours,
  //  on vide simplement la liste (rien à afficher, rien à ajouter).
  // ============================================================
  private lockToActiveSession(): void {
    this.activeSession = this.sessionsList.find((s: any) => s.is_actif == 1) || null;

    if (!this.activeSession) {
      this.data = [];
      return;
    }

    this.searchFilters.session = this.activeSession.id;
    this.applyFilters();
  }

  // ============================================================
  //  CASCADE RECHERCHABLE GÉNÉRIQUE : Département -> Commune -> GUPS -> Type de kit
  //  Utilisée à la fois par les filtres (target='filterGeo') et le formulaire (target='formGeo').
  //  Un niveau reste vide/désactivé tant que le niveau précédent n'a pas été choisi.
  // ============================================================
  private geoStateOf(target: 'filterGeo' | 'formGeo'): { [key in GeoLevel]: GeoState } {
    return target === 'filterGeo' ? this.filterGeo : this.formGeo;
  }

  onGeoInput(target: 'filterGeo' | 'formGeo', level: GeoLevel, term: string): void {
    const state = this.geoStateOf(target)[level];
    const t = (term || '').toLowerCase().trim();
    state.filtered = t ? state.list.filter((i) => (i.libelle || '').toLowerCase().includes(t)) : state.list;
    state.open = true;
  }

  onGeoFocus(target: 'filterGeo' | 'formGeo', level: GeoLevel): void {
    const state = this.geoStateOf(target)[level];
    state.filtered = state.list;
    state.open = true;
  }

  onGeoBlur(target: 'filterGeo' | 'formGeo', level: GeoLevel): void {
    const state = this.geoStateOf(target)[level];
    setTimeout(() => (state.open = false), 200);
  }

  isGeoDisabled(target: 'filterGeo' | 'formGeo', level: GeoLevel): boolean {
    const idx = GEO_ORDER.indexOf(level);
    if (idx === 0) return false;
    const parentLevel = GEO_ORDER[idx - 1];
    return !this.geoStateOf(target)[parentLevel].id;
  }

  selectGeoOption(target: 'filterGeo' | 'formGeo', level: GeoLevel, item: any): void {
    const geo = this.geoStateOf(target);
    geo[level].id = item.id;
    geo[level].label = item.libelle;
    geo[level].open = false;

    // Les niveaux suivants sont réinitialisés (vidés + désactivés) à chaque nouveau choix.
    const idx = GEO_ORDER.indexOf(level);
    for (let i = idx + 1; i < GEO_ORDER.length; i++) {
      geo[GEO_ORDER[i]] = emptyGeoState();
    }

    this.loadNextGeoLevel(target, level, item.id);
    this.syncGeoToModel(target);
  }

  clearGeoOption(target: 'filterGeo' | 'formGeo', level: GeoLevel): void {
    const geo = this.geoStateOf(target);
    const idx = GEO_ORDER.indexOf(level);
    for (let i = idx; i < GEO_ORDER.length; i++) {
      geo[GEO_ORDER[i]] = emptyGeoState();
    }
    this.syncGeoToModel(target);
  }

  private loadNextGeoLevel(target: 'filterGeo' | 'formGeo', level: GeoLevel, parentId: any): void {
    const nextResource = GEO_NEXT_RESOURCE[level];
    const parentParam = GEO_PARENT_PARAM[level];
    const nextLevel = GEO_ORDER[GEO_ORDER.indexOf(level) + 1];
    if (!nextResource || !parentParam || !nextLevel) return;

    this.resourceService
      .loadResource<any>(nextResource, { paginate: true, params: { all: '1', [parentParam]: parentId } as any })
      .subscribe((res: any) => {
        const list = res?.response?.data ?? res?.data ?? [];
        const geo = this.geoStateOf(target);
        geo[nextLevel].list = list;
        geo[nextLevel].filtered = list;
      });
  }

  private syncGeoToModel(target: 'filterGeo' | 'formGeo'): void {
    if (target === 'filterGeo') {
      this.applyFilters();
    } else {
      const geo = this.formGeo;
      this.currentItem.departement_id = geo.departement.id || null;
      this.currentItem.commune_id = geo.commune.id || null;
      this.currentItem.gups_id = geo.gups.id || null;
      this.currentItem.type_kit_id = geo.typeKit.id || null;
    }
  }

  // Pré-remplit la cascade du formulaire à partir d'un dossier existant (modification),
  // en rechargeant chaque niveau suivant à partir de son parent, comme demandeurs.component.ts.
  private initFormGeoFromItem(item: DemandeInstallation): void {
    this.formGeo = emptyGeo();

    if (this.departementsList.length) {
      this.formGeo.departement.list = this.departementsList;
      this.formGeo.departement.filtered = this.departementsList;
    }

    if (item.departement_id) {
      this.formGeo.departement.id = item.departement_id;
      this.formGeo.departement.label = item.departement?.libelle || '';
      this.resourceService
        .loadResource<any>('communes', { paginate: true, params: { all: '1', departement_id: item.departement_id } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? res?.data ?? [];
          this.formGeo.commune.list = list;
          this.formGeo.commune.filtered = list;
        });
    }
    if (item.commune_id) {
      this.formGeo.commune.id = item.commune_id;
      this.formGeo.commune.label = item.commune?.libelle || '';
      this.resourceService
        .loadResource<any>('gups', { paginate: true, params: { all: '1', commune_id: item.commune_id } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? res?.data ?? [];
          this.formGeo.gups.list = list;
          this.formGeo.gups.filtered = list;
        });
    }
    if (item.gups_id) {
      this.formGeo.gups.id = item.gups_id;
      this.formGeo.gups.label = item.gups?.libelle || '';
      this.resourceService
        .loadResource<any>('type-kits', { paginate: true, params: { all: '1', gups_id: item.gups_id } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? res?.data ?? [];
          this.formGeo.typeKit.list = list;
          this.formGeo.typeKit.filtered = list;
        });
    }
    if (item.type_kit_id) {
      this.formGeo.typeKit.id = item.type_kit_id;
      this.formGeo.typeKit.label = item.type_kit?.libelle || '';
    }
  }

  // --- Selects simples auto-filtrants (session, décision, année) ---
  onSimpleSelectChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.setOrDeleteFilter('departement_id', this.filterGeo.departement.id);
    this.setOrDeleteFilter('commune_id', this.filterGeo.commune.id);
    this.setOrDeleteFilter('gups_id', this.filterGeo.gups.id);
    this.setOrDeleteFilter('type_kit_id', this.filterGeo.typeKit.id);
    this.setOrDeleteFilter('situation_dossier', this.searchFilters.situation_dossier);
    this.setOrDeleteFilter('annee_enreg', this.searchFilters.annee_enreg);
    this.setOrDeleteFilter('session', this.searchFilters.session);
    this.data = [];
    this.loadData();
  }

  resetFilters(): void {
    this.filterGeo = emptyGeo();
    if (this.departementsList.length) {
      this.filterGeo.departement.list = this.departementsList;
      this.filterGeo.departement.filtered = this.departementsList;
    }
    this.searchFilters = {
      session: '',
      situation_dossier: '',
      annee_enreg: '',
      search: '',
    };
    this.setOrDeleteFilter('search', '');
    this.applyFilters();
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
    this.formGeo = emptyGeo();
    if (this.departementsList.length) {
      this.formGeo.departement.list = this.departementsList;
      this.formGeo.departement.filtered = this.departementsList;
    }
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
    this.initFormGeoFromItem(item);
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