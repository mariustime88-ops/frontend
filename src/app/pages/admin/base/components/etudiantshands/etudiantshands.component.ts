import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';
import { SEARCH_DEBOUNCE_MS } from '@app/cores/constants/search.constants';
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
  quartier?: { id: number; libelle: string };
  created_at?: string;
}

// Cascade géographique : Département -> Commune -> Arrondissement -> Quartier
// (les filtres n'utilisent que les 3 premiers niveaux, comme avant ; le formulaire
// utilise les 4 niveaux, comme pour les autres modules déjà faits)
type GeoLevel = 'departement' | 'commune' | 'arrondissement' | 'quartier';

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
    quartier: emptyGeoState(),
  };
}

const FILTER_GEO_ORDER: GeoLevel[] = ['departement', 'commune', 'arrondissement'];
const FORM_GEO_ORDER: GeoLevel[] = ['departement', 'commune', 'arrondissement', 'quartier'];
const GEO_NEXT_RESOURCE: { [key in GeoLevel]?: string } = {
  departement: 'communes',
  commune: 'arrondissements',
  arrondissement: 'quartiers',
};
const GEO_PARENT_PARAM: { [key in GeoLevel]?: string } = {
  departement: 'departement_id',
  commune: 'commune_id',
  arrondissement: 'arrondissement_id',
};

type SimpleKey = 'sessions';

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
  protected activatedRoute = inject(ActivatedRoute);

  // Vue liste <-> formulaire plein écran (comme les autres modules)
  showForm: boolean = false;

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route
  // différente, voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

  // Cascade géo : filtres (Département -> Commune -> Arrondissement)
  filterGeo = emptyGeo();
  // Cascade géo : formulaire (Département -> Commune -> Arrondissement -> Quartier)
  formGeo = emptyGeo();

  sessionsList: any[] = [];
  simpleFiltered: { [key in SimpleKey]: any[] } = { sessions: [] };
  simpleOpen: { [key in SimpleKey]: boolean } = { sessions: false };

  years: number[] = [];

  exporting: boolean = false;
  viewTarget: EtudiantHandicap | null = null;

  // Fichiers sélectionnés (avant envoi) — stockés à part pour ne pas
  // perturber les autres champs texte de currentItem.
  selectedFiles: { [key: string]: File } = {};

  searchFilters = {
    search: '',
    statut: '',
    paiement: '',
    annee: '',
    session_id: '' as any,
    session_label: '',
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

    // Lu depuis app.routes.ts : { path: Paths.ETUDIANTSHANDS_SESSION, component: EtudiantshandsComponent,
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

  private decisionBadge(statut: any): string {
    if (statut == 1) return '<span class="badge-pill badge-pill-green">Favorable</span>';
    if (statut == 2) return '<span class="badge-pill badge-pill-red">Non favorable</span>';
    return '<span class="badge-pill badge-pill-gray">Pas de décision</span>';
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

  private orderFor(target: 'filterGeo' | 'formGeo'): GeoLevel[] {
    return target === 'filterGeo' ? FILTER_GEO_ORDER : FORM_GEO_ORDER;
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
    const order = this.orderFor(target);
    const idx = order.indexOf(level);
    if (idx === 0) return false;
    const parentLevel = order[idx - 1];
    return !this.geoStateOf(target)[parentLevel].id;
  }

  selectGeoOption(target: 'filterGeo' | 'formGeo', level: GeoLevel, item: any): void {
    const geo = this.geoStateOf(target);
    const order = this.orderFor(target);
    geo[level].id = item.id;
    geo[level].label = item.libelle;
    geo[level].open = false;

    const idx = order.indexOf(level);
    for (let i = idx + 1; i < order.length; i++) {
      geo[order[i]] = emptyGeoState();
    }

    this.loadNextGeoLevel(target, level, item.id);
    this.syncGeoToModel(target);
    if (target === 'filterGeo') this.applyFilters();
  }

  clearGeoOption(target: 'filterGeo' | 'formGeo', level: GeoLevel): void {
    const geo = this.geoStateOf(target);
    const order = this.orderFor(target);
    const idx = order.indexOf(level);
    for (let i = idx; i < order.length; i++) {
      geo[order[i]] = emptyGeoState();
    }
    this.syncGeoToModel(target);
    if (target === 'filterGeo') this.applyFilters();
  }

  private loadNextGeoLevel(target: 'filterGeo' | 'formGeo', level: GeoLevel, parentId: any): void {
    const order = this.orderFor(target);
    const nextResource = GEO_NEXT_RESOURCE[level];
    const parentParam = GEO_PARENT_PARAM[level];
    const nextLevel = order[order.indexOf(level) + 1];
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
      this.currentItem.quartier_id = geo.quartier.id || null;
    }
  }

  private initFormGeoFromItem(item: EtudiantHandicap): void {
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
      this.resourceService
        .loadResource<any>('quartiers', { paginate: true, params: { all: '1', arrondissement_id: item.arrondissement_id } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? [];
          this.formGeo.quartier.list = list;
          this.formGeo.quartier.filtered = list;
        });
    }
    if (item.quartier_id) {
      this.formGeo.quartier.id = item.quartier_id;
      this.formGeo.quartier.label = item.quartier?.libelle || '';
    }
  }

  // ===================== Sessions (filtre simple recherchable) =====================
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

  // ===================== Selects simples (auto-filtrants) =====================
  onSimpleSelectChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.setOrDeleteFilter('statut', this.searchFilters.statut);
    this.setOrDeleteFilter('paiement', this.searchFilters.paiement);
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

  // ===================== Vue liste / formulaire plein écran =====================
  override showAddForm(): void {
    super.showAddForm();
    this.formGeo = emptyGeo();
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }
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
    this.showForm = true;
  }

  override editItem(item: EtudiantHandicap): void {
    super.editItem(item);
    // Force la copie pour s'assurer que l'ID et toutes les propriétés sont bien liés au formulaire
    this.currentItem = { ...item };
    this.selectedFiles = {};
    this.initFormGeoFromItem(item);
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: EtudiantHandicap): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: EtudiantHandicap): void {
    this.showForm = false;
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
    ['fiche_inscription', 'carte_egalite', 'piece_identite', 'photo_complete', 'rib'].forEach((field) => {
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
    const base = environment.URL_API.replace(/\/api\/?$/, '');
    return `${base}/storage/${path}`;
  }

  // --- Export Excel (inchangé) ---
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