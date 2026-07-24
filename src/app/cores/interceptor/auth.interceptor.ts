import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { GlobalConfig } from '@app/app.config';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Paths } from '@app/paths';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);
  // const messageService = inject(MessageService);

  return next(req).pipe(
    catchError(error => {
      if (error.status === 401) {
        // Afficher un message d'alerte
        // messageService.add({
        //   severity: 'error',
        //   summary: 'Session expirée',
        //   detail: 'Votre session a expiré. Veuillez vous reconnecter.',
        //   life: 5000
        // });

        // Supprimer les cookies d'authentification
        cookieService.delete(GlobalConfig.token);
        cookieService.delete(GlobalConfig.user);
        localStorage.removeItem(GlobalConfig.permissions);

        // Rediriger vers la page de connexion
        router.navigateByUrl(Paths.LOGIN);
      }

      return throwError(() => error);
    })
  );
};
