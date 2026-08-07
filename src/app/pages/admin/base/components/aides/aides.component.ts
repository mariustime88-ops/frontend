import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';
import { SEARCH_DEBOUNCE_MS } from '@app/cores/constants/search.constants';
export interface AideTechnique {
  id: number;
  materiel?: string | null;
  personne_id?: number | null;
  departement_id?: number | null;
  commune_id?: number | null;
  gups_id?: number | null;
  user_id?: number | null;
  personne?: {
    id: number;
    nomprenoms?: string;
    sexe?: string;
    contact?: string;
    npi?: string;
    date_naissance?: string;
  };
  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  gups?: { id: number; libelle: string };
  user?: { id: number; name?: string; gups?: { id: number; libelle: string } };
  created_at?: string;
  updated_at?: string;
}

type GeoLevel = 'departement' | 'commune' | 'gups';

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
  };
}

const GEO_ORDER: GeoLevel[] = ['departement', 'commune', 'gups'];
const GEO_NEXT_RESOURCE: { [key in GeoLevel]?: string } = {
  departement: 'communes',
  commune: 'gups',
};
const GEO_PARENT_PARAM: { [key in GeoLevel]?: string } = {
  departement: 'departement_id',
  commune: 'commune_id',
};

type SimpleKey = 'sessions';

@Component({
  selector: 'app-aides',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './aides.component.html',
  styleUrl: './aides.component.scss',
})
export class AidesComponent extends AbstractCrudComponent<AideTechnique> implements OnInit {
  override resourceName: string = 'aide_techniques';
  override modalId: string = 'aideTechModal';
  override deleteId: string = 'delete_aide_tech';
  viewDetailsId: string = 'view_aide_tech';
  override formData: boolean = true;

  protected apiHttp = inject(HttpClient);
  protected activatedRoute = inject(ActivatedRoute);

  showForm: boolean = false;
  viewTarget: AideTechnique | null = null;
  exporting: boolean = false;

  sessionScoped: boolean = false;
  activeSession: any = null;

  filterGeo = emptyGeo();
  formGeo = emptyGeo();

  sessionsList: any[] = [];
  simpleFiltered: { [key in SimpleKey]: any[] } = { sessions: [] };
  simpleOpen: { [key in SimpleKey]: boolean } = { sessions: false };

  years: number[] = [];

  // ===================== Gestion des personnes =====================
  personnesList: any[] = [];
  personnesFiltered: any[] = [];
  personnesOpen: boolean = false;
  personnesSearch: string = '';

  searchFilters = {
    search: '',
    session_id: '' as any,
    session_label: '',
    annee: '',
  };

  columns: Column[] = [
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    {
      field: 'personne.nomprenoms',
      header: 'Demandeur',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.getDemandeurNom(row),
    },
    {
      field: 'personne.npi',
      header: 'NPI',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.getDemandeurNpi(row),
    },
    { field: 'materiel', header: 'Matériel sollicité', filterType: 'text' },
  ];

