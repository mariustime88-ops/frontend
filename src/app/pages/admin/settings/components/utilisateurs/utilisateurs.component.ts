import { Component, OnInit, inject } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@app/environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  role: number | string;
  grade: number | string;
  gups_id?: number | null;
  departement_id?: number | null;
  lecture_seule: boolean | number;
  menus_autorises: string[] | null;
  password?: string;
  password_confirmation?: string;
  deleted_at?: string | null;
  created_at?: string;
  gups?: { id: number; libelle: string };
  departement?: { id: number; libelle: string };
}

// ============================================================
//  Champs "combobox" génériques (recherche + liste déroulante cliquable),
//  utilisés à la fois dans la barre de filtres et dans le formulaire pour
//  Rôle, Niveau, Accès, GUPS et Département — comme demandé, "les selects
//  qui sont dans les formulaires... doivent être aussi comme les filtres".
// ============================================================
interface ComboState {
  list: any[];
  filtered: any[];
  open: boolean;
  label: string;
  id: any;
}

function emptyCombo(): ComboState {
  return { list: [], filtered: [], open: false, label: '', id: '' };
}

type ComboKey =
  | 'filterRole'
  | 'filterGrade'
  | 'filterLecture'
  | 'formRole'
  | 'formGrade'
  | 'formGups'
  | 'formDepartement';

const ROLE_OPTIONS = [
  { id: 1, libelle: 'Administrateur' },
  { id: 2, libelle: 'Agent' },

];
const GRADE_OPTIONS = [
  { id: 1, libelle: 'GUPS' },
  { id: 2, libelle: 'Départemental' },
  { id: 3, libelle: 'National' },
];
const LECTURE_OPTIONS = [
  { id: 0, libelle: 'Écriture' },
  { id: 1, libelle: 'Lecture seule' },
];

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './utilisateurs.component.html',
  styleUrl: './utilisateurs.component.scss',
})
export class UtilisateursComponent extends AbstractCrudComponent<User> implements OnInit {
  override resourceName: string = 'users';
  override modalId: string = 'utilisateurModal';
  override deleteId: string = 'delete_utilisateur';
  suspendId: string = 'suspend_utilisateur';

  protected apiHttp = inject(HttpClient);

  // Vue liste <-> formulaire plein écran (comme les autres modules)
  showForm: boolean = false;

  gupsList: any[] = [];
  departementsList: any[] = [];
  accesTotal: boolean = true;
  filtering: boolean = false;
  suspending: boolean = false;

  // Utilisateur actuellement ciblé par le modal Suspendre/Réactiver
  suspendTarget: User | null = null;

  // Un seul dictionnaire pour tous les champs recherchables (filtres + formulaire)
  combos: { [key in ComboKey]: ComboState } = {
    filterRole: emptyCombo(),
    filterGrade: emptyCombo(),
    filterLecture: emptyCombo(),
    formRole: emptyCombo(),
    formGrade: emptyCombo(),
    formGups: emptyCombo(),
    formDepartement: emptyCombo(),
  };

  sessionMenus = [
    { key: 'personne', label: 'Demandeurs' },
    { key: 'etudiant', label: 'Étudiants' },
    { key: 'carte_egalite', label: "Cartes d'égalité" },
    { key: 'dossier_triple', label: 'Dossiers naissance multiple' },
    { key: 'demande_installation', label: "Demandes d'installation" },
    { key: 'credit', label: 'Demandes de crédit' },
    { key: 'rendezvous', label: 'Rendez-vous' },
    { key: 'structure', label: 'Établissements inclusifs' },
    { key: 'aide_technique', label: 'Aides Techniques de mobilité' },
  ];

  archiveMenus = [
    { key: 'archive_person', label: 'Demandeurs' },
    { key: 'archive_etudiant', label: 'Étudiants handicapés' },
    { key: 'archive_carte', label: "Cartes d'égalité" },
    { key: 'archive_dossier', label: 'Dossiers naissance multiples' },
    { key: 'archive_installation', label: "Demandes d'installation" },
    { key: 'archive_credit', label: 'Demandes de crédit' },
    { key: 'archive_rdv', label: 'Rendez-vous' },
    { key: 'archive_structure', label: 'Établissements Inclusifs' },
    { key: 'archive_aide', label: 'Aides Techniques de mobilité' },
  ];

  searchFilters = {
    search: '',
    role: '',
    grade: '',
    lecture_seule: '',
  };

