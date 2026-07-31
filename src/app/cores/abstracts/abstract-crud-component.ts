import {
  Directive,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectorRef,
  EnvironmentInjector,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdvancedResourceService } from '../services/advanced-resource.service';
import { LoadOptions, PaginatedResult } from '../types/advanced-resource';
import { NgForm } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ApiRoutes } from '@app/api.routes';
import { formQuery } from '../utils/query';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Paths } from '@app/paths';
import { objectToFormData } from '../utils/object-formdata';
import { environment } from '@app/environments/environment';
import { ModulesConfig } from '@app/app.enums';
import { export_data } from '../utils/export';
import { encrypt } from '../utils/cryptage';
/**
 * Interface de base pour tous les modèles de paramètres
 */
export interface BaseParameter {
  id: number | string;
  [key: string]: any;
}

/**
 * Composant abstrait pour la gestion des paramètres
 * À étendre par les composants spécifiques
 */
@Directive()
export abstract class AbstractCrudComponent<T extends BaseParameter>
  implements OnInit, OnDestroy
{
  // Configuration à définir dans les classes enfants
  @Input() resourceName: string = '';
  @Input() modalId: string = '';
  @Input() deleteId: string = '';
  @Input() viewId: string = '';
  updateChild: number = 0;
  formData: boolean = false;
  environment = environment;
  modules = ModulesConfig;

  @Input() title: string = 'Gestion des paramètres';
  api = ApiRoutes;
  uploadedFiles: any[] = [];

  // Données
  data: T[] = [];

  filter: {
    search: string;
    total: number;
    page: number;
    totalPages: number;
    per_page: number;
    limit: number;
    meta?: {
      current_page: number;
      from: number;
      last_page: number;
      per_page: number;
      to: number;
      total: number;
    };
    [key: string]: string | number | any;
  } = {
    search: '',
    total: 0,
    page: 1,
    totalPages: 1,
    per_page: 5,
    limit: 5,
    meta: {
      current_page: 1,
      from: 0,
      last_page: 1,
      per_page: 5,
      to: 0,
      total: 0,
    },
  };

  // État
  fr: any;
  loading = false;
  exportLoading = false;
  processing = false;
  error: string | null = null;
  editMode = false;

  // Formulaire
  currentItem: T = {} as T;

  paths = Paths;

  // Gestion des abonnements
  protected destroy$ = new Subject<void>();
  protected subscription = new Subscription();

  constructor(
    protected resourceService: AdvancedResourceService,
    protected messageService: MessageService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected location: Location,
    protected http: HttpClient,
    protected injector: EnvironmentInjector,
  ) {}

  ngOnInit(): void {
    this.fr = {
      dateFormat: 'dd-mm-yy',
    };
    // Vérifier la configuration requise
    if (!this.resourceName) {
      console.error('resourceName est requis pour AbstractCrudComponent');
      return;
    }

    // S'abonner à l'état de chargement
    this.resourceService
      .getLoadingState$(this.resourceName)
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.loading = isLoading;
      });

    // S'abonner aux données
    this.resourceService
      .getResource$<T>(this.resourceName)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.data = data;
      });

    // Charger les données initialement
    this.loadData();
    this.fetchData();

    // Appeler la méthode d'initialisation spécifique de la classe enfant
    this.onComponentInit();
  }

  ngOnDestroy(): void {
    // Se désabonner de tous les observables
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  // Méthode à surcharger dans les classes enfants pour des initialisations supplémentaires
  protected onComponentInit(): void {
    // Implémentation par défaut vide
  }

  // Méthodes CRUD

  loadData(options: LoadOptions = {}): void {
    // this.filter['page'] = 1
    console.log(this.filter);

    this.error = null;

    // Préparer les options de chargement
    const loadOptions: LoadOptions = {
      paginate: true,
      page: this.filter.page,
      limit: this.filter.per_page,
      ...options,
    };

    loadOptions.params = {
      ...(loadOptions.params || {}),
      ...Object.fromEntries(
        Object.entries(this.filter)
          .filter(([_, value]) => value !== null && value !== '')
          .map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : String(value),
          ]),
      ),
    };

    // Hook avant chargement pour permettre des modifications supplémentaires
    this.beforeDataLoad(loadOptions);

    // Charger les données
    this.subscription.add(
      this.resourceService
        .loadResource<T>(this.resourceName, loadOptions)
        .subscribe(
          (response) => {
            console.log(response);
            // Gérer le résultat paginé
            const paginatedResponse = response as PaginatedResult<T>;
            if ('response' in response) {
              this.filter.total = paginatedResponse.response.total;
              this.filter.page = paginatedResponse.response.current_page;
              this.filter.per_page = paginatedResponse.response.per_page ?? 5;

              this.afterDataLoaded(paginatedResponse.response.data);
            }

            if ('meta' in response) {
              this.filter.total = paginatedResponse.response.meta?.total || 0;
              this.filter.page = paginatedResponse.response.meta?.current_page || 1;
              this.filter.limit = paginatedResponse.response.meta?.per_page || 0;
              this.afterDataLoaded(paginatedResponse.response.data);
            }
            if ('response' in response) {
              this.data = response.response as any;
              // alert(this.data.length)
              if ('data' in response.response) {
                this.data = response.response.data;
                // alert(this.data.length)
              }
            }
            

            console.log('Preload: ',  this.data);
            this.fetchData();
          },
          (error) => {
            // alert(error.error.message);
            this.onLoadError(error);
          },
        ),
    );
    this.updateChild++;
  }

  fetchData() {}

  createItem(item: T): void {
    this.processing = true;
    this.error = null;

    // Hook avant création
    this.beforeItemCreate(item);

    this.subscription.add(
      this.resourceService
        .addResourceItem<T>(this.resourceName, item)
        .subscribe({
          next: (createdItem) => {
            // Recharger les données après création
            this.loadData();
            this.resetForm();

            // Hook après création réussie
            this.afterItemCreated(createdItem);

            this.messageService.add({
              severity: 'success',
              summary: 'Enregistrement',
              detail: 'Element enregistré avec succès',
            });
            this.processing = false;
          },
          error: (err) => {
            console.error(
              `Erreur lors de la création dans ${this.resourceName}`,
              err,
            );
            this.error = `Impossible de créer l'élément. Veuillez réessayer plus tard.`;

            // Hook après erreur
            this.onCreateError(err);
            this.processing = false;
          },
        }),
    );
  }

 updateItem(item: T): void {
    // Un FormData n'expose pas .id comme un objet normal (même bug que
    // dans updateResourceItem) — il faut passer par .get('id').
    const itemId = item instanceof FormData ? (item as any).get('id') : item.id;
    if (!itemId) return;
    this.processing = true;
    this.error = null;

    // Hook avant mise à jour
    this.beforeItemUpdate(item);

    this.subscription.add(
      this.resourceService
        .updateResourceItem<T>(this.resourceName, item)
        .subscribe({
          next: (updatedItem) => {
            // Recharger les données après mise à jour
            this.loadData();
            this.resetForm();

            // Hook après mise à jour réussie
            this.afterItemUpdated(updatedItem);
            this.processing = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Modification',
              detail: 'Element modifié avec succès',
            });
          },
          error: (err) => {
            console.error(
              `Erreur lors de la mise à jour dans ${this.resourceName}`,
              err,
            );
            this.error = `Impossible de mettre à jour l'élément. Veuillez réessayer plus tard.`;

            // Hook après erreur
            this.onUpdateError(err);
            this.processing = false;
          },
        }),
    );
  }

  onDelete(item: T) {
    this.currentItem = item;
  }

  deleteItem(item: T): void {
    if (!item.id) return;

    // Confirmation avant suppression
    // if (!this.confirmDelete(item)) {
    //   return;
    // }

    this.processing = true;
    this.error = null;

    // // Hook avant suppression
    // this.beforeItemDelete(item);

    this.subscription.add(
      this.resourceService
        .deleteResourceItem<T>(this.resourceName, item.id)
        .subscribe({
          next: () => {
            // Recharger les données après suppression
            this.loadData();

            // Hook après suppression réussie
            this.afterItemDeleted(item);
            this.processing = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Suppression',
              detail: 'Element supprimé avec succès',
            });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Suppression',
              detail:
                'Impossible de supprimer cet élément. Veuillez réessayer plus tard.',
            });

            console.error(
              `Erreur lors de la suppression dans ${this.resourceName}`,
              err,
            );
            this.error = `Impossible de supprimer l'élément. Veuillez réessayer plus tard.`;

            // Hook après erreur
            this.onDeleteError(err);
            this.processing = false;
          },
        }),
    );
  }

  // Hooks pour personnaliser le comportement dans les classes enfants

  protected beforeDataLoad(options: LoadOptions): void {
    // À surcharger dans les classes enfants si nécessaire
  }

  protected afterDataLoaded(items: T[]): void {
    // À surcharger dans les classes enfants si nécessaire
  }

  protected onLoadError(error: any): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Chargement',
      detail: error.error?.message ?? 'Une erreur est survenue !',
    });
    // À surcharger dans les classes enfants si nécessaire
  }

  protected beforeItemCreate(item: T): void {
    // À surcharger dans les classes enfants si nécessaire
  }

  protected afterItemCreated(item: T): void {
    this.closeAllModals();
    // À surcharger dans les classes enfants si nécessaire
  }

  protected onCreateError(error: any): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Enregistrement',
      detail: error.error.message ?? 'Une erreur est survenue !',
    });
    // À surcharger dans les classes enfants si nécessaire
  }

  protected beforeItemUpdate(item: T): void {
    // À surcharger dans les classes enfants si nécessaire
  }

  protected afterItemUpdated(item: T): void {
    this.closeAllModals();
    // À surcharger dans les classes enfants si nécessaire
  }

  protected onUpdateError(error: any): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Modification',
      detail: error.error.message ?? 'Une erreur est survenue !',
    });
    // À surcharger dans les classes enfants si nécessaire
  }

  protected beforeItemDelete(item: T): void {
    // À surcharger dans les classes enfants si nécessaire
  }

  protected afterItemDeleted(item: T): void {
    this.closeAllModals();

    // À surcharger dans les classes enfants si nécessaire
  }

  protected onDeleteError(error: any): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Suppression',
      detail: error.error.message ?? 'Une erreur est survenue !',
    });
    // À surcharger dans les classes enfants si nécessaire
  }

  protected confirmDelete(item: T): boolean {
    // Peut être surchargé pour une confirmation personnalisée
    return confirm(`Êtes-vous sûr de vouloir supprimer cet élément ?`);
  }

  // Méthodes d'interface utilisateur

  showAddForm(): void {
    this.editMode = false;
    this.currentItem = {} as T;
    this.resetForm();
  }

  editItem(item: T): void {
    this.editMode = true;

    this.currentItem = { ...item };
    console.log(this.currentItem);
  }

  cancelForm(): void {
    this.resetForm();
  }

  resetForm(): void {
    const defaults: any = { id: null };
  }

  onSubmit($event?: NgForm): void {
    let itemToSubmit = this.currentItem as T;

    console.log(itemToSubmit);

    console.log('editMode:', this.editMode, '| id:', itemToSubmit?.id);

    for (const key in itemToSubmit) {
      if (itemToSubmit.hasOwnProperty(key)) {
        const value = itemToSubmit[key];
        // Format ISO dates and date objects to Y-m-d format required by the API
        if (typeof value === 'string' && (
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) ||
              /^\d{4}-\d{2}-\d{2}/.test(value)
            )
           ) {
          const date = new Date(value);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');

          (itemToSubmit as any)[key] = `${year}-${month}-${day}`;
        }
        if (typeof value === 'boolean') {
          (itemToSubmit as any)[key] = value ? 1 : 0;
        }
      }
    }

    // Important : on vérifie l'id AVANT de convertir en FormData, car un
    // objet FormData n'expose pas de propriété .id — la vérifier après
    // conversion faisait toujours passer en création, jamais en modification.
    const isUpdate = this.editMode && !!itemToSubmit?.id;

    if (this.formData) {
      itemToSubmit = objectToFormData(itemToSubmit) as unknown as T;
    }

    console.log(itemToSubmit);

    if (isUpdate) {
      this.updateItem(itemToSubmit);
    } else {
      this.createItem(itemToSubmit);
    }
  }

  // Méthodes de filtrage et pagination

  onSearchChange(): void {
    // Réinitialiser à la première page lors d'une recherche
    this.filter.page = 1;
    this.loadData();
  }

  applyFilter(field: string, value: string): void {
    // Réinitialiser à la première page lors d'un filtrage
    this.filter.page = 1;
    this.loadData();
  }

  clearFilters(): void {
    this.filter.page = 1;
    this.loadData();
  }

  changePage(page: number): void {
    const totalPages = Math.ceil(this.filter.total / this.filter.per_page) || 1;
    if (page < 1 || page > totalPages) return;

    this.filter.page = page;
    this.loadData();
  }

  search(query: string) {
    this.filter.search = query;
    this.filter.page = 1;
    this.loadData();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (this.filter.total <= maxVisiblePages) {
      // Afficher toutes les pages si leur nombre est inférieur à maxVisiblePages
      for (let i = 1; i <= this.filter.total; i++) {
        pages.push(i);
      }
    } else {
      // Logique pour afficher les pages centrées autour de la page actuelle
      let startPage = Math.max(
        1,
        this.filter.page - Math.floor(maxVisiblePages / 2),
      );
      let endPage = startPage + maxVisiblePages - 1;

      if (endPage > this.filter.total) {
        endPage = this.filter.total;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  closeAllModals() {
    const modals = document.querySelectorAll(
      '[data-modal-dismiss="true"].btn_close',
    )!;
    modals.forEach((modal) => {
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      this.resetForm();
    });
  }

  apiRoute({ route, filter }: { route: string; filter?: any }): string {
    const queryParams = new HttpParams({ fromObject: { ...filter, all: 1 } });

    return `${route}?${queryParams.toString()}`;
  }

  onUpload(event: any) {
    if (this.uploadedFiles.length > 0) {
      this.uploadedFiles = [];
    }
    for (let file of event.files) {
      this.uploadedFiles.push(file);
    }

    // this.messageService.add({
    //   severity: 'info',
    //   summary: 'File Uploaded',
    //   detail: '',
    // });
  }

  onClear() {
    this.uploadedFiles = [];
  }

  back() {
    this.location.back();
  }

  bool(value: number | boolean = 0) {
    return Boolean(value);
  }

  formatDateFr(dateString: string | null | undefined): string {
    if (!dateString) {
      return '';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString)).replace(/\//g, '-');
  }

  export(route?: string, type: string = 'excel') {
    this.exportLoading = true;
    export_data(
      type,
      '/' + route,
      {
        ...this.filter,
        all: 1,
      },
      this.injector,
    )
      .then(() => {
        this.exportLoading = false;
      })
      .catch((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Exportation',
          detail: error.error.message ?? 'Une erreur est survenue !',
        });
        this.exportLoading = false;
      });
  }

  handleView(item: T, route: string) {
    this.router.navigateByUrl(`${route}/${encrypt(item.id)}`);
  }
}