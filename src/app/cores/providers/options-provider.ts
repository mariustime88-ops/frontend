// options-provider.service.ts
import { Injectable, Inject, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '@app/environments/environment';
import { GlobalStaticOptions } from '@app/global.config';

// Token pour injecter les options statiques définies dans l'application
export const STATIC_OPTIONS = 'STATIC_OPTIONS';

@Injectable({
  providedIn: 'root',
})
export class OptionsProviderService {
  private optionsCache: { [key: string]: Observable<any[]> } = {};
  private staticOptions: { [key: string]: any[] } = {};

  constructor(
    private http: HttpClient,
    @Optional()
    @Inject(STATIC_OPTIONS)
    staticOptionsMap: { [key: string]: any[] } | null,
  ) {
    // Initialiser les options statiques si fournies
    if (staticOptionsMap) {
      this.staticOptions = staticOptionsMap;
    }
  }

  /**
   * Récupère les options depuis une source statique ou API
   */
  getOptions(
    name: string,
    sourceType: 'static' | 'api' = 'static',
    apiRoute?: string,
  ): Observable<any[]> {
    // Vérifier si les données sont déjà en cache
    const cacheKey = `${sourceType}:${name}:${apiRoute || ''}`;
    if (this.optionsCache[cacheKey]) {
      return this.optionsCache[cacheKey];
    }

    let options$: Observable<any[]>;

    if (sourceType === 'static') {
      // Données statiques
      options$ = this.getStaticOptions(name);
    } else {
      // Données depuis l'API
      options$ = this.getApiOptions(name, apiRoute);
    }

    // Mettre en cache et partager les résultats
    this.optionsCache[cacheKey] = options$.pipe(shareReplay(1));
    return this.optionsCache[cacheKey];
  }

  isStaticOptionKey(key: string): key is any {
    return key in GlobalStaticOptions;
  }
  /**
   * Récupère des options statiques prédéfinies
   */
  private getStaticOptions(name: string): Observable<any[]> {
    if (this.isStaticOptionKey(name)) {
      return of(GlobalStaticOptions[name]);
    }

    console.warn(`Static options '${name}' not found`);
    return of([]);
  }

  /**
   * Récupère des options depuis l'API
   */
  private getApiOptions(name: string, apiRoute?: string): Observable<any[]> {
    const url = environment.URL_API + '/' + (apiRoute || `${name}`);

    return this.http.get<any>(url).pipe(
      map((response) => {
        // Adapter en fonction de la structure de réponse API
        if (response && response.response) {
          return response.response.data;
        }
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.error(`Error fetching options for '${name}' from API:`, error);
        return of([]);
      }),
    );
  }

  /**
   * Enregistre manuellement des options statiques
   */
  registerStaticOptions(name: string, options: any[]): void {
    this.staticOptions[name] = options;
    // Vider le cache si ces options étaient déjà chargées
    this.clearCache('static', name);
  }

  /**
   * Vide le cache pour forcer le rechargement des données
   */
  clearCache(
    sourceType?: 'static' | 'api',
    name?: string,
    apiRoute?: string,
  ): void {
    if (name) {
      const cacheKey = `${sourceType || '*'}:${name}:${apiRoute || ''}`;

      // Supprimer les entrées spécifiques ou toutes les entrées correspondant au modèle
      Object.keys(this.optionsCache).forEach((key) => {
        if (cacheKey.includes('*') ? key.includes(name) : key === cacheKey) {
          delete this.optionsCache[key];
        }
      });
    } else {
      // Vider tout le cache
      this.optionsCache = {};
    }
  }
}