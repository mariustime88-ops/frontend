import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GlobalConfig } from '@app/app.config';
import { decrypt } from '@app/cores/utils/cryptage';
import { MenuItem } from '@app/cores/types/menu-items';
import { AppNotificationService } from '@app/cores/services/app-notification.service';
import { Paths } from '@app/paths';
import { CookieService } from 'ngx-cookie-service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-partenaire-sidebar',
  imports: [RouterLink, NgIf, NgFor, AsyncPipe, ToastModule],
  providers: [MessageService],
  templateUrl: './partenaire-sidebar.component.html',
  styleUrl: './partenaire-sidebar.component.scss',
})
export class PartenaireSidebarComponent implements OnInit, OnDestroy {
  paths = Paths;
  menuConfig: MenuItem[] = [];
  loadOptions: boolean = false;

  private countsSub: Subscription | null = null;

  constructor(
    private router: Router,
    private cookieService: CookieService,
    private messageService: MessageService,
    private notifSvc: AppNotificationService,
  ) { }

  ngOnInit() {
    const userCookie = this.cookieService.get(GlobalConfig.user);
    const user = userCookie ? decrypt(userCookie) : null;
    const groupPerms: string[] = user?.validator_group?.permissions ?? [];
    const can = (p: string) => groupPerms.includes(p);

    this.menuConfig = [
      {
        label: 'Tableau de bord',
        link: this.paths.PARTENAIRES_DASHBOARD,
        icon: 'tachometer-alt',
        guarded: true,
      },
      {
        label: ' Saisie de données',
        link: this.paths.PARTENAIRES_SAISIE_DONNEES,
        icon: 'edit',
        guarded: true,
        badge: 0,
      },
      // {
      //   label: ' Historique des soumissions',
      //   link: this.paths.PARTENAIRES_HISTORIQUE_SOUMISSIONS,
      //   icon: 'history',
      //   guarded: true,
      // },
      {
        label: 'Toutes les données de saisie',
        link: Paths.ADMIN_DONNEES_SAISIE_VIEW,
        icon: 'eye',
        guarded: true,
      },
      // {
      //   label: 'Corbeille',
      //   link: Paths.ADMIN_CORBEILLE,
      //   icon: 'inbox',
      //   guarded: can('MANAGE_CONFIG'),
      // },
      {
        label: 'Bibliothèque',
        link: this.paths.PARTENAIRES_DOCUMENTS,
        icon: 'book',
        guarded: true,
      },
      {
        label: 'Archives',
        link: this.paths.PARTENAIRES_MES_DONNEES,
        icon: 'archive',
        guarded: true,
      },
    ];

    this.countsSub = this.notifSvc.counts$.subscribe((counts) => {
      const saisieItem = this.menuConfig.find((m) => m.link === this.paths.PARTENAIRES_SAISIE_DONNEES);
      if (saisieItem) {
        const n = (counts.by_type.validation ?? 0) + (counts.by_type.rejection ?? 0);
        saisieItem.badge = n > 0 ? n : undefined;
      }
    });
  }

  ngOnDestroy(): void {
    this.countsSub?.unsubscribe();
  }

  isRouteStartsWith(prefix: string | null): boolean {
    if (prefix != '') {
      const normalizedPrefix = prefix?.startsWith('/') ? prefix : `/${prefix}`;
      const currentRoute = this.router.url;

      return currentRoute.startsWith(normalizedPrefix);
    }

    return false;
  }

  isMenuItemActive(item: MenuItem): boolean {
    if (item.base) {
      const normalizedBase = item.base.startsWith('/')
        ? item.base
        : `/${item.base}`;
      if (this.router.url.startsWith(normalizedBase)) {
        return true;
      }
    }

    if (item.link) {
      const normalizedLink = item.link.startsWith('/')
        ? item.link
        : `/${item.link}`;
      if (this.router.url.startsWith(normalizedLink)) {
        return true;
      }
    }

    if (item.children) {
      for (const child of item.children) {
        if (child.link) {
          const normalizedLink = child.link.startsWith('/')
            ? child.link
            : `/${child.link}`;
          if (this.router.url.startsWith(normalizedLink)) {
            return true;
          }
        }

        if (child.children && this.isMenuItemActive(child)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Déconnecte l'utilisateur et le redirige vers la page de connexion
   */
  logout(): void {
    // Supprimer les cookies d'authentification
    this.cookieService.delete(GlobalConfig.token);
    this.cookieService.delete(GlobalConfig.user);

    // Supprimer les données locales
    localStorage.removeItem(GlobalConfig.permissions);

    // Afficher un message de succès
    this.messageService.add({
      severity: 'success',
      summary: 'Déconnexion',
      detail: 'Vous avez bien été déconnecté',
    });

    // Rediriger vers la page de connexion
    this.router.navigate([Paths.LOGIN]);
  }
}
