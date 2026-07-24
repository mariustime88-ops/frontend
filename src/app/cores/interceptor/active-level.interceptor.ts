import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActiveLevelService } from '@app/cores/services/active-level.service';

export const ActiveLevelInterceptor: HttpInterceptorFn = (req, next) => {
  const activeLevelSvc = inject(ActiveLevelService);
  const code = activeLevelSvc.activeLevelCode;

  // Injecter active_level uniquement sur les endpoints validator
  if (code && req.url.includes('/validators/')) {
    const params = req.params.set('active_level', code);
    return next(req.clone({ params }));
  }

  return next(req);
};