  columns: Column[] = [
    { field: 'name', header: 'Nom et Prénoms', filterType: 'text' },
    { field: 'email', header: 'Email', filterType: 'text' },
    { field: 'role_label', header: 'Rôle', filterType: 'text' },
    { field: 'grade_label', header: 'Niveau', filterType: 'text' },
    {
      field: 'lecture_seule',
      header: 'Accès',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) =>
        row.lecture_seule
          ? '<span class="badge-pill badge-pill-gray">Lecture seule</span>'
          : '<span class="badge-pill badge-pill-green">Écriture</span>',
    },
    {
      field: 'deleted_at',
      header: 'Statut',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) =>
        row.deleted_at
          ? '<span class="badge-pill badge-pill-red">Suspendu</span>'
          : '<span class="badge-pill badge-pill-green">Actif</span>',
    },
  ];

  globalFilterFields = ['name', 'email'];

  override ngOnInit(): void {
    this.filter['trashed'] = 'with';
    super.ngOnInit();
    this.loadDropdownData();

    this.combos.filterRole.list = ROLE_OPTIONS;
    this.combos.filterRole.filtered = ROLE_OPTIONS;
    this.combos.filterGrade.list = GRADE_OPTIONS;
    this.combos.filterGrade.filtered = GRADE_OPTIONS;
    this.combos.filterLecture.list = LECTURE_OPTIONS;
    this.combos.filterLecture.filtered = LECTURE_OPTIONS;
    this.combos.formRole.list = ROLE_OPTIONS;
    this.combos.formRole.filtered = ROLE_OPTIONS;
    this.combos.formGrade.list = GRADE_OPTIONS;
    this.combos.formGrade.filtered = GRADE_OPTIONS;
  }

  loadDropdownData() {
    this.resourceService
      .loadResource<any>('gups', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        this.gupsList = res?.response?.data ?? [];
        this.combos.formGups.list = this.gupsList;
        this.combos.formGups.filtered = this.gupsList;
      });

    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => {
        this.departementsList = res?.response?.data ?? [];
        this.combos.formDepartement.list = this.departementsList;
        this.combos.formDepartement.filtered = this.departementsList;
      });
  }

  protected override afterDataLoaded(items: User[]): void {
    items.forEach((item) => {
      (item as any).role_label = item.role == 1 ? 'Administrateur' : 'Agent';

      if (item.grade == 1) (item as any).grade_label = 'GUPS';
      else if (item.grade == 2) (item as any).grade_label = 'Départemental';
      else if (item.grade == 3) (item as any).grade_label = 'National';
      else (item as any).grade_label = '—';
    });
  }

  // ============================================================
  //  Champs recherchables génériques (filtres & formulaire)
  // ============================================================
  onComboInput(key: ComboKey, term: string): void {
    const state = this.combos[key];
    const t = (term || '').toLowerCase().trim();
    state.filtered = t ? state.list.filter((i) => (i.libelle || '').toLowerCase().includes(t)) : state.list;
    state.open = true;
  }

  onComboFocus(key: ComboKey): void {
    const state = this.combos[key];
    state.filtered = state.list;
    state.open = true;
  }

  onComboBlur(key: ComboKey): void {
    const state = this.combos[key];
    setTimeout(() => (state.open = false), 200);
  }

  private setOrDeleteFilter(key: string, value: any): void {
    if (value === null || value === undefined || value === '') {
      delete this.filter[key];
    } else {
      this.filter[key] = value;
    }
  }

  selectComboOption(key: ComboKey, item: any): void {
    const state = this.combos[key];
    state.id = item.id;
    state.label = item.libelle;
    state.open = false;

    switch (key) {
      case 'filterRole':
        this.searchFilters.role = item.id;
        this.applyFilters();
        break;
      case 'filterGrade':
        this.searchFilters.grade = item.id;
        this.applyFilters();
        break;
      case 'filterLecture':
        this.searchFilters.lecture_seule = item.id;
        this.applyFilters();
        break;
      case 'formRole':
        this.currentItem.role = item.id;
        break;
      case 'formGrade':
        this.currentItem.grade = item.id;
        // Le grade change les champs affichés (GUPS / Département) -> on nettoie l'autre.
        this.currentItem.gups_id = null;
        this.currentItem.departement_id = null;
        this.combos.formGups.id = '';
        this.combos.formGups.label = '';
        this.combos.formDepartement.id = '';
        this.combos.formDepartement.label = '';
        break;
      case 'formGups':
        this.currentItem.gups_id = item.id;
        break;
      case 'formDepartement':
        this.currentItem.departement_id = item.id;
        break;
    }
  }

  clearComboOption(key: ComboKey): void {
    const state = this.combos[key];
    state.id = '';
    state.label = '';

    switch (key) {
      case 'filterRole':
        this.searchFilters.role = '';
        this.applyFilters();
        break;
      case 'filterGrade':
        this.searchFilters.grade = '';
        this.applyFilters();
        break;
      case 'filterLecture':
        this.searchFilters.lecture_seule = '';
        this.applyFilters();
        break;
      case 'formRole':
        this.currentItem.role = '';
        break;
      case 'formGrade':
        this.currentItem.grade = '';
        break;
      case 'formGups':
        this.currentItem.gups_id = null;
        break;
      case 'formDepartement':
        this.currentItem.departement_id = null;
        break;
    }
  }

  // ===================== Recherche texte (auto, sans bouton) =====================
  private searchDebounce: any;

  onTableSearch(term: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.searchFilters.search = term;
      this.setOrDeleteFilter('search', (term || '').trim());
      this.filter['trashed'] = 'with';
      this.data = [];
      this.loadData();
    }, 350);
  }

  applyFilters() {
    this.setOrDeleteFilter('search', this.searchFilters.search);
    this.setOrDeleteFilter('role', this.searchFilters.role);
    this.setOrDeleteFilter('grade', this.searchFilters.grade);
    this.setOrDeleteFilter('lecture_seule', this.searchFilters.lecture_seule);
    this.filter['trashed'] = 'with';
    this.data = [];
    this.filtering = true;
    this.loadData();
  }

  // ===================== Vue liste / formulaire plein écran =====================
  override showAddForm(): void {
    super.showAddForm();
    this.currentItem = {
      id: 0,
      name: '',
      email: '',
      role: '',
      grade: '',
      gups_id: null,
      departement_id: null,
      lecture_seule: 0,
      menus_autorises: null,
      password: '',
      password_confirmation: '',
    };
    this.accesTotal = true;
    this.combos.formRole = { list: ROLE_OPTIONS, filtered: ROLE_OPTIONS, open: false, label: '', id: '' };
    this.combos.formGrade = { list: GRADE_OPTIONS, filtered: GRADE_OPTIONS, open: false, label: '', id: '' };
    this.combos.formGups = { list: this.gupsList, filtered: this.gupsList, open: false, label: '', id: '' };
    this.combos.formDepartement = { list: this.departementsList, filtered: this.departementsList, open: false, label: '', id: '' };
    this.showForm = true;
  }

  override editItem(item: User): void {
    super.editItem(item);

    if (typeof item.menus_autorises === 'string') {
      try {
        this.currentItem.menus_autorises = JSON.parse(item.menus_autorises);
      } catch {
        this.currentItem.menus_autorises = null;
      }
    } else {
      this.currentItem.menus_autorises = item.menus_autorises;
    }

    this.accesTotal =
      this.currentItem.menus_autorises === null ||
      (Array.isArray(this.currentItem.menus_autorises) && this.currentItem.menus_autorises.length === 0);

    // Pré-remplissage des champs recherchables du formulaire
    const roleOpt = ROLE_OPTIONS.find((r) => r.id == item.role);
    this.combos.formRole = { list: ROLE_OPTIONS, filtered: ROLE_OPTIONS, open: false, id: item.role, label: roleOpt?.libelle || '' };

    const gradeOpt = GRADE_OPTIONS.find((g) => g.id == item.grade);
    this.combos.formGrade = { list: GRADE_OPTIONS, filtered: GRADE_OPTIONS, open: false, id: item.grade, label: gradeOpt?.libelle || '' };

    this.combos.formGups = {
      list: this.gupsList,
      filtered: this.gupsList,
      open: false,
      id: item.gups_id || '',
      label: item.gups?.libelle || '',
    };
    this.combos.formDepartement = {
      list: this.departementsList,
      filtered: this.departementsList,
      open: false,
      id: item.departement_id || '',
      label: item.departement?.libelle || '',
    };

    this.showForm = true;
  }

  backToList(): void {
    this.showForm = false;
  }

  protected override afterItemCreated(item: User): void {
    this.showForm = false;
  }

  protected override afterItemUpdated(item: User): void {
    this.showForm = false;
  }

  onAccesTotalChange(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.toggleAccesTotal(isChecked);
  }

  toggleAccesTotal(isTotal: boolean) {
    this.accesTotal = isTotal;
    if (isTotal) {
      this.currentItem.menus_autorises = null;
    } else {
      this.currentItem.menus_autorises = [];
    }
  }

  isMenuChecked(key: string): boolean {
    if (!this.currentItem.menus_autorises) return false;
    if (!Array.isArray(this.currentItem.menus_autorises)) return false;
    return this.currentItem.menus_autorises.includes(key);
  }

  onMenuCheckboxChange(key: string, event: any) {
    if (!this.currentItem.menus_autorises || !Array.isArray(this.currentItem.menus_autorises)) {
      this.currentItem.menus_autorises = [];
    }
    if (event.target.checked) {
      if (!this.currentItem.menus_autorises.includes(key)) {
        this.currentItem.menus_autorises.push(key);
      }
    } else {
      this.currentItem.menus_autorises = this.currentItem.menus_autorises.filter((k) => k !== key);
    }
  }

  checkAllMenus(check: boolean) {
    if (check) {
      const allKeys = [...this.sessionMenus.map((m) => m.key), ...this.archiveMenus.map((m) => m.key)];
      this.currentItem.menus_autorises = allKeys;
    } else {
      this.currentItem.menus_autorises = [];
    }
  }

  override onSubmit(event?: any): void {
    if (Array.isArray(this.currentItem.menus_autorises)) {
      (this.currentItem as any).menus_autorises = JSON.stringify(this.currentItem.menus_autorises);
    }
    super.onSubmit(event);
  }

  /**
   * Récupère le token depuis les cookies
   */
  private getAuthToken(): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'indicateurs_token') {
        return decodeURIComponent(value);
      }
    }

    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('token');

    return token || null;
  }

  /**
   * Ouvre le modal de confirmation Suspendre/Réactiver pour l'agent choisi.
   * Le modal s'ouvre tout seul grâce à l'attribut data-modal-toggle posé sur
   * le bouton dans le HTML ; cette méthode ne fait que mémoriser la cible.
   */
  prepareSuspend(item: User): void {
    this.suspendTarget = item;
  }

  /**
   * Exécute réellement la suspension/réactivation, une fois confirmée dans le modal.
   */
  executeSuspend(): void {
    if (!this.suspendTarget || this.suspending) {
      return;
    }

    const item = this.suspendTarget;
    const isSuspended = !!item.deleted_at;

    this.suspending = true;

    const token = this.getAuthToken();
    if (!token) {
      this.suspending = false;
      this.messageService.add({
        severity: 'error',
        summary: "Erreur d'authentification",
        detail: 'Vous devez être connecté pour effectuer cette action. Veuillez vous reconnecter.',
      });
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    const baseUrl = environment.URL_API.replace(/\/$/, '');
    const url = isSuspended ? `${baseUrl}/users/${item.id}/restore` : `${baseUrl}/users/${item.id}/suspend`;

    const request$ = isSuspended ? this.apiHttp.patch<any>(url, {}, { headers }) : this.apiHttp.put<any>(url, {}, { headers });

    request$.subscribe({
      next: () => {
        this.suspending = false;

        const index = this.data.findIndex((u) => u.id === item.id);
        if (index !== -1) {
          this.data[index] = {
            ...this.data[index],
            deleted_at: isSuspended ? null : new Date().toISOString(),
          };
          this.data = [...this.data];
        }

        this.messageService.add({
          severity: 'success',
          summary: isSuspended ? 'Agent réactivé' : 'Agent suspendu',
          detail: isSuspended
            ? `L'utilisateur "${item.name}" a été réactivé avec succès.`
            : `L'utilisateur "${item.name}" a été suspendu avec succès.`,
        });

        this.suspendTarget = null;
        this.closeAllModals();
        setTimeout(() => this.loadData(), 500);
      },
      error: (error: any) => {
        this.suspending = false;

        let errorMessage = "Impossible d'effectuer cette action.";
        if (error.status === 401) {
          errorMessage = 'Session expirée. Veuillez rafraîchir la page ou vous reconnecter.';
        } else if (error.status === 0) {
          errorMessage = 'Le serveur est inaccessible. Vérifiez votre connexion.';
        } else if (error.status === 404) {
          errorMessage = `La route ${url} n'existe pas.`;
        } else if (error.status === 403) {
          errorMessage = "Vous n'avez pas les droits pour effectuer cette action.";
        } else if (error.status === 500) {
          errorMessage = "Erreur interne du serveur. Contactez l'administrateur.";
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: errorMessage,
        });
      },
    });
  }

  override loadData(): void {
    if (!this.filter['trashed']) {
      this.filter['trashed'] = 'with';
    }
    super.loadData();
  }
}