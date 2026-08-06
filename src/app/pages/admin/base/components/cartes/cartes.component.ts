import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';
import { Subscription } from 'rxjs';

// ⚠️ La route réelle est "carte_egalites" (celle vue dans phpMyAdmin / utilisée
// dès le départ). "demande_cartes" n'existe pas côté backend, d'où l'erreur
// "The route api/demande_cartes could not be found".
export interface CarteEgalite {
  id: number;
  statut: number | null;
  statut_decision: number | null;
  annee: number | null;
  motif: string | null;
  rapport_enquete: any;
  certificat_medical: any;
  attestation_residence: any;
  piece_identite: any;
  photo_complete: any;
  personne_id: number | null;
  departement_id: number | null;
  gups_id: number | null;
  diss_session_id?: number | null;
  personne?: { id: number; nomprenoms: string; npi?: string; date_naissance?: string; sexe?: string };
  departement?: { id: number; libelle: string };
  gup?: { id: number; libelle: string };
  created_at?: string;
}

// Cascade géographique : Département -> GUPS uniquement pour Cartes
type GeoLevel = 'departement' | 'gups';

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
    gups: emptyGeoState(),
  };
}

const GEO_ORDER: GeoLevel[] = ['departement', 'gups'];
const GEO_NEXT_RESOURCE: { [key in GeoLevel]?: string } = {
  departement: 'gups',
};
const GEO_PARENT_PARAM: { [key in GeoLevel]?: string } = {
  departement: 'departement_id',
};

type SimpleKey = 'sessions';

@Component({
  selector: 'app-cartes',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './cartes.component.html',
  styleUrl: './cartes.component.scss',
})
export class CartesComponent extends AbstractCrudComponent<CarteEgalite> implements OnInit {
  override resourceName: string = 'carte_egalites';
  override modalId: string = 'cartesModal';
  override deleteId: string = 'delete_cartes';
  viewDetailsId: string = 'view_cartes';
  override formData: boolean = true;

  protected defaultIncludes = ['personne'];
  protected apiHttp = inject(HttpClient);
  protected activatedRoute = inject(ActivatedRoute);

  showForm: boolean = false;
  viewTarget: CarteEgalite | null = null;
  exporting: boolean = false;

  // ===================== Recherche du demandeur (personne_id) =====================
  // Affiché dans le formulaire sous forme "Nom Prénoms — NPI: xxxx", recherché
  // par nom ou NPI (PersonneController::$searchableFields le supporte déjà).
  personneLabel: string = '';
  personneResults: any[] = [];
  personneSearchOpen: boolean = false;
  private personneSearchDebounce: any;
  private personneSearchSub?: Subscription;

  selectedFiles: { [key: string]: File } = {};

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route
  // différente, voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

  // Cascade géo : filtres (liste) et formulaire, séparées
  filterGeo = emptyGeo();
  formGeo = emptyGeo();

  // Sessions (recherche simple, sans cascade)
  sessionsList: any[] = [];
  simpleFiltered: { [key in SimpleKey]: any[] } = { sessions: [] };
  simpleOpen: { [key in SimpleKey]: boolean } = { sessions: false };

  years: number[] = [];

  searchFilters = {
    search: '',
    session_id: '' as any,
    session_label: '',
    statut_decision: '',
    annee: '',
    statut: '',
  };

