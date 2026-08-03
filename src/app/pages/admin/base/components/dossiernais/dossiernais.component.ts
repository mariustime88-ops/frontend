import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';

// ⚠️ Interface calquée sur la table `dossier_triples` vue dans phpMyAdmin.
// Les 3 blocs "Enfant 1/2/3" (nom, sexe, fiche de naissance) sont saisis séparément
// dans le formulaire puis regroupés en `nom_prenoms_enfants` / `sexe_enfants`
// (chaînes séparées par des virgules) au moment de l'enregistrement, car la table
// ne contient qu'une seule colonne pour chacun de ces champs.
export interface DossierTriple {
  id: number;
  nom_pere: string;
  nom_mere: string;
  numero_pere?: string | null;
  numero_mere?: string | null;
  numero_celtis?: string | null;

  enfant1_nom?: string;
  enfant1_sexe?: string;
  enfant1_fiche_naissance?: any;
  enfant2_nom?: string;
  enfant2_sexe?: string;
  enfant2_fiche_naissance?: any;
  enfant3_nom?: string;
  enfant3_sexe?: string;
  enfant3_fiche_naissance?: any;

  nom_prenoms_enfants?: string;
  sexe_enfants?: string;
  fiche_naissance?: any;

  date_naissance?: string | null;
  type?: string | null;
  contact?: string | null;
  avis?: number | string | null;
  rapport_enquete?: any;
  fiche_constat?: any;
  carte_identite?: any;
  photo_complete?: any;
  numero_piece?: string | null;
  montant?: number | null;
  statut_dossier?: number | string | null;
  numero?: string | null;
  observations?: string | null;
  recommandation?: string | null;

  departement_id?: number | null;
  arrondissement_id?: number | null;
  commune_id?: number | null;
  quartier_id?: number | null;
  gups_id?: number | null;
  user_id?: number | null;

  departement?: { id: number; libelle: string };
  arrondissement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  quartier?: { id: number; libelle: string };
  gups?: { id: number; libelle: string };

  created_at?: string;
  updated_at?: string;
}

// Ordre de la cascade géographique demandée :
// Département -> Commune -> GUPS -> Arrondissement -> Quartier/Village
type GeoLevel = 'departement' | 'commune' | 'gups' | 'arrondissement' | 'quartier';

interface GeoState {
  list: any[];      // options actuellement proposées (déjà filtrées par le parent)
  filtered: any[];   // options affichées dans la liste déroulante (recherche texte)
  open: boolean;     // liste déroulante ouverte ?
  label: string;     // texte tapé / affiché dans le champ
  id: any;           // id sélectionné
}

function emptyGeoState(): GeoState {
  return { list: [], filtered: [], open: false, label: '', id: '' };
}

function emptyGeo(): { [key in GeoLevel]: GeoState } {
  return {
    departement: emptyGeoState(),
    commune: emptyGeoState(),
    gups: emptyGeoState(),
    arrondissement: emptyGeoState(),
    quartier: emptyGeoState(),
  };
}

// Ordre de la chaîne + ce qu'il faut charger quand on sélectionne un niveau
const GEO_ORDER: GeoLevel[] = ['departement', 'commune', 'gups', 'arrondissement', 'quartier'];
const GEO_NEXT_RESOURCE: { [key in GeoLevel]?: string } = {
  departement: 'communes',
  commune: 'gups',
  gups: 'arrondissements',
  arrondissement: 'quartiers',
};
const GEO_PARENT_PARAM: { [key in GeoLevel]?: string } = {
  departement: 'departement_id',
  commune: 'commune_id',
  gups: 'gups_id',
  arrondissement: 'arrondissement_id',
};

type SimpleKey = 'sessions';

@Component({
  selector: 'app-dossiernais',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './dossiernais.component.html',
  styleUrl: './dossiernais.component.scss',
})
export class DossiernaisComponent extends AbstractCrudComponent<DossierTriple> implements OnInit {
  override resourceName: string = 'dossier_triples';
  override modalId: string = 'dossierNaisModal';
  override deleteId: string = 'delete_dossier_nais';
  viewDetailsId: string = 'view_dossier_nais';
  override formData: boolean = true;

  protected apiHttp = inject(HttpClient);
  protected activatedRoute = inject(ActivatedRoute);

  // Vue liste <-> formulaire plein écran
  showForm: boolean = false;
  viewTarget: DossierTriple | null = null;
  exporting: boolean = false;

  // Fichiers sélectionnés (stockés à part pour ne pas écraser les chemins existants)
  selectedFiles: { [key: string]: File } = {};

  // ===================== Session active (route data) =====================
  // true quand on arrive via le menu "Session active" (même composant, route différente,
  // voir app.routes.ts -> data: { sessionScoped: true }).
  sessionScoped: boolean = false;
  // Session dont is_actif = 1, trouvée dans sessionsList une fois chargée.
  activeSession: any = null;

