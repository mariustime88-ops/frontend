import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, BehaviorSubject, throwError, of, timer } from "rxjs";
import {
  tap,
  catchError,
  shareReplay,
  switchMap,
  map,
  filter,
} from "rxjs/operators";
import { HttpResponse } from "@angular/common/http";
import { environment } from "@app/environments/environment";
import {
  CacheEntry,
  LoadOptions,
  PaginatedResult,
} from "../types/advanced-resource";

@Injectable({
  providedIn: "root",
})
export class AdvancedResourceService {
  private baseApiUrl = environment.URL_API;
  private defaultCacheTime = 5 * 60 * 1000; // 5 minutes par défaut
  // private defaultCacheTime = 10; // 5 minutes par défaut

  // Stockage des BehaviorSubjects par ressource
  private resourceSubjects: Map<string, BehaviorSubject<any[]>> = new Map();

  // Stockage des observables par ressource
  private resourceObservables: Map<string, Observable<any[]>> = new Map();

  // Stockage du cache
  private cache: Map<string, CacheEntry<any>> = new Map();

  // Stockage des états de chargement
  private loadingStates: Map<string, BehaviorSubject<boolean>> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Obtient l'observable pour une ressource
   */
  getResource$<T>(resourceName: string): Observable<T[]> {
    if (!this.resourceObservables.has(resourceName)) {
      const subject = new BehaviorSubject<T[]>([]);
      this.resourceSubjects.set(resourceName, subject);

      const observable = subject.asObservable().pipe(shareReplay(1));

      this.resourceObservables.set(resourceName, observable);
    }

    return this.resourceObservables.get(resourceName)! as Observable<T[]>;
  }

  /**
   * Obtient l'état de chargement d'une ressource
   */
  getLoadingState$(resourceName: string): Observable<boolean> {
    if (!this.loadingStates.has(resourceName)) {
      this.loadingStates.set(resourceName, new BehaviorSubject<boolean>(false));
    }

    return this.loadingStates.get(resourceName)!.asObservable();
  }

