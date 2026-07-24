// Interface pour les options de chargement
export interface LoadOptions {
  forceRefresh?: boolean;
  params?: Record<string, string>;
  paginate?: boolean;
  page?: number;
  limit?: number;
  cacheTime?: number; // Temps en ms avant que le cache n'expire
}

// Interface pour les résultats paginés
export interface PaginatedResult<T> {
  response: {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    per_page?: 5;
    from: number;
    to: number;
    current_page: number;
    // meta?: {
    //   current_page: number;
    //   from: number;
    //   last_page: number;
    //   per_page: number;
    //   to: number;
    //   total: number;
    // };
    meta?: any;
  };
}

export interface FilterType {
  search: string;
  total: number;
  page: number;
  totalPages: number;
  per_page: number;
  [key: string]: string | number;
}

// Interface pour le cache
export interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  paginatedData?: Map<string, PaginatedResult<T>>;
}