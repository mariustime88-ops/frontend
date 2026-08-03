import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';

// ⚠️ Interface calquée sur la table `demande_credits` vue dans phpMyAdmin
// (id, domaine_activite, objectif, montant, denomination, projet, plan_affaire,
// statut, personne_id, departement_id, commune_id, gups_id, user_id, ...).
// Les infos du demandeur (Nom et Prénoms, Date de Naissance, Sexe, Contact, NPI)
// viennent de la relation `personne` (personne_id) et sont en lecture seule ici.
// ⚠️ Le formulaire (capture fournie) affiche aussi "Identifiant Fiscal", "Relevé
// Bancaire", "Carte d'Égalité ou Récépissé de dépôt" et "Carte Nationale", qui
// n'apparaissaient PAS dans la structure de table que tu m'as montrée (seules
// `projet` et `plan_affaire` existent comme colonnes fichier). Je les ai quand même
// ajoutés au formulaire avec des noms de champs "logiques" (identifiant_fiscal,
// releve_bancaire, carte_egalite, carte_nationale) — si ton backend stocke ces
// fichiers autrement (ex: table `documents` polymorphe, que j'ai vue dans ta liste
// de tables phpMyAdmin), dis-le-moi et j'adapte `buildFormData()` en conséquence.
export interface DemandeCredit {
  id: number;
  domaine_activite?: string | null;
  objectif?: string | null;
  montant?: number | string | null;
  denomination?: string | null;
  projet?: any;
  plan_affaire?: any;
  identifiant_fiscal?: any;
  releve_bancaire?: any;
  carte_egalite?: any;
  carte_nationale?: any;
  statut?: string | null;

  personne_id?: number | null;
  departement_id?: number | null;
  commune_id?: number | null;
  gups_id?: number | null;
  user_id?: number | null;

  personne?: {
    id: number;
    nom_prenoms?: string;
    sexe?: string;
    contact?: string;
    npi?: string;
    date_naissance?: string;
  };
  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  gups?: { id: number; libelle: string };

  created_at?: string;
  updated_at?: string;
}

// Cascade géographique : Département -> Commune -> GUPS
// (utilisée avec 2 niveaux dans les filtres, 3 niveaux dans le formulaire)
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
  selector: 'app-demandescre',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './demandescre.component.html',
  styleUrl: './demandescre.component.scss',
})
export class DemandescreComponent extends AbstractCrudComponent<DemandeCredit> implements OnInit {
  override resourceName: string = 'demande_credits';
  override modalId: string = 'demandeCreditModal';
  override deleteId: string = 'delete_demande_credit';
  viewDetailsId: string = 'view_demande_credit';
  override formData: boolean = true;

  protected apiHttp = inject(HttpClient);
  protected activatedRoute = inject(ActivatedRoute);

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route
  // différente, voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

  // Vue liste <-> formulaire plein écran
  showForm: boolean = false;
  viewTarget: DemandeCredit | null = null;
  exporting: boolean = false;

  selectedFiles: { [key: string]: File } = {};