  columns: Column[] = [
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    { field: 'gup.libelle', header: 'GUPS', filterType: 'text' },
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
      formatter: (row: any) => this.formatDisplayDateTime(row.created_at),
    },
  ];

  globalFilterFields = ['personne.nomprenoms', 'personne.npi', 'motif'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();

    // Lu depuis app.routes.ts : { path: Paths.CARTES_SESSION, component: CartesComponent,
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

    // Arrivée depuis le menu "Faire une demande" de demandeurs.component.ts
    // (?personne_id=X&openForm=1) : on ouvre directement le formulaire d'ajout,
    // pré-rempli avec le demandeur, au lieu d'atterrir sur le tableau.
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['openForm'] && params['personne_id']) {
        setTimeout(() => {
          this.showAddForm();
          const pid = Number(params['personne_id']);
          this.currentItem.personne_id = pid;
          // On récupère le demandeur pour afficher son nom + NPI dans le champ
          // (sinon personne_id est bien envoyé mais rien ne s'affiche à l'écran).
          this.apiHttp.get<any>(`${environment.URL_API}/personnes/${pid}`).subscribe({
            next: (res: any) => {
              const p = res?.response ?? res?.data ?? res;
              if (p) {
                this.personneLabel = `${p.nomprenoms}${p.npi ? ' — NPI: ' + p.npi : ''}`;
              }
            },
          });
        }, 300);
      }
    });
  }

  private buildYearsRange(): void {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 2015; y--) list.push(y);
    this.years = list;
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

  private formatDisplayDateTime(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  private decisionBadge(statut: any): string {
    if (statut == 1) return '<span class="badge-pill badge-pill-green">Validé</span>';
    if (statut == 2) return '<span class="badge-pill badge-pill-red">Rejeté</span>';
    return '<span class="badge-pill badge-pill-gray">Non traité</span>';
  }

  // ============================================================
  //  CASCADE GÉOGRAPHIQUE (Département -> GUPS)
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
      this.setOrDeleteFilter('gups_id', geo.gups.id);
    } else {
      this.currentItem.departement_id = geo.departement.id || null;
      this.currentItem.gups_id = geo.gups.id || null;
    }
  }

  private initFormGeoFromItem(item: CarteEgalite): void {
    this.formGeo = emptyGeo();
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }
    if (item.departement_id) {
      this.formGeo.departement.id = item.departement_id;
      this.formGeo.departement.label = item.departement?.libelle || '';
      this.resourceService
        .loadResource<any>('gups', { paginate: true, params: { all: '1', departement_id: item.departement_id } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? [];
          this.formGeo.gups.list = list;
          this.formGeo.gups.filtered = list;
        });
    }
    if (item.gups_id) {
      this.formGeo.gups.id = item.gups_id;
      this.formGeo.gups.label = item.gup?.libelle || '';
    }
  }

  // ===================== Sessions (recherche simple) =====================
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

  // ===================== Demandeur (recherche par nom ou NPI) =====================
  onPersonneInput(term: string): void {
    clearTimeout(this.personneSearchDebounce);
    // On annule la requête HTTP précédente si elle est encore en vol : sinon, en tapant
    // vite un NPI/nom complet, chaque frappe envoie sa propre requête et elles s'empilent
    // (la dernière — celle avec le texte complet — doit alors attendre que toutes les
    // précédentes soient terminées, d'où les "plusieurs minutes" d'attente observées).
    this.personneSearchSub?.unsubscribe();

    const t = (term || '').trim();
    this.currentItem.personne_id = null;

    if (!t) {
      // Champ vidé : on republie directement la liste par défaut (pas d'attente).
      this.loadDefaultPersonneList();
      return;
    }

    this.personneSearchDebounce = setTimeout(() => {
      this.personneSearchSub = this.resourceService
        .loadResource<any>('personnes', { paginate: true, params: { search: t, per_page: 10 } as any })
        .subscribe((res: any) => {
          this.personneResults = res?.response?.data ?? [];
          this.personneSearchOpen = true;
        });
    }, 300);
  }

  onPersonneFocus(): void {
    // Dès qu'on clique dans le champ (même vide), on affiche une liste de demandeurs
    // pour ne pas obliger à taper avant de voir quoi que ce soit.
    if (!this.personneResults.length) {
      this.loadDefaultPersonneList();
    } else {
      this.personneSearchOpen = true;
    }
  }

  private loadDefaultPersonneList(): void {
    this.personneSearchSub?.unsubscribe();
    // Pas de tri explicite ici : on suppose l'ordre par défaut du backend (souvent les
    // plus récents en premier). Si ce n'est pas le cas, ajoute le paramètre de tri que
    // ton API attend réellement (ex: sort=-created_at ou sort_by=created_at&sort_dir=desc).
    this.personneSearchSub = this.resourceService
      .loadResource<any>('personnes', { paginate: true, params: { per_page: 10 } as any })
      .subscribe((res: any) => {
        this.personneResults = res?.response?.data ?? [];
        this.personneSearchOpen = true;
      });
  }

  onPersonneBlur(): void {
    setTimeout(() => (this.personneSearchOpen = false), 200);
  }

  selectPersonne(item: any): void {
    this.personneSearchSub?.unsubscribe();
    this.currentItem.personne_id = item.id;
    this.personneLabel = `${item.nomprenoms}${item.npi ? ' — NPI: ' + item.npi : ''}`;
    this.personneSearchOpen = false;
  }

  clearPersonne(): void {
    this.personneSearchSub?.unsubscribe();
    this.currentItem.personne_id = null;
    this.personneLabel = '';
    this.personneResults = [];
  }

  applyFilters(): void {
    this.setOrDeleteFilter('statut_decision', this.searchFilters.statut_decision);
    this.setOrDeleteFilter('annee', this.searchFilters.annee);
    this.setOrDeleteFilter('statut', this.searchFilters.statut);
    this.setOrDeleteFilter('session_id', this.searchFilters.session_id);
    this.data = [];
    this.loadData();
  }

  // ===================== Recherche texte (avec debounce) =====================
  private searchDebounce: any;
  onTableSearch(term: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.setOrDeleteFilter('search', (term || '').trim());
      this.data = [];
      this.loadData();
    }, 350);
  }

  // ===================== Vue liste / formulaire plein écran =====================
  override showAddForm(): void {
    super.showAddForm();
    this.selectedFiles = {};
    this.personneLabel = '';
    this.personneResults = [];
    this.formGeo = emptyGeo();
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }
    this.currentItem = {
      id: 0,
      statut: 0,
      statut_decision: null,
      annee: new Date().getFullYear(),
      motif: '',
      rapport_enquete: null,
      certificat_medical: null,
      attestation_residence: null,
      piece_identite: null,
      photo_complete: null,
      personne_id: null,
      departement_id: null,
      gups_id: null,
    };
    this.showForm = true;
  }

  override editItem(item: CarteEgalite): void {
    super.editItem(item);
    this.selectedFiles = {};
    this.personneLabel = item.personne
      ? `${item.personne.nomprenoms}${item.personne.npi ? ' — NPI: ' + item.personne.npi : ''}`
      : '';
    this.initFormGeoFromItem(item);
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  showDetails(item: CarteEgalite): void {
    this.viewTarget = item;
  }

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

  // Lit le token depuis le cookie `indicateurs_token` (c'est là que le projet
  // le stocke réellement, pas dans le localStorage).
  private getTokenFromCookie(): string {
    const match = document.cookie.match(/(?:^|;\s*)indicateurs_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    const simpleFields = ['statut', 'statut_decision', 'annee', 'motif', 'personne_id', 'departement_id', 'gups_id'];
    simpleFields.forEach((key) => {
      const val = (this.currentItem as any)[key];
      if (val !== null && val !== undefined) formData.append(key, val);
    });
    ['rapport_enquete', 'certificat_medical', 'attestation_residence', 'piece_identite', 'photo_complete'].forEach((field) => {
      if (this.selectedFiles[field]) formData.append(field, this.selectedFiles[field]);
    });
    return formData;
  }

  // Soumission directe (POST + _method=PUT en modification) avec le vrai token :
  // évite tous les soucis vus précédemment avec la conversion FormData générique.
  override onSubmit(): void {
    this.processing = true;
    const formData = this.buildFormData();
    const isUpdate = this.editMode && !!this.currentItem?.id;

    let url = `${environment.URL_API}/carte_egalites`;
    if (isUpdate) {
      url += `/${this.currentItem.id}`;
      formData.append('_method', 'PUT');
    }

    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.post(url, formData, { headers }).subscribe({
      next: () => {
        this.processing = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: isUpdate ? 'La demande a été modifiée avec succès.' : 'La demande a été ajoutée avec succès.',
        });
        this.showForm = false;
        this.loadData();
      },
      error: (err) => {
        this.processing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || "Erreur lors de l'enregistrement.",
        });
      },
    });
  }

  // Clés de pagination/méta injectées dans this.filter par le composant parent —
  // à exclure de l'export, sinon l'URL devient invalide (ex: meta=[object Object]).
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

    const url = `${environment.URL_API}/carte_egalites/export?${params.toString()}`;
    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.get(url, { responseType: 'blob' as const, headers }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `cartes_egalites_${new Date().getTime()}.xlsx`;
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
              const parsed = JSON.parse(reader.result as string);
              detail = parsed.message || detail;
            } catch {}
            this.messageService.add({ severity: 'error', summary: 'Erreur export', detail, life: 8000 });
          };
          reader.readAsText(errorBlob);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: `Erreur ${error?.status ?? ''} : impossible d'exporter la liste des cartes d'égalité.`,
          });
        }
      },
    });
  }
}