  globalFilterFields = ['personne.nomprenoms', 'personne.npi', 'materiel'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();
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
        if (this.sessionScoped) {
          this.lockToActiveSession();
        }
      });

    // Arrivée depuis "Faire une demande" avec personne_id
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['openForm'] && params['personne_id']) {
        setTimeout(() => {
          this.showAddForm();
          this.currentItem.personne_id = Number(params['personne_id']);
          const p = this.personnesList.find(x => x.id === Number(params['personne_id']));
          if (p) this.personnesSearch = p.nomprenoms;
        }, 300);
      }
    });
  }

  private lockToActiveSession(): void {
    this.activeSession = this.sessionsList.find((s: any) => s.is_actif == 1) || null;
    if (!this.activeSession) {
      this.data = [];
      return;
    }
    this.searchFilters.session_id = this.activeSession.id;
    this.searchFilters.session_label = this.activeSession.libelle;
    this.filter['includes'] = 'personne,departement,commune,gups';
    this.setOrDeleteFilter('session_id', this.activeSession.id);
    this.loadData();
  }

  private buildYearsRange(): void {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 2015; y--) list.push(y);
    this.years = list;
  }

  // ===================== Géo =====================
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
    } else {
      this.currentItem.departement_id = geo.departement.id || null;
      this.currentItem.commune_id = geo.commune.id || null;
      this.currentItem.gups_id = geo.gups.id || null;
    }
  }

  private initFormGeoFromItem(item: AideTechnique): void {
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
        .loadResource<any>('gups', { paginate: true, params: { all: '1', commune_id: item.commune_id } as any })
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

  // ===================== Sessions =====================
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
  // ===================== Demandeur (personne) =====================
  loadPersonnes() {
    this.resourceService.loadResource<any>('personnes', { params: { all: '1' } })
      .subscribe((res: any) => {
        let data: any[] = [];
        if (Array.isArray(res)) {
          data = res;
        } else if (res && typeof res === 'object' && 'response' in res) {
          data = res.response?.data ?? [];
        } else if (res?.data) {
          data = res.data;
        } else {
          data = res || [];
        }
        this.personnesList = data.map((p: any) => ({
          id: p.id,
          nomprenoms: p.nomprenoms,
          npi: p.npi,
          contact: p.contact
        }));
        this.personnesFiltered = this.personnesList;
      });
  }

  onPersonneInput(value: string) {
    this.personnesSearch = value;
    const term = value.toLowerCase().trim();
    if (term) {
      this.personnesFiltered = this.personnesList.filter(p =>
        p.nomprenoms.toLowerCase().includes(term) ||
        (p.npi && p.npi.includes(term))
      );
    } else {
      this.personnesFiltered = this.personnesList;
    }
    this.personnesOpen = true;
  }

  onPersonneFocus() {
    this.personnesFiltered = this.personnesList;
    this.personnesOpen = true;
  }

  onPersonneBlur() {
    setTimeout(() => (this.personnesOpen = false), 200);
  }

  selectPersonne(p: any) {
    this.currentItem.personne_id = p.id;
    this.personnesSearch = p.nomprenoms + (p.npi ? ' (NPI: ' + p.npi + ')' : '');
    this.personnesOpen = false;
  }

  clearPersonne() {
    this.currentItem.personne_id = null;
    this.personnesSearch = '';
    this.personnesFiltered = this.personnesList;
  }

  getDemandeurNom(row: any): string {
    const p = row?.personne || {};
    if (p.nomprenoms) return p.nomprenoms;
    if (p.nom_prenoms) return p.nom_prenoms;
    if (p.nom || p.prenoms || p.prenom) {
      return [p.nom, p.prenoms || p.prenom].filter(Boolean).join(' ');
    }
    return row?.nomprenoms || '-';
  }

  getDemandeurNpi(row: any): string {
    const p = row?.personne || {};
    return p.npi || p.numero_npi || row?.npi || '-';
  }

  getAjoutePar(item: AideTechnique | null): string {
    if (!item) return '-';
    return item.user?.gups?.libelle || item.user?.name || '-';
  }

  // ===================== Formulaire =====================
  override showAddForm(): void {
    super.showAddForm();
    this.formGeo = emptyGeo();
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }
    this.currentItem = {
      id: 0,
      materiel: '',
      departement_id: null,
      commune_id: null,
      gups_id: null,
      personne_id: null,
    };
    this.personnesSearch = '';
    this.personnesFiltered = [];
    this.personnesOpen = false;
    this.showForm = true;
    this.loadPersonnes();
  }

  override editItem(item: AideTechnique): void {
    super.editItem(item);
    this.initFormGeoFromItem(item);
    if (item.personne_id && item.personne) {
      this.personnesSearch = item.personne.nomprenoms || '';
    } else {
      this.personnesSearch = '';
    }
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: AideTechnique): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: AideTechnique): void {
    this.showForm = false;
  }

  showDetails(item: AideTechnique): void {
    this.viewTarget = item;
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '-';
    const datePart = value.substring(0, 10);
    const [y, m, d] = datePart.split('-');
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }

  private getTokenFromCookie(): string {
    const match = document.cookie.match(/(?:^|;\s*)indicateurs_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  // ===================== Enregistrement =====================
  override onSubmit(): void {
    // Construction du payload incluant personne_id
    const payload = {
      materiel: this.currentItem.materiel,
      departement_id: this.currentItem.departement_id,
      commune_id: this.currentItem.commune_id,
      gups_id: this.currentItem.gups_id,
      personne_id: this.currentItem.personne_id,
    };

    if (this.currentItem && this.currentItem.id) {
      // Mise à jour
      this.processing = true;
      const url = `${environment.URL_API}/aide_techniques/${this.currentItem.id}`;
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
      // Création : on utilise la méthode parente (POST) avec le payload
      this.processing = true;
      const token = this.getTokenFromCookie();
      const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};
      this.apiHttp.post(`${environment.URL_API}/aide_techniques`, payload, { headers }).subscribe({
        next: () => {
          this.processing = false;
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Demande ajoutée avec succès.' });
          this.showForm = false;
          this.loadData();
        },
        error: (err) => {
          this.processing = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message || "Erreur lors de l'ajout." });
        },
      });
    }
  }

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

    const url = `${environment.URL_API}/aide_techniques/export?${params.toString()}`;
    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.get(url, { responseType: 'blob' as const, headers }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `aide_techniques_${new Date().getTime()}.xlsx`;
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