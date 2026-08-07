import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';
import { SEARCH_DEBOUNCE_MS } from '@app/cores/constants/search.constants';
// ⚠️ Interface calquée sur la table `structures` vue dans phpMyAdmin (id, denomination,
// annee_creation, numero_structure, numero_promoteur, nomprenoms, effectif_total,
// nombre_fille, nombre_garcon, nombre_apprenants, nombre_encadreurs, pourcentage_enfants,
// isCentre, niveau_enseignement, autorisation, piece_identite, rib, rapport_activite,
// liste_apprenants, tableau, departement_id, commune_id, arrondissement_id, user_id,
// autorisation_ouverture, ...).
export interface Structure {
  id: number;
  denomination?: string | null;
  annee_creation?: number | string | null;
  numero_structure?: string | null;
  numero_promoteur?: string | null;
  nomprenoms?: string | null; // nom et prénoms du promoteur

  effectif_total?: number | string | null;
  nombre_fille?: number | string | null;
  nombre_garcon?: number | string | null;
  nombre_apprenants?: number | string | null;
  nombre_encadreurs?: number | string | null;
  pourcentage_enfants?: string | number | null;

  isCentre?: number | boolean | null;
  niveau_enseignement?: string | null;

  autorisation?: any;
  autorisation_ouverture?: any;
  piece_identite?: any;
  rib?: any;
  rapport_activite?: any;
  liste_apprenants?: any;
  tableau?: any;

  departement_id?: number | null;
  commune_id?: number | null;
  arrondissement_id?: number | null;
  user_id?: number | null;

  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  arrondissement?: { id: number; libelle: string };
  user?: { id: number; name?: string; contact?: string };

  created_at?: string;
  updated_at?: string;
}

// Cascade géographique : Département -> Commune -> Arrondissement
// (pas de GUPS ici : ni dans tes filtres, ni dans la table `structures`)
type GeoLevel = 'departement' | 'commune' | 'arrondissement';

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
    arrondissement: emptyGeoState(),
  };
}

const GEO_ORDER: GeoLevel[] = ['departement', 'commune', 'arrondissement'];
const GEO_NEXT_RESOURCE: { [key in GeoLevel]?: string } = {
  departement: 'communes',
  commune: 'arrondissements',
};
const GEO_PARENT_PARAM: { [key in GeoLevel]?: string } = {
  departement: 'departement_id',
  commune: 'commune_id',
};

type SimpleKey = 'sessions';

@Component({
  selector: 'app-etablissements',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './etablissements.component.html',
  styleUrl: './etablissements.component.scss',
})
export class EtablissementsComponent extends AbstractCrudComponent<Structure> implements OnInit {
  override resourceName: string = 'structures';
  override modalId: string = 'structureModal';
  override deleteId: string = 'delete_structure';
  viewDetailsId: string = 'view_structure';
  override formData: boolean = true;

  protected apiHttp = inject(HttpClient);
  protected activatedRoute = inject(ActivatedRoute);

  showForm: boolean = false;
  viewTarget: Structure | null = null;
  exporting: boolean = false;

  selectedFiles: { [key: string]: File } = {};

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route
  // différente, voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

  // Cascade géo : filtres ET formulaire (Département -> Commune -> Arrondissement)
  filterGeo = emptyGeo();
  formGeo = emptyGeo();

  sessionsList: any[] = [];
  simpleFiltered: { [key in SimpleKey]: any[] } = { sessions: [] };
  simpleOpen: { [key in SimpleKey]: boolean } = { sessions: false };

  years: number[] = [];

  searchFilters = {
    search: '',
    session_id: '' as any,
    session_label: '',
    annee: '',
  };

  columns: Column[] = [
    { field: 'denomination', header: 'Dénomination', filterType: 'text' },
    {
      field: 'numero_structure',
      header: 'N° Structure',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => row.numero_structure || '-',
    },
    { field: 'niveau_enseignement', header: "Établissement d'enseignement", filterType: 'text' },
    { field: 'effectif_total', header: 'Effectif total', filterType: 'text' },
    {
      field: 'pourcentage_enfants',
      header: 'Pourcentage apprenants hand.',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => (row.pourcentage_enfants != null && row.pourcentage_enfants !== '' ? row.pourcentage_enfants : '-'),
    },
  ];

