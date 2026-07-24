import { Component, EnvironmentInjector, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { GlobalConfig } from '@app/app.config';
import { User } from '@app/cores/types/user';
import { getDefaultUser } from '@app/cores/utils/get-user';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  appName: string = "Gestion des indicateurs de Protection de l'Enfant | UNICEF - Bénin";

  user: User = {} as User;
  levelDropdownOpen = false;

  @HostListener('document:click')
  onDocumentClick() { this.levelDropdownOpen = false; }

  constructor(
    private router: Router,
    private cookieService: CookieService,
    private injector: EnvironmentInjector,
  ) {}

  ngOnInit(): void {
    this.user = getDefaultUser(this.injector);
  }

  
  formatDate(d: string | null): string {
    if (!d) return '-';
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(d));
  }

  logout() {
    this.cookieService.delete(GlobalConfig.token);
    this.cookieService.delete(GlobalConfig.user);
    localStorage.removeItem(GlobalConfig.permissions);
    this.router.navigate(['/login']);
  }
}
