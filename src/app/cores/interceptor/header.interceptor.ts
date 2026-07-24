import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { GlobalConfig } from '@app/app.config';
import { CookieService } from 'ngx-cookie-service';

export const HeadersInterceptor: HttpInterceptorFn = (req, next) => {
  const cookies = inject(CookieService);
  const token = cookies.get(GlobalConfig.token);

  const modifiedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
  return next(modifiedReq);
};
