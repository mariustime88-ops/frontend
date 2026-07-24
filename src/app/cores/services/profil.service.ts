import { Injectable } from '@angular/core';
import { environment } from '@app/environments/environment';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { GlobalConfig } from '@app/app.config';
import { CookieService } from 'ngx-cookie-service';
import { Router } from '@angular/router';
import { decrypt } from '../utils/cryptage';
import { Paths } from '@app/paths';

export interface HttpRequestResponseAll<T> {
  message: string;
  list: T;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProfilService {
  private base: string = 'profil';

  private permissionsSubject = new BehaviorSubject<
    HttpRequestResponseAll<any[]>
  >({
    message: '',
    list: [],
    total: 0,
  });
  permissions$ = this.permissionsSubject.asObservable();
  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private router: Router,
  ) {}

  getPermissionsFromLocal(): Observable<
    HttpRequestResponseAll<any[]>
  > {
    let permissions = localStorage.getItem(GlobalConfig.permissions);
    if (permissions) {
      const decryptedPermissions = decrypt(permissions);
      this.permissionsSubject.next(decryptedPermissions);
      console.log('permissions', decryptedPermissions);

      return of(decryptedPermissions);
    } else {
      this.cookieService.deleteAll();
      localStorage.removeItem(GlobalConfig.permissions);
      this.router.navigateByUrl(Paths.LOGIN);

      return of({ list: [], message: '', total: 0 });
    }
  }

  hasReadPermission(moduleCode: string): boolean {
    const permissions = this.permissionsSubject.getValue();
    const permission = permissions.list.find(
      (p) => p.module?.code === moduleCode,
    );
    return permission?.consulter === 1;
  }

  hasAddEditPermission(moduleCode: string): boolean {
    const permissions = this.permissionsSubject.getValue();
    const permission = permissions.list.find(
      (p) => p.module?.code === moduleCode,
    );
    return permission?.ajouter_modifier === 1;
  }

  hasValidPermission(moduleCode: string): boolean {
    const permissions = this.permissionsSubject.getValue();
    const permission = permissions.list.find(
      (p) => p.module?.code === moduleCode,
    );
    return permission?.valider === 1;
  }

  hasRemovePermission(moduleCode: string): boolean {
    const permissions = this.permissionsSubject.getValue();
    const permission = permissions.list.find(
      (p) => p.module?.code === moduleCode,
    );
    return permission?.supprimer === 1;
  }
}