  // ===================== Cascade géographique : FILTRES =====================
  filterGeo = emptyGeo();

  // ===================== Cascade géographique : FORMULAIRE =====================
  formGeo = emptyGeo();

  // Sessions (recherche simple, sans cascade)
  sessionsList: any[] = [];
  simpleFiltered: { [key in SimpleKey]: any[] } = { sessions: [] };
  simpleOpen: { [key in SimpleKey]: boolean } = { sessions: false };

  years: number[] = [];

  // --- Filtres non hiérarchiques (barre au-dessus du tableau) ---
  searchFilters = {
    search: '',
    session_id: '' as any,
    session_label: '',
    avis: '',
    statut_dossier: '',
    annee: '',
  };

  columns: Column[] = [
    { field: 'commune.libelle', header: 'Commune', filterType: 'text' },
    { field: 'nom_pere', header: 'Nom du père', filterType: 'text' },
    { field: 'nom_mere', header: 'Nom de la mère', filterType: 'text' },
    {
      field: 'avis',
      header: 'Décision',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) => this.decisionBadge(row.avis),
    },
  ];

  globalFilterFields = ['nom_pere', 'nom_mere', 'commune.libelle', 'nom_prenoms_enfants'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();

    // Lu depuis app.routes.ts : { path: Paths.DOSSIERNAIS_SESSION, component: DossiernaisComponent,
    // data: { sessionScoped: true } }. Même composant, juste ce flag qui change de route.
    this.sessionScoped = !!this.activatedRoute.snapshot.data['sessionScoped'];

    // Premier niveau de la cascade des filtres : la liste complète des départements.
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

  // ============================================================
  //  CASCADE GÉOGRAPHIQUE GÉNÉRIQUE (utilisée par filtres & formulaire)
  //  target = 'filterGeo' (barre de filtres) ou 'formGeo' (formulaire)
  // ============================================================
  private geoStateOf(target: 'filterGeo' | 'formGeo'): { [key in GeoLevel]: GeoState } {
    return target === 'filterGeo' ? this.filterGeo : this.formGeo;
  }

  // Tape dans le champ -> filtre la liste déroulante par le texte
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

  // Petit délai pour laisser le (mousedown) sur une option se déclencher avant la fermeture
  onGeoBlur(target: 'filterGeo' | 'formGeo', level: GeoLevel): void {
    const state = this.geoStateOf(target)[level];
    setTimeout(() => (state.open = false), 200);
  }

  // Le champ est désactivé tant que le niveau parent n'est pas choisi (sauf pour "departement")
  isGeoDisabled(target: 'filterGeo' | 'formGeo', level: GeoLevel): boolean {
    const idx = GEO_ORDER.indexOf(level);
    if (idx === 0) return false;
    const parentLevel = GEO_ORDER[idx - 1];
    return !this.geoStateOf(target)[parentLevel].id;
  }

  // Clic sur une option de la liste déroulante
  selectGeoOption(target: 'filterGeo' | 'formGeo', level: GeoLevel, item: any): void {
    const geo = this.geoStateOf(target);
    geo[level].id = item.id;
    geo[level].label = item.libelle;
    geo[level].open = false;

    // Réinitialise tous les niveaux enfants (ils dépendent de ce choix)
    const idx = GEO_ORDER.indexOf(level);
    for (let i = idx + 1; i < GEO_ORDER.length; i++) {
      const child = GEO_ORDER[i];
      geo[child] = emptyGeoState();
    }

    // Charge la liste du niveau suivant, filtrée par ce qui vient d'être choisi
    this.loadNextGeoLevel(target, level, item.id);

    // Répercute le choix vers le modèle réel (currentItem ou filter) + déclenche le filtrage
    this.syncGeoToModel(target);
    if (target === 'filterGeo') this.applyFilters();
  }

  clearGeoOption(target: 'filterGeo' | 'formGeo', level: GeoLevel): void {
    const geo = this.geoStateOf(target);
    const idx = GEO_ORDER.indexOf(level);
    for (let i = idx; i < GEO_ORDER.length; i++) {
      const lvl = GEO_ORDER[i];
      geo[lvl] = emptyGeoState();
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

  // Enlève complètement une clé du filtre si elle est vide, au lieu de la laisser à ''.
  // Important : si le backend fait `$request->has('xxx')`, une valeur '' est quand même
  // considérée comme "présente" et peut filtrer sur du vide -> plus aucun résultat.
  // En supprimant la clé, on s'assure qu'un filtre effacé revient bien à "Tous les ...".
  private setOrDeleteFilter(key: string, value: any): void {
    if (value === null || value === undefined || value === '') {
      delete this.filter[key];
    } else {
      this.filter[key] = value;
    }
  }

  // Synchronise l'état de la cascade géo vers le modèle utilisé ailleurs (filter / currentItem)
  private syncGeoToModel(target: 'filterGeo' | 'formGeo'): void {
    const geo = this.geoStateOf(target);
    if (target === 'filterGeo') {
      this.setOrDeleteFilter('departement_id', geo.departement.id);
      this.setOrDeleteFilter('commune_id', geo.commune.id);
      this.setOrDeleteFilter('gups_id', geo.gups.id);
      this.setOrDeleteFilter('arrondissement_id', geo.arrondissement.id);
      this.setOrDeleteFilter('quartier_id', geo.quartier.id);
    } else {
      this.currentItem.departement_id = geo.departement.id || null;
      this.currentItem.commune_id = geo.commune.id || null;
      this.currentItem.gups_id = geo.gups.id || null;
      this.currentItem.arrondissement_id = geo.arrondissement.id || null;
      this.currentItem.quartier_id = geo.quartier.id || null;
    }
  }

  // Pré-remplit la cascade du formulaire à partir d'un dossier existant (édition),
  // en rechargeant chaque niveau enfant pour que les listes soient prêtes.
  private initFormGeoFromItem(item: DossierTriple): void {
    this.formGeo = emptyGeo();

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
      this.resourceService
        .loadResource<any>('arrondissements', { paginate: true, params: { all: '1', gups_id: item.gups_id } as any })
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

    // Le premier niveau du formulaire (départements) doit être proposé dès l'ouverture.
    if (this.filterGeo.departement.list.length) {
      this.formGeo.departement.list = this.filterGeo.departement.list;
      this.formGeo.departement.filtered = this.filterGeo.departement.list;
    } else {
      this.resourceService
        .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
        .subscribe((res: any) => {
          const list = res?.response?.data ?? [];
          this.formGeo.departement.list = list;
          this.formGeo.departement.filtered = list;
        });
    }
  }

  // ===================== Filtres non hiérarchiques =====================
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

  // Les selects simples (avis, paiement, année) filtrent directement au (change), sans bouton
  onSimpleSelectChange(): void {
    this.applyFilters();
  }

  // Applique tous les filtres courants (géo + simples) et recharge la liste.
  applyFilters(): void {
    this.setOrDeleteFilter('avis', this.searchFilters.avis);
    this.setOrDeleteFilter('statut_dossier', this.searchFilters.statut_dossier);
    this.setOrDeleteFilter('annee', this.searchFilters.annee);
    this.setOrDeleteFilter('session_id', this.searchFilters.session_id);
    this.data = [];
    this.loadData();
  }

  // ===================== Recherche texte (nom du père / mère / commune / enfants) =====================
  // Champ de recherche géré manuellement (au lieu de dépendre de l'event (onSearch) du
  // data-table, qui ne semblait pas filtrer correctement sur nom_pere / nom_mere / commune).
  // ⚠️ Le filtrage réel est fait côté backend : vérifie que ta route GET /dossier_triples
  // recherche bien dans nom_pere, nom_mere et la relation commune (ex: whereHas('commune', ...))
  // quand elle reçoit le paramètre `search`.
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
  private decisionBadge(avis: any): string {
    if (avis == 1) return '<span class="badge-pill badge-pill-green">Accordé</span>';
    if (avis == 2) return '<span class="badge-pill badge-pill-red">Rejeté</span>';
    return '<span class="badge-pill badge-pill-gray">Pas de décision</span>';
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
      nom_pere: '',
      nom_mere: '',
      numero_pere: '',
      numero_mere: '',
      numero_celtis: '',
      enfant1_nom: '', enfant1_sexe: '',
      enfant2_nom: '', enfant2_sexe: '',
      enfant3_nom: '', enfant3_sexe: '',
      date_naissance: '',
      numero_piece: '',
      observations: '',
      recommandation: '',
      departement_id: null,
      arrondissement_id: null,
      commune_id: null,
      quartier_id: null,
      gups_id: null,
    };
    this.showForm = true;
  }

  override editItem(item: DossierTriple): void {
    super.editItem(item);
    this.selectedFiles = {};

    // Répartit les champs "nom_prenoms_enfants" / "sexe_enfants" (stockés en base,
    // séparés par des virgules) dans les 3 blocs de saisie du formulaire.
    const noms = (item.nom_prenoms_enfants || '').split(',').map((s) => s.trim());
    const sexes = (item.sexe_enfants || '').split(',').map((s) => s.trim());
    this.currentItem.enfant1_nom = noms[0] || '';
    this.currentItem.enfant1_sexe = sexes[0] || '';
    this.currentItem.enfant2_nom = noms[1] || '';
    this.currentItem.enfant2_sexe = sexes[1] || '';
    this.currentItem.enfant3_nom = noms[2] || '';
    this.currentItem.enfant3_sexe = sexes[2] || '';

    // L'API renvoie une date ISO complète ; l'input HTML "date" veut juste "YYYY-MM-DD".
    this.currentItem.date_naissance = this.toDateInputValue(item.date_naissance);

    this.initFormGeoFromItem(item);
    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: DossierTriple): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: DossierTriple): void {
    this.showForm = false;
  }

  showDetails(item: DossierTriple): void {
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
  // Le backend renvoie un ISO complet ("2026-07-23T00:00:00.000000Z"), mais un
  // <input type="date"> n'accepte que "YYYY-MM-DD" -> sans ça, le champ reste vide/invalide.
  private toDateInputValue(value: string | null | undefined): string {
    if (!value) return '';
    return value.substring(0, 10);
  }

  // Pour un affichage lisible (jj/mm/aaaa) dans la modale "Détails".
  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '-';
    const datePart = value.substring(0, 10); // "2026-07-23"
    const [y, m, d] = datePart.split('-');
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }

  // Lit le token depuis le cookie `indicateurs_token` (c'est là que le projet le stocke,
  // pas dans le localStorage). C'est ce cookie que tu poses manuellement via
  // `document.cookie = "indicateurs_token=..."` pour tes tests sans passer par le login.
  private getTokenFromCookie(): string {
    const match = document.cookie.match(/(?:^|;\s*)indicateurs_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  // ===================== Enregistrement =====================
  private buildFormData(): FormData {
    const formData = new FormData();

    // Regroupe les 3 blocs enfants en 2 champs texte (comme stocké en base)
    const noms = [this.currentItem.enfant1_nom, this.currentItem.enfant2_nom, this.currentItem.enfant3_nom]
      .filter((v) => !!v && v.trim() !== '');
    const sexes = [this.currentItem.enfant1_sexe, this.currentItem.enfant2_sexe, this.currentItem.enfant3_sexe]
      .filter((v) => !!v && v.trim() !== '');
    formData.append('nom_prenoms_enfants', noms.join(', '));
    formData.append('sexe_enfants', sexes.join(', '));

    const simpleFields = [
      'nom_pere', 'nom_mere', 'numero_pere', 'numero_mere', 'numero_celtis',
      'date_naissance', 'numero_piece', 'observations', 'recommandation',
      'departement_id', 'arrondissement_id', 'commune_id', 'quartier_id', 'gups_id',
    ];
    simpleFields.forEach((key) => {
      const val = (this.currentItem as any)[key];
      if (val !== null && val !== undefined) formData.append(key, val);
    });

    // Fichiers : un seul "fiche_naissance" est conservé en base (le premier fichier fourni
    // parmi les 3 blocs enfants), + les autres pièces jointes du dossier.
    const ficheNaissance = this.selectedFiles['enfant1_fiche_naissance']
      || this.selectedFiles['enfant2_fiche_naissance']
      || this.selectedFiles['enfant3_fiche_naissance'];
    if (ficheNaissance) formData.append('fiche_naissance', ficheNaissance);

    ['rapport_enquete', 'fiche_constat', 'photo_complete', 'carte_identite'].forEach((field) => {
      if (this.selectedFiles[field]) formData.append(field, this.selectedFiles[field]);
    });

    return formData;
  }

  // ⚠️ Correctif de la route de modification.
  // L'erreur "The route api/dossier_triples/3/update could not be found" veut dire que
  // ton backend n'expose PAS de route POST .../update — seulement la route REST standard
  // (PUT/PATCH /api/dossier_triples/{id}, définie via Route::apiResource ou ->put()).
  // Comme un formulaire multipart (fichiers) ne peut pas envoyer un vrai PUT, on POST
  // vers l'URL standard SANS "/update" et on ajoute _method=PUT (spoofing Laravel).
  // Si ta route réelle a un nom différent (ex: "dossier-triples" avec un tiret,
  // ou un endpoint "modifier" personnalisé), remplace juste la variable `url` ci-dessous.
  //
  // ⚠️ Correctif "Unauthenticated" : le projet stocke le token dans un cookie nommé
  // `indicateurs_token` (celui que tu poses toi-même via document.cookie pour tester
  // sans login), pas dans le localStorage. On le relit ici et on l'envoie en Bearer.
  override onSubmit(): void {
    if (this.currentItem && this.currentItem.id) {
      this.processing = true;
      const formData = this.buildFormData();
      formData.append('_method', 'PUT');

      const url = `${environment.URL_API}/dossier_triples/${this.currentItem.id}`;
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

    const url = `${environment.URL_API}/dossier_triples/export?${params.toString()}`;
    const token = this.getTokenFromCookie();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};

    this.apiHttp.get(url, { responseType: 'blob' as const, headers }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `dossiers_naissance_multiple_${new Date().getTime()}.xlsx`;
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