  globalFilterFields = ['denomination', 'numero_structure', 'nomprenoms'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();

    // Lu depuis app.routes.ts : { path: Paths.ETABLISSEMENTS_SESSION, component: EtablissementsComponent,
    // data: { sessionScoped: true } }. Même composant, juste ce flag qui change de route.
    this.sessionScoped = !!this.activatedRoute.snapshot.data['sessionScoped'];

    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        const list = res?.response?.data ?? [];
        this.filterGeo.departement.list = list;
        this.filterGeo.departement.filtered = list;
      });

    this.resourceService
      .loadResource<any>('diss_sessions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        this.sessionsList = res?.response?.data ?? [];
        this.simpleFiltered.sessions = this.sessionsList;

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

    this.searchFilters.session_id = this.activeSession.id;
    this.searchFilters.session_label = this.activeSession.libelle;
    this.setOrDeleteFilter('session_id', this.activeSession.id);
    this.loadData();
  }

  private buildYearsRange(): void {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 2015; y--) list.push(y);
    this.years = list;
  }

  // ============================================================
  //  CASCADE GÉOGRAPHIQUE GÉNÉRIQUE (utilisée par filtres & formulaire)
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

    const idx = GEO_ORDER.indexOf(level);
    for (let i = idx + 1; i < GEO_ORDER.length; i++) {
      geo[GEO_ORDER[i]] = emptyGeoState();
    }

    this.loadNextGeoLevel(target, level, item.id);
    this.syncGeoToModel(target);
    if (target === 'filterGeo') this.applyFilters();
  }

  clearGeoOption(target: 'filterGeo' | 'formGeo', level: GeoLevel): void {
    const geo = this.geoStateOf(target);
    const idx = GEO_ORDER.indexOf(level);
    for (let i = idx; i < GEO_ORDER.length; i++) {
      geo[GEO_ORDER[i]] = emptyGeoState();
    }
    this.syncGeoToModel(target);
    if (target === 'filterGeo') this.applyFilters();
  }

  private loadNextGeoLevel(target: 'filterGeo' | 'formGeo', level: GeoLevel, parentId: any): void {
    const nextResource = GEO_NEXT_RESOURCE[level];
    const parentParam = GEO_PARENT_PARAM[level];
    const nextLevel = GEO_ORDER[GEO_ORDER.indexOf(level) + 1];
    if (!nextResource || !parentParam || !nextLevel) return;

    this.resourceService
      .loadResource<any>(nextResource, { paginate: true, params: { all: '1', [parentParam]: parentId } as any })
      .subscribe((res: any) => {
        const list = res?.response?.data ?? [];
        const geo = this.geoStateOf(target);
        geo[nextLevel].list = list;
        geo[nextLevel].filtered = list;
      });
  }

  private setOrDeleteFilter(key: string, value: any): void {
    if (value === null || value === undefined || value === '') {
      delete this.filter[key];
    } else {
      this.filter[key] = value;
    }
  }

  private syncGeoToModel(target: 'filterGeo' | 'formGeo'): void {
    const geo = this.geoStateOf(target);
    if (target === 'filterGeo') {
      this.setOrDeleteFilter('departement_id', geo.departement.id);
      this.setOrDeleteFilter('commune_id', geo.commune.id);
      this.setOrDeleteFilter('arrondissement_id', geo.arrondissement.id);
    } else {
      this.currentItem.departement_id = geo.departement.id || null;
      this.currentItem.commune_id = geo.commune.id || null;
      this.currentItem.arrondissement_id = geo.arrondissement.id || null;
    }
  }

  private initFormGeoFromItem(item: Structure): void {
    this.formGeo = emptyGeo();

    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }

    if (item.departement_id) {
      this.formGeo.departement.id = item.departement_id;
      this.formGeo.departement.label = item.departement?.libelle || '';
      this.resourceService
        .loadResource<any>('communes', { paginate: true, params: { all: '1', departement_id: item.departement_id } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? [];
          this.formGeo.commune.list = list;
          this.formGeo.commune.filtered = list;
        });
    }
    if (item.commune_id) {
      this.formGeo.commune.id = item.commune_id;
      this.formGeo.commune.label = item.commune?.libelle || '';
      this.resourceService
        .loadResource<any>('arrondissements', { paginate: true, params: { all: '1', commune_id: item.commune_id } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? [];
          this.formGeo.arrondissement.list = list;
          this.formGeo.arrondissement.filtered = list;
        });
    }
    if (item.arrondissement_id) {
      this.formGeo.arrondissement.id = item.arrondissement_id;
      this.formGeo.arrondissement.label = item.arrondissement?.libelle || '';
    }
  }

  // ===================== Sessions (filtre simple) =====================
  onSessionInput(term: string): void {
    const t = (term || '').toLowerCase().trim();
    this.simpleFiltered.sessions = t
      ? this.sessionsList.filter((s) => (s.libelle || '').toLowerCase().includes(t))
      : this.sessionsList;
    this.simpleOpen.sessions = true;
  }

  onSessionFocus(): void {
    this.simpleFiltered.sessions = this.sessionsList;
    this.simpleOpen.sessions = true;
  }

  onSessionBlur(): void {
    setTimeout(() => (this.simpleOpen.sessions = false), 200);
  }

  selectSession(item: any): void {
    this.searchFilters.session_id = item.id;
    this.searchFilters.session_label = item.libelle;
    this.simpleOpen.sessions = false;
    this.applyFilters();
  }

  clearSession(): void {
    this.searchFilters.session_id = '';
    this.searchFilters.session_label = '';
    this.applyFilters();
  }

  onSimpleSelectChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.setOrDeleteFilter('annee', this.searchFilters.annee);
    this.setOrDeleteFilter('session_id', this.searchFilters.session_id);
    this.data = [];
    this.loadData();
  }

  private searchDebounce: any;

  onTableSearch(term: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.setOrDeleteFilter('search', (term || '').trim());
      this.data = [];
      this.loadData();
    }, SEARCH_DEBOUNCE_MS);  // au lieu de 350
}

  // ===================== Helpers d'affichage =====================

  // ===================== Vue liste / formulaire plein écran =====================
  override showAddForm(): void {
    super.showAddForm();
    this.selectedFiles = {};
    this.formGeo = emptyGeo();
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }
    this.currentItem = {
      id: 0,
      denomination: '',
      annee_creation: null,
      numero_structure: '',
      numero_promoteur: '',
      nomprenoms: '',
      effectif_total: null,
      nombre_fille: null,
      nombre_garcon: null,
      nombre_apprenants: null,
      nombre_encadreurs: null,
      pourcentage_enfants: null,
      isCentre: 0,
      niveau_enseignement: '',
      departement_id: null,
      commune_id: null,
      arrondissement_id: null,
    };
    this.showForm = true;
  }

  override editItem(item: Structure): void {
    super.editItem(item);
    this.selectedFiles = {};
    this.initFormGeoFromItem(item);
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: Structure): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: Structure): void {
    this.showForm = false;
  }

  showDetails(item: Structure): void {
    this.viewTarget = item;
  }

  // ===================== Fichiers =====================
  onFileSelected(event: Event, field: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFiles[field] = file;
      (this.currentItem as any)[field] = file;
    }
  }

  fileUrl(path: string | null | undefined): string | null {
    if (!path || typeof path !== 'string') return null;
    if (path.startsWith('http')) return path;
    const base = environment.URL_API.replace(/\/api\/?$/, '');
    return `${base}/storage/${path}`;
  }

  private getTokenFromCookie(): string {
    const match = document.cookie.match(/(?:^|;\s*)indicateurs_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  // ===================== Enregistrement =====================
  private buildFormData(): FormData {
    const formData = new FormData();

    const simpleFields = [
      'denomination', 'annee_creation', 'numero_structure', 'numero_promoteur', 'nomprenoms',
      'effectif_total', 'nombre_fille', 'nombre_garcon', 'nombre_apprenants', 'nombre_encadreurs',
      'pourcentage_enfants', 'isCentre', 'niveau_enseignement',
      'departement_id', 'commune_id', 'arrondissement_id',
    ];
    simpleFields.forEach((key) => {
      const val = (this.currentItem as any)[key];
      if (val !== null && val !== undefined) formData.append(key, val);
    });

    ['autorisation', 'autorisation_ouverture', 'piece_identite', 'rib', 'rapport_activite', 'liste_apprenants', 'tableau'].forEach((field) => {
      if (this.selectedFiles[field]) formData.append(field, this.selectedFiles[field]);
    });

    return formData;
  }

  override onSubmit(): void {
    if (this.currentItem && this.currentItem.id) {
      this.processing = true;
      const formData = this.buildFormData();
      formData.append('_method', 'PUT');

      const url = `${environment.URL_API}/structures/${this.currentItem.id}`;
      const token = this.getTokenFromCookie();
      const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

      this.apiHttp.post(url, formData, { headers }).subscribe({
        next: () => {
          this.processing = false;
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Les informations ont été modifiées avec succès.' });
          this.showForm = false;
          this.loadData();
        },
        error: (err) => {
          this.processing = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message || "Erreur lors de l'enregistrement." });
        },
      });
    } else {
      super.onSubmit();
    }
  }

  // ===================== Export =====================
  private readonly EXPORT_EXCLUDED_KEYS = ['total', 'page', 'totalPages', 'per_page', 'limit', 'meta', 'count'];

exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;

    const params = new URLSearchParams();
    Object.entries(this.filter).forEach(([key, value]) => {
      if (this.EXPORT_EXCLUDED_KEYS.includes(key)) return;
      if (value !== null && value !== undefined && value !== '' && typeof value !== 'object') {
        params.set(key, String(value));
      }
    });

    const url = `${environment.URL_API}/structures/export?${params.toString()}`;
    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.get(url, { responseType: 'blob' as const, headers }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `structures_${new Date().getTime()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(objectUrl);
      },
      error: () => {
        this.exporting = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'exporter la liste." });
      },
    });
}}