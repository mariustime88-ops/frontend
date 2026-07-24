import { HttpInterceptorFn } from '@angular/common/http';
import {
  EnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { GlobalConfig } from '@app/app.config';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '@app/environments/environment';
import { formParamsToQueryString } from './functions';

export const export_data = (
  type: string,
  url: string,
  filterData?: any,
  injector?: EnvironmentInjector
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let token = '';
    if (injector) {
      runInInjectionContext(injector, () => {
        const cookiesService = inject(CookieService);
        token = cookiesService.get(GlobalConfig.token);
      });
    }

    const fullUrl =
      environment.URL_API +
      url +
      formParamsToQueryString({ ...filterData, format: type });

    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('download', `export.${type}`);
      link.setAttribute('target', '_blank');

      fetch(fullUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.blob();
        })
        .then((blob) => {
          const blobUrl = window.URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');

          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 100);

          resolve(); // Indique que tout s'est bien passé
        })
        .catch((error) => {
          console.error('Error downloading file:', error);
          window.open(fullUrl, '_blank');
          reject(error); // Indique qu'une erreur est survenue
        });
    } else {
      reject(new Error('Window is undefined'));
    }
  });
};

export const openFile = (
  apiUrl: string,
  injector?: EnvironmentInjector
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let token = '';
    if (injector) {
      runInInjectionContext(injector, () => {
        const cookiesService = inject(CookieService);
        token = cookiesService.get(GlobalConfig.token);
      });
    }

    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/pdf',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(apiUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);

        resolve();
      })
      .catch((error) => {
        console.error('Error opening file:', error);
        window.open(apiUrl, '_blank');
        reject(error);
      });
  });
};