  /**
   * Charge une ressource avec options avancées
   */
  loadResource<T>(
    resourceName: string,
    options: LoadOptions = {},
  ): Observable<T[] | PaginatedResult<T>> {
    const {
      forceRefresh = true,
      params = {},
      paginate = false,
      page = 1,
      limit = 20,
      cacheTime = this.defaultCacheTime,
    } = options;

    // Marquer comme en cours de chargement
    this.setLoadingState(resourceName, true);

    // Créer une clé de cache unique pour cette ressource et ces paramètres
    const cacheKey = resourceName;
    const paginationKey = paginate ? `page=${page}&limit=${limit}` : "";

    // Vérifier si les données sont en cache et valides
    if (!forceRefresh && this.isCacheValid(cacheKey, cacheTime)) {
      if (paginate && this.isPaginatedDataCached(cacheKey, paginationKey)) {
        const paginatedData = this.getPaginatedDataFromCache(
          cacheKey,
          paginationKey,
        ) as PaginatedResult<T>;
        this.setLoadingState(resourceName, false);
        return of(paginatedData);
      } else if (!paginate) {
        const cachedData = this.getDataFromCache<T>(cacheKey);
        this.setLoadingState(resourceName, false);
        return of(cachedData);
      }
    }

    // Préparer les paramètres HTTP
    let httpParams = new HttpParams();

    // Ajouter les paramètres fournis
    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, value);
    });

    // // Ajouter les paramètres de pagination si nécessaire
    // if (paginate) {
    //   httpParams = httpParams.set('page', page.toString());
    //   httpParams = httpParams.set('limit', limit.toString());
    // }

    // Construire l'URL de l'API
    const url = `${this.baseApiUrl}/${resourceName}`;
    // Exécuter la requête HTTP
    const request$ = this.http
      .get<T[] | PaginatedResult<T>>(url, { params: httpParams })
      .pipe(
        tap((response) => {
          console.log("Réponse API: ", response);

          if (paginate) {
            // Stocker les données paginées dans le cache
            const paginatedResponse = response as PaginatedResult<T>;
            this.storePaginatedDataInCache(
              cacheKey,
              paginationKey,
              paginatedResponse,
            );

            // Mettre à jour le subject principal avec les éléments actuels
            if (!this.resourceSubjects.has(resourceName)) {
              this.getResource$<T>(resourceName);
            }
            this.resourceSubjects
              .get(resourceName)
              ?.next(paginatedResponse.response.data);
          } else {
            // Stocker les données dans le cache
            const items = response as T[];
            this.storeDataInCache(cacheKey, items);

            // Mettre à jour le subject
            if (!this.resourceSubjects.has(resourceName)) {
              this.getResource$<T>(resourceName);
            }
            this.resourceSubjects.get(resourceName)?.next(items);
          }
        }),
        catchError((error) => {
          console.error(`Erreur lors du chargement de ${resourceName}`, error);
          this.setLoadingState(resourceName, false);
          return throwError(() => error);
        }),
        tap(() => {
          this.setLoadingState(resourceName, false);
        }),
      );

    return request$;
  }

  /**
   * Obtient un élément spécifique d'une ressource
   */
  getResourceItem<T>(resourceName: string, id: number | string): Observable<T> {
    return this.http.get<T>(`${this.baseApiUrl}/${resourceName}/${id}`);
  }

  /**
   * Ajoute un élément à une ressource
   */
  addResourceItem<T>(resourceName: string, item: T): Observable<T> {
    return this.http.post<T>(`${this.baseApiUrl}/${resourceName}`, item).pipe(
      tap((newItem) => {
        // Mettre à jour le cache et les observables
        // this.updateCacheAfterModification(resourceName, newItem, 'add');
      }),
    );
  }

  /**
   * Met à jour un élément
   */
 updateResourceItem<T extends { id: number | string }>(
    resourceName: string,
    item: T,
    setId: boolean = true,
  ): Observable<T> {
    let url = `${this.baseApiUrl}/${resourceName}`;
    if (setId) {
      // Un FormData n'expose pas .id comme un objet normal : il faut
      // passer par .get('id'), sinon l'URL devient ".../undefined".
      const id = item instanceof FormData ? item.get('id') : item.id;
      url += `/${id}`;
    }

    if (item instanceof FormData) {
      item.append('_method', 'PUT');
      return this.http.post<T>(url, item).pipe(
        tap((updatedItem) => {
          this.updateCacheAfterModification(resourceName, updatedItem, "update");
        }),
      );
    }

    return this.http.put<T>(url, item).pipe(
      tap((updatedItem) => {
        this.updateCacheAfterModification(resourceName, updatedItem, "update");
      }),
    );
  }
  /**
   * Supprime un élément
   */
  deleteResourceItem<T extends { id: number | string }>(
    resourceName: string,
    id: number | string,
  ): Observable<any> {
    return this.http.delete(`${this.baseApiUrl}/${resourceName}/${id}`).pipe(
      tap(() => {
        // Mettre à jour le cache et les observables
        this.updateCacheAfterModification(resourceName, { id } as T, "delete");
      }),
    );
  }

  // Méthodes privées pour la gestion du cache

  private isCacheValid(key: string, cacheTime: number): boolean {
    if (!this.cache.has(key)) return false;

    const entry = this.cache.get(key)!;
    const now = Date.now();
    return now - entry.timestamp < cacheTime;
  }

  private isPaginatedDataCached(
    cacheKey: string,
    paginationKey: string,
  ): boolean {
    if (!this.cache.has(cacheKey)) return false;
    const entry = this.cache.get(cacheKey)!;
    return entry.paginatedData?.has(paginationKey) ?? false;
  }

  private getDataFromCache<T>(key: string): T[] {
    return this.cache.has(key) ? (this.cache.get(key)!.data as T[]) : [];
  }

  private getPaginatedDataFromCache<T>(
    cacheKey: string,
    paginationKey: string,
  ): PaginatedResult<T> | null {
    if (!this.cache.has(cacheKey)) return null;

    const entry = this.cache.get(cacheKey)!;
    if (!entry.paginatedData?.has(paginationKey)) return null;

    return entry.paginatedData.get(paginationKey) as PaginatedResult<T>;
  }

  private storeDataInCache<T>(key: string, data: T[]): void {
    const now = Date.now();

    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.data = data;
      entry.timestamp = now;
    } else {
      this.cache.set(key, {
        data,
        timestamp: now,
        paginatedData: new Map(),
      });
    }
  }

  private storePaginatedDataInCache<T>(
    cacheKey: string,
    paginationKey: string,
    data: PaginatedResult<T>,
  ): void {
    const now = Date.now();

    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, {
        data: [],
        timestamp: now,
        paginatedData: new Map([[paginationKey, data]]),
      });
    } else {
      const entry = this.cache.get(cacheKey)!;
      entry.timestamp = now;

      if (!entry.paginatedData) {
        entry.paginatedData = new Map();
      }

      entry.paginatedData.set(paginationKey, data);
    }
  }

  private updateCacheAfterModification<T extends { id?: number | string }>(
    resourceName: string,
    item: T,
    operation: "add" | "update" | "delete",
  ): void {
    // Mettre à jour le cache si nécessaire
    if (this.cache.has(resourceName)) {
      const entry = this.cache.get(resourceName)!;
      const data = [...entry.data];

      switch (operation) {
        case "add":
          data.push(item);
          break;

        case "update":
          const updateIndex = data.findIndex((i) => (i as any).id === item.id);
          if (updateIndex >= 0) {
            data[updateIndex] = { ...data[updateIndex], ...item };
          }
          break;

        case "delete":
          const deleteIndex = data.findIndex((i) => (i as any).id === item.id);
          if (deleteIndex >= 0) {
            data.splice(deleteIndex, 1);
          }
          break;
      }

      entry.data = data;
      entry.timestamp = Date.now();

      // Invalider les données paginées car elles ne sont plus à jour
      entry.paginatedData = new Map();
    }

    // Mettre à jour le subject
    if (this.resourceSubjects.has(resourceName)) {
      const currentData = this.resourceSubjects.get(resourceName)?.value || [];
      let newData: any[] = [...currentData];

      switch (operation) {
        case "add":
          newData.push(item);
          break;

        case "update":
          const updateIndex = newData.findIndex((i) => i.id === item.id);
          if (updateIndex >= 0) {
            newData[updateIndex] = { ...newData[updateIndex], ...item };
          }
          break;

        case "delete":
          newData = newData.filter((i) => i.id !== item.id);
          break;
      }

      this.resourceSubjects.get(resourceName)?.next(newData);
    }
  }

  private setLoadingState(resourceName: string, isLoading: boolean): void {
    if (!this.loadingStates.has(resourceName)) {
      this.loadingStates.set(
        resourceName,
        new BehaviorSubject<boolean>(isLoading),
      );
    } else {
      this.loadingStates.get(resourceName)?.next(isLoading);
    }
  }

  /**
   * Vide le cache pour une ressource spécifique
   */
  clearCache(resourceName?: string): void {
    if (resourceName) {
      this.cache.delete(resourceName);
    } else {
      this.cache.clear();
    }
  }

  chainLoad<T>(resources: string[]): Observable<Map<string, any>> {
    const loadMap = new Map<string, any>();
    let chain$ = of(null) as Observable<any>;

    resources.forEach((resource) => {
      chain$ = chain$.pipe(
        switchMap(() => this.loadResource<T>(resource)),
        tap((result) => loadMap.set(resource, result)),
      );
    });

    return chain$.pipe(map(() => loadMap));
  }

  updateCustom<T>(resource: string, data: any): Observable<T> {
    const url = `${this.baseApiUrl}/${resource}`;
    return this.http.post<T>(url, data);
  }

  downloadResource(resource: string, params: Record<string, string> = {}): Observable<{ blob: Blob; filename: string }> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, value);
    });
    const url = `${this.baseApiUrl}/${resource}`;
    return this.http.get(url, { params: httpParams, responseType: 'blob', observe: 'response' }).pipe(
      map((response: HttpResponse<Blob>) => {
        const disposition = response.headers.get('Content-Disposition') ?? '';
        const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)["']?/);
        const filename = match?.[1]?.trim() ?? 'export';
        return { blob: response.body as Blob, filename };
      })
    );
  }
}