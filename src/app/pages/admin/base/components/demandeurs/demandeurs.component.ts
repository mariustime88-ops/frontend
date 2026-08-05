import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';
import { Paths } from '@app/paths';

export interface Personne {
  id: number;
  code: string;
  npi: string;
  nomprenoms: string;
  age: number;
  date_naissance: string;
  statut: string;
  niveau_instruction: string;
  diplome_attestation: string;
  informations: string;
  contact: string;
  sexe: string;
  maison: string;
  isSalarie: boolean | number;
  isHandicap: boolean | number;
  departement_id: number | null;
  commune_id: number | null;
  arrondissement_id: number | null;
  quartier_id: number | null;
  profession_id: number | null;
  is_accompanied: boolean | number;
  nomprenoms_ac: string | null;
  contact_ac: string | null;
  lien: string | null;
  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  arrondissement?: { id: number; libelle: string };
  quartier?: { id: number; libelle: string };
  profession?: { id: number; libelle: string };
  installation_accordee?: boolean;
  created_at?: string;
}

// Cascade géographique : Département -> Commune -> Arrondissement -> Quartier
// (les filtres n'utilisent que les 3 premiers niveaux, comme avant ; le formulaire
// utilise les 4 niveaux, comme pour les autres modules qu'on a déjà faits)
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

type SimpleKey = 'sessions' | 'professions';

@Component({
  selector: 'app-demandeurs',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './demandeurs.component.html',
  styleUrl: './demandeurs.component.scss',
})
export class DemandeursComponent extends AbstractCrudComponent<Personne> implements OnInit {
  override resourceName: string = 'personnes';
  override modalId: string = 'personneModal';
  override deleteId: string = 'delete_personne';
  viewDetailsId: string = 'view_personne';

  protected apiHttp = inject(HttpClient);
  protected activatedRoute = inject(ActivatedRoute);

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route
  // différente, voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

  // Vue liste <-> formulaire plein écran (comme les autres modules)
  showForm: boolean = false;

  // Cascade géo : filtres (Département -> Commune -> Arrondissement)
  filterGeo = emptyGeo();
  // Cascade géo : formulaire (Département -> Commune -> Arrondissement -> Quartier)
  formGeo = emptyGeo();

  sessionsList: any[] = [];
  professionsList: any[] = [];
  simpleFiltered: { [key in SimpleKey]: any[] } = { sessions: [], professions: [] };
  simpleOpen: { [key in SimpleKey]: boolean } = { sessions: false, professions: false };
  // Texte affiché dans le champ recherchable "Profession" du formulaire
  professionLabel: string = '';

  years: number[] = [];

  exporting: boolean = false;
  viewTarget: Personne | null = null;
  openDropdownId: number | null = null;
  dropdownItem: Personne | null = null;
  dropdownPosition: { top: number; left: number } = { top: 0, left: 0 };

  searchFilters = {
    search: '',
    annee: '',
    session_id: '' as any,
    session_label: '',
    appuye: '',
  };

