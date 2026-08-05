import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';

// ⚠️ Interface calquée sur la table `rendez_vous` vue dans phpMyAdmin
// (id, nomprenoms, contact, statut, objet, date_seance, departement_id, gups_id,
// created_at, updated_at). Contrairement à demande_credits / aide_techniques, il n'y
// a PAS de relation `personne` ici : nomprenoms et contact sont des colonnes directes
// de la table, et il n'y a pas non plus de commune_id/arrondissement_id : la cascade
// géo s'arrête à Département -> GUPS (comme sur ta capture de filtres).
// Pas de fichier à uploader pour ce module (aucune colonne fichier en base).
export interface RendezVous {
  id: number;
  nomprenoms?: string | null;
  contact?: string | number | null; // numérique (numéro de téléphone)
  statut?: number | null; // 0 = En attente, 1 = Traité (à ajuster si le vrai mapping diffère)
  objet?: string | null;
  date_seance?: string | null;

  departement_id?: number | null;
  gups_id?: number | null;

  departement?: { id: number; libelle: string };
  gups?: { id: number; libelle: string };

  created_at?: string;
  updated_at?: string;
}

// Cascade géographique : Département -> GUPS (pas de commune/arrondissement ici)
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
  selector: 'app-rendezvous',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './rendezvous.component.html',
  styleUrl: './rendezvous.component.scss',
})
export class RendezvousComponent extends AbstractCrudComponent<RendezVous> implements OnInit {
  override resourceName: string = 'rendez_vous';
  override modalId: string = 'rendezVousModal';
  override deleteId: string = 'delete_rendez_vous';
  viewDetailsId: string = 'view_rendez_vous';
  override formData: boolean = false; // pas de fichiers -> JSON simple

  protected apiHttp = inject(HttpClient);
  protected activatedRoute = inject(ActivatedRoute);

  showForm: boolean = false;
  viewTarget: RendezVous | null = null;
  exporting: boolean = false;

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route
  // différente, voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

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
    statut: '',
    annee: '',
  };

  columns: Column[] = [
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    { field: 'nomprenoms', header: 'Nom et Prénom(s)', filterType: 'text' },
    { field: 'contact', header: 'Numéro', filterType: 'text' },
    {
      field: 'statut',
      header: 'Statut',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.statutBadge(row.statut),
    },
  ];

  globalFilterFields = ['nomprenoms', 'contact'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();

    // Lu depuis app.routes.ts : { path: Paths.RENDEZVOUS_SESSION, component: RendezvousComponent,
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
      this.setOrDeleteFilter('gups_id', geo.gups.id);
    } else {
      this.currentItem.departement_id = geo.departement.id || null;
      this.currentItem.gups_id = geo.gups.id || null;
    }
  }

  private initFormGeoFromItem(item: RendezVous): void {
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
      this.formGeo.gups.label = item.gups?.libelle || '';
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
    this.setOrDeleteFilter('statut', this.searchFilters.statut);
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
    }, 350);
  }

  // ===================== Badges =====================
  // ⚠️ Mapping 0/1 supposé (En attente / Traité) — dis-moi le vrai sens de `statut`
  // si ça ne correspond pas (ex : 1 = confirmé, 0 = annulé, etc.).
  private statutBadge(statut: any): string {
    if (statut == 1) return '<span class="badge-pill badge-pill-green">Traité</span>';
    if (statut == 0) return '<span class="badge-pill badge-pill-orange">En attente</span>';
    return '<span class="badge-pill badge-pill-gray">-</span>';
  }

  // ===================== Vue liste / formulaire plein écran =====================
  override showAddForm(): void {
    super.showAddForm();
    this.formGeo = emptyGeo();
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }
    this.currentItem = {
      id: 0,
      nomprenoms: '',
      contact: '',
      objet: '',
      date_seance: '',
      statut: 0,
      departement_id: null,
      gups_id: null,
    };
    this.showForm = true;
  }

  override editItem(item: RendezVous): void {
    super.editItem(item);
    // "datetime" en base -> l'input HTML "datetime-local" veut "YYYY-MM-DDTHH:mm"
    this.currentItem.date_seance = this.toDatetimeInputValue(item.date_seance);
    this.initFormGeoFromItem(item);
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: RendezVous): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: RendezVous): void {
    this.showForm = false;
  }

  showDetails(item: RendezVous): void {
    this.viewTarget = item;
  }

  // ===================== Dates =====================
  private toDatetimeInputValue(value: string | null | undefined): string {
    if (!value) return '';
    // "2026-08-02 10:30:00" ou ISO -> "2026-08-02T10:30"
    return value.replace(' ', 'T').substring(0, 16);
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '-';
    const cleaned = value.replace(' ', 'T');
    const datePart = cleaned.substring(0, 10);
    const timePart = cleaned.substring(11, 16);
    const [y, m, d] = datePart.split('-');
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}${timePart ? ' à ' + timePart : ''}`;
  }

  private getTokenFromCookie(): string {
    const match = document.cookie.match(/(?:^|;\s*)indicateurs_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  // ===================== Enregistrement =====================
  // Pas de fichier dans ce module -> simple payload JSON + PUT direct (pas besoin du
  // spoofing _method=PUT réservé aux formulaires multipart).
  override onSubmit(): void {
    if (this.currentItem && this.currentItem.id) {
      this.processing = true;
      const payload = {
        nomprenoms: this.currentItem.nomprenoms,
        contact: this.currentItem.contact,
        objet: this.currentItem.objet,
        date_seance: this.currentItem.date_seance,
        statut: this.currentItem.statut,
        departement_id: this.currentItem.departement_id,
        gups_id: this.currentItem.gups_id,
      };

      const url = `${environment.URL_API}/rendez_vous/${this.currentItem.id}`;
      const token = this.getTokenFromCookie();
      const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

      this.apiHttp.put(url, payload, { headers }).subscribe({
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
  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;

    const params = new URLSearchParams();
    Object.entries(this.filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params.set(key, String(value));
    });

    const url = `${environment.URL_API}/rendez_vous/export?${params.toString()}`;
    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.get(url, { responseType: 'blob' as const, headers }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `rendez_vous_${new Date().getTime()}.xlsx`;
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