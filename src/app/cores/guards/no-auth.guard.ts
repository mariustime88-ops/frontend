import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { GlobalConfig } from '@app/app.config';
import { Paths } from '@app/paths';

export const NoAuthGuard: CanActivateFn = () => {
  const cookieService = inject(CookieService);
  const router = inject(Router);

  // Navigation issue de la déconnexion : on laisse passer sans vérifier le cookie
  const nav = router.getCurrentNavigation();
  if (nav?.extras?.state?.['logout']) {
    return true;
  }

  if (cookieService.get(GlobalConfig.token)) {
    return router.createUrlTree([Paths.DASHBOARD]);
  }

  return true;
};