  // Cascade géo : filtres (Département -> Commune uniquement, comme sur la liste)
  filterGeo = emptyGeo();
  // Cascade géo : formulaire (Département -> Commune -> GUPS)
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
    {
      field: 'personne.nomprenoms',
      header: 'Nom et Prénoms',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.getDemandeurNom(row),
    },
    { field: 'personne.sexe', header: 'Sexe', filterType: 'text' },
    { field: 'personne.contact', header: 'Contact', filterType: 'text' },
    {
      field: 'statut',
      header: 'Statut',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.statutBadge(row.statut),
    },
    {
      field: 'personne.npi',
      header: 'NPI',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.getDemandeurNpi(row),
    },
  ];

  globalFilterFields = ['personne.nomprenoms', 'personne.contact', 'personne.npi'];

  // ⚠️ "Sexe" et "Contact" s'affichaient déjà correctement, donc la relation `personne`
  // est bien chargée par l'API — seuls les noms exacts de ces 2 champs ne correspondent
  // pas. Ces 2 méthodes essaient plusieurs noms de champs courants pour les deviner ;
  // dis-moi le vrai nom de champ retourné par ton API et je simplifie ça directement.
  getDemandeurNom(row: any): string {
    const p = row?.personne || {};
    if (p.nomprenoms) return p.nomprenoms;
    if (p.nom_prenoms) return p.nom_prenoms;
    if (p.nom_prenom) return p.nom_prenom;
    if (p.nom || p.prenoms || p.prenom) {
      return [p.nom, p.prenoms || p.prenom].filter(Boolean).join(' ');
    }
    return row?.nomprenoms || row?.nom_prenoms || '-';
  }

  getDemandeurNpi(row: any): string {
    const p = row?.personne || {};
    return p.npi || p.numero_npi || p.npi_number || p.numero_pi || row?.npi || '-';
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();

    // Lu depuis app.routes.ts : { path: Paths.DEMANDES_CREDIT_SESSION, component: DemandescreComponent,
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
    } else {
      this.currentItem.departement_id = geo.departement.id || null;
      this.currentItem.commune_id = geo.commune.id || null;
      this.currentItem.gups_id = geo.gups.id || null;
    }
  }

  private initFormGeoFromItem(item: DemandeCredit): void {
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
  private statutBadge(statut: any): string {
    const s = (statut || '').toString().toLowerCase();
    if (s.includes('attente')) return '<span class="badge-pill badge-pill-orange">En attente</span>';
    if (s.includes('valid') || s.includes('accord')) return '<span class="badge-pill badge-pill-green">Validé</span>';
    if (s.includes('rejet') || s.includes('refus')) return '<span class="badge-pill badge-pill-red">Rejeté</span>';
    return `<span class="badge-pill badge-pill-gray">${statut || '-'}</span>`;
  }

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
      domaine_activite: '',
      objectif: '',
      montant: null,
      denomination: '',
      statut: 'En attente',
      departement_id: null,
      commune_id: null,
      gups_id: null,
      personne_id: null,
    };
    this.showForm = true;
  }

  override editItem(item: DemandeCredit): void {
    super.editItem(item);
    this.selectedFiles = {};
    this.initFormGeoFromItem(item);
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: DemandeCredit): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: DemandeCredit): void {
    this.showForm = false;
  }

  showDetails(item: DemandeCredit): void {
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

  // ===================== Dates =====================
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
  private buildFormData(): FormData {
    const formData = new FormData();

    const simpleFields = ['domaine_activite', 'objectif', 'montant', 'denomination', 'departement_id', 'commune_id', 'gups_id'];
    simpleFields.forEach((key) => {
      const val = (this.currentItem as any)[key];
      if (val !== null && val !== undefined) formData.append(key, val);
    });

    ['projet', 'plan_affaire', 'identifiant_fiscal', 'releve_bancaire', 'carte_egalite', 'carte_nationale'].forEach((field) => {
      if (this.selectedFiles[field]) formData.append(field, this.selectedFiles[field]);
    });

    return formData;
  }

  // Même principe que pour dossier_triples : PUT-spoofing (formulaire multipart) +
  // token lu dans le cookie `indicateurs_token`.
  override onSubmit(): void {
    if (this.currentItem && this.currentItem.id) {
      this.processing = true;
      const formData = this.buildFormData();
      formData.append('_method', 'PUT');

      const url = `${environment.URL_API}/demande_credits/${this.currentItem.id}`;
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
  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;

    const params = new URLSearchParams();
    Object.entries(this.filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params.set(key, String(value));
    });

    const url = `${environment.URL_API}/demande_credits/export?${params.toString()}`;
    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.get(url, { responseType: 'blob' as const, headers }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `demandes_credit_${new Date().getTime()}.xlsx`;
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