import { inject, Injector, runInInjectionContext } from '@angular/core';
import { GlobalConfig } from '@app/app.config';
import { User } from '@app/cores/types/user';
import { CookieService } from 'ngx-cookie-service';
import { decrypt } from './cryptage';

export const getDefaultUser = (injector: Injector): User => {
  return runInInjectionContext(injector, () => {
    const cookieService = inject(CookieService);
    const user = cookieService.get(GlobalConfig.user);
    return user ? decrypt(user) : ({} as User);
  });
};
