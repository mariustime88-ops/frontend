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
}

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

  gupsList: any[] = [];
  departementsList: any[] = [];
  accesTotal: boolean = true;
  filtering: boolean = false;
  suspending: boolean = false;

  // Utilisateur actuellement ciblé par le modal Suspendre/Réactiver
  suspendTarget: User | null = null;

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
    lecture_seule: ''
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
  }

  loadDropdownData() {
    this.resourceService
      .loadResource<any>('gups', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.gupsList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.departementsList = res?.response?.data ?? []));
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

  applyFilters() {
    this.filter['search'] = this.searchFilters.search;
    this.filter['role'] = this.searchFilters.role;
    this.filter['grade'] = this.searchFilters.grade;
    this.filter['lecture_seule'] = this.searchFilters.lecture_seule;
    this.filter['trashed'] = 'with';
    this.data = [];
    this.filtering = true;
    this.loadData();
  }

  resetFilters() {
    this.searchFilters = { search: '', role: '', grade: '', lecture_seule: '' };
    this.filter['search'] = '';
    this.filter['role'] = '';
    this.filter['grade'] = '';
    this.filter['lecture_seule'] = '';
    this.filter['trashed'] = 'with';
    this.data = [];
    this.loadData();
  }

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
      password_confirmation: ''
    };
    this.accesTotal = true;
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

    this.accesTotal = this.currentItem.menus_autorises === null ||
                      (Array.isArray(this.currentItem.menus_autorises) && this.currentItem.menus_autorises.length === 0);
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

    const token = localStorage.getItem('token') ||
                  localStorage.getItem('access_token') ||
                  sessionStorage.getItem('token');

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
    const url = isSuspended
      ? `${baseUrl}/users/${item.id}/restore`
      : `${baseUrl}/users/${item.id}/suspend`;

    const request$ = isSuspended
      ? this.apiHttp.patch<any>(url, {}, { headers })
      : this.apiHttp.put<any>(url, {}, { headers });

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