  columns: Column[] = [
    { field: 'nomprenoms', header: 'Nom et Prénoms', filterType: 'text' },
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    { field: 'age', header: 'Age', filterType: 'text' },
    { field: 'sexe', header: 'Sexe', filterType: 'text' },
    { field: 'npi', header: 'NPI', filterType: 'text' },
    {
      field: 'created_at',
      header: 'Date enreg.',
      filterType: 'text',
      formatter: (row: any) => this.formatDate(row.created_at),
    },
    {
      field: 'installation_accordee',
      header: 'Installation accordée',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) =>
        row.installation_accordee ? '<span class="badge-pill badge-pill-green">Oui</span>' : '',
    },
  ];

  globalFilterFields = ['nomprenoms', 'npi'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();

    // Lu depuis app.routes.ts : { path: Paths.DEMANDEURS_SESSION, component: DemandeursComponent,
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

    this.resourceService
      .loadResource<any>('professions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        this.professionsList = res?.response?.data ?? [];
        this.simpleFiltered.professions = this.professionsList;
      });
  }

  // ============================================================
  //  SESSION ACTIVE
  //  Cherche dans sessionsList la session avec is_actif = 1 (colonne de `diss_sessions`)
  //  et verrouille dessus les filtres + le tableau. S'il n'y a aucune session en cours,
  //  on vide simplement la liste (rien à afficher).
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

  private initFormGeoFromItem(item: Personne): void {
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

  // ===================== Profession (champ recherchable du formulaire) =====================
  onProfessionInput(term: string): void {
    const t = (term || '').toLowerCase().trim();
    this.simpleFiltered.professions = t
      ? this.professionsList.filter((p) => (p.libelle || '').toLowerCase().includes(t))
      : this.professionsList;
    this.simpleOpen.professions = true;
  }

  onProfessionFocus(): void {
    this.simpleFiltered.professions = this.professionsList;
    this.simpleOpen.professions = true;
  }

  onProfessionBlur(): void {
    setTimeout(() => (this.simpleOpen.professions = false), 200);
  }

  selectProfession(item: any): void {
    this.currentItem.profession_id = item.id;
    this.professionLabel = item.libelle;
    this.simpleOpen.professions = false;
  }

  clearProfession(): void {
    this.currentItem.profession_id = null;
    this.professionLabel = '';
  }

  // ===================== Selects simples (auto-filtrants) =====================
  onSimpleSelectChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.setOrDeleteFilter('search', this.searchFilters.search);
    this.setOrDeleteFilter('annee', this.searchFilters.annee);
    this.setOrDeleteFilter('session_id', this.searchFilters.session_id);
    this.setOrDeleteFilter('appuye', this.searchFilters.appuye);
    this.data = [];
    this.loadData();
  }

  private searchDebounce: any;

  onTableSearch(term: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.searchFilters.search = term;
      this.setOrDeleteFilter('search', (term || '').trim());
      this.data = [];
      this.loadData();
    }, 350);
  }

  // ===================== Vue liste / formulaire plein écran =====================
  override showAddForm(): void {
    super.showAddForm();
    this.formGeo = emptyGeo();
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    }
    this.professionLabel = '';
    this.currentItem = {
      id: 0,
      code: '',
      npi: '',
      nomprenoms: '',
      age: 0,
      date_naissance: '',
      statut: '',
      niveau_instruction: '',
      diplome_attestation: '',
      informations: '',
      contact: '',
      sexe: '',
      maison: '',
      isSalarie: 0,
      isHandicap: 0,
      departement_id: null,
      commune_id: null,
      arrondissement_id: null,
      quartier_id: null,
      profession_id: null,
      is_accompanied: 0,
      nomprenoms_ac: '',
      contact_ac: '',
      lien: '',
    };
    this.showForm = true;
  }

  override editItem(item: Personne): void {
    super.editItem(item);
    this.initFormGeoFromItem(item);
    this.professionLabel = item.profession?.libelle || '';
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: Personne): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: Personne): void {
    this.showForm = false;
  }

  // --- Voir détails ---
  showDetails(item: Personne): void {
    this.viewTarget = item;
  }

  // --- Menu "Faire une demande" (inchangé) ---
  toggleDropdown(item: Personne, event: MouseEvent): void {
    if (this.openDropdownId === item.id) {
      this.openDropdownId = null;
      this.dropdownItem = null;
      return;
    }
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeightEstimate = 220;

    this.dropdownPosition = {
      top: rect.top + window.scrollY - menuHeightEstimate - 4,
      left: Math.min(rect.right + window.scrollX - menuWidth, window.innerWidth - menuWidth - 8),
    };
    this.openDropdownId = item.id;
    this.dropdownItem = item;
  }

  closeDropdown(): void {
    this.openDropdownId = null;
    this.dropdownItem = null;
  }

  // ⚠️ Correctif : les chemins utilisés ici ('staff/demandes-installation', etc.)
  // n'existaient dans aucune route déclarée (app.routes.ts définit
  // 'staff/base/demandesins', 'staff/base/demandescre', 'staff/base/cartes',
  // 'staff/base/aides') -> Angular ne trouvait pas de route correspondante et
  // retombait sur l'écran par défaut (le tableau), d'où le souci.
  // On utilise maintenant les vraies valeurs de Paths, + un flag `openForm=1`
  // que chaque composant cible lit dans son ngOnInit() pour ouvrir directement
  // le formulaire d'ajout au lieu du tableau (voir *.component.ts correspondants).
  goToDemande(type: 'installation' | 'credit' | 'carte' | 'aide', item: Personne): void {
    this.closeDropdown();
    const routes: Record<string, string> = {
      installation: Paths.DEMANDESINS,
      credit: Paths.DEMANDESCRE,
      carte: Paths.CARTES,
      aide: Paths.AIDES,
    };
    this.router.navigate([routes[type]], {
      queryParams: { personne_id: item.id, openForm: '1' },
    });
  }

  ajouterSessionActive(item: Personne): void {
    this.closeDropdown();
    const url = `${environment.URL_API}/personnes/${item.id}/add-to-session`;
    this.apiHttp.patch<any>(url, {}).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ajouté',
          detail: `"${item.nomprenoms}" a été ajouté à la session active.`,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: "Impossible d'ajouter cette personne à la session active.",
        });
      },
    });
  }

  // --- Export Excel (inchangé) ---
  private getTokenFromCookie(): string {
    const match = document.cookie.match(/(?:^|;\s*)indicateurs_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
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

    const url = `${environment.URL_API}/personnes/export?${params.toString()}`;
    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.get(url, { responseType: 'blob', headers }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `demandeurs_${new Date().getTime()}.xlsx`;
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
            detail: `Erreur ${error?.status ?? ''} : impossible d'exporter la liste des demandeurs.`,
          });
        }
      },
    });}}