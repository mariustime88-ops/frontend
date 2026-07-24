import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { ProfilService } from '../services/profil.service';

@Pipe({
  name: 'hasPermission',
  pure: false,
  standalone: true
})
@Injectable({
  providedIn: 'root'
})
export class HasPermissionPipe implements PipeTransform {
  constructor(private profilService: ProfilService) {}

  transform(moduleCode: string, permissionType: 'read' | 'addEdit' | 'validate' | 'remove'): boolean {
    switch(permissionType) {
      case 'read':
        return this.profilService.hasReadPermission(moduleCode);
      case 'addEdit':
        return this.profilService.hasAddEditPermission(moduleCode);
      case 'validate':
        return this.profilService.hasValidPermission(moduleCode);
      case 'remove':
        return this.profilService.hasRemovePermission(moduleCode);
      default:
        return false;
    }
  }
}
