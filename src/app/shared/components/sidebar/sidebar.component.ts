import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GlobalConfig } from '@app/app.config';
import { MenuItem } from '@app/cores/types/menu-items';
import { decrypt } from '@app/cores/utils/cryptage';
import { Paths } from '@app/paths';
import { CookieService } from 'ngx-cookie-service';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, NgIf, NgFor, AsyncPipe, ToastModule],
  providers: [MessageService],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  paths = Paths;
  menuConfig: MenuItem[] = [];
  loadOptions: boolean = false;

  constructor(
    private router: Router,
    private cookieService: CookieService,
    private messageService: MessageService,
  ) { }

  ngOnInit() {
    const userCookie = this.cookieService.get(GlobalConfig.user);
    const user = userCookie ? decrypt(userCookie) : null;

    this.menuConfig = [
      {
        label: 'Tableau de bord',
        link: this.paths.DASHBOARD,
        icon: 'chart-line',
        guarded: true,
      },

     {
        label: 'Session active',
        icon: 'bolt',
        guarded: true,
        children: [

          {
            label: 'Demandeurs',
            link: '-----',
            icon: 'users',
            guarded: true,
          },
          {
            label: 'Étudiants',
            link: 'staff/etudiants',
            icon: 'graduation-cap',
            guarded: true,
          },
          {
            label: "Cartes d'égalité",
            link: 'staff/cartes-egalite',
            icon: 'id-card',
            guarded: true,
          },
          {
            label: 'Dossiers naissance multiple',
            link: 'staff/dossiers-naissance-multiple',
            icon: 'folder',
            guarded: true,
          },
          {
            label: "Demandes d'installation",
            link: 'staff/demandes-installation',
            icon: 'tools',
            guarded: true,
          },
          {
            label: 'Demandes de crédit',
            link: 'staff/demandes-credit',
            icon: 'hand-holding-usd',
            guarded: true,
          },
          {
            label: 'Rendez-vous',
            link: 'staff/rendez-vous',
            icon: 'calendar-alt',
            guarded: true,
          },
          {
            label: 'Établissements inclusifs',
            link: 'staff/etablissements-inclusifs',
            icon: 'building',
            guarded: true,
          },
          {
            label: 'Aides Techniques de mobilité',
            link: 'staff/aides-techniques',
            icon: 'wheelchair',
            guarded: true,
          },
        ],
      },
      {
        label: 'Base de données complète',
        link: 'staff/base-de-donnees',
        icon: 'database',
        guarded: true,
        children: [
          {
            label: 'Demandeurs',
           link: '-----',
            guarded: true,
          },
          {
            label: 'Étudiants handicapés',
            link: '-----',
            guarded: true,
          },
          {
            label: "Dossiers naissance multiples",
            link: '-----',
            guarded: true,
          },
          {
            label: "Demandes d'installation",
            link: '-----',
            guarded: true,
          },
         
          {
            label: 'Demandes de crédit',
            link: '-----',
            guarded: true,
          },
          {
            label: 'Rendez-vous',
           link: '-----',
            guarded: true,
          },
          {
            label: 'Établissements inclusifs',
            link: '-----',
            guarded: true,
          },
          {
            label: 'Aides Techniques de mobilité',
            link: '-----',
            guarded: true,
          },
        ],
      },

      {
        label: 'Statistiques',
        icon: 'chart-bar',
        guarded: true,
        children: [
          {
            label: 'Demandeurs',
            guarded: true,
            children: [
              {
                label: 'Demandeurs / Departements',
                link: '-----',
                guarded: true,
              },
               {
                label: 'Demandeurs / Communes',
                link: '-----',
                guarded: true,
              },
               {
                label: 'Demandeurs / Sexe',
                link: '-----',
                guarded: true,
              },
            ],
          },
          {
            label: 'Étudiants Handicapés',
            guarded: true,
            children: [
              {
                label: 'étudiants / Departements',
                link: '-----',
                guarded: true,
              },
              {
                label: 'étudiants / Communes',
                link: '-----',
                guarded: true,
              },
              {
                label: 'étudiants / Sexe',
                link: '-----',
                guarded: true,
              },
            ],
          },
          {
            label: 'Dossier naissance Multiple',
            guarded: true,
            children: [
              {
                label: 'Dossier / Departements',
                link: '-----',
                guarded: true,
              },
               {
                label: 'Dossier / Communes',
                link: '-----',
                guarded: true,
              },
               {
                label: 'Dossier / Sexe',
                link: '-----',
                guarded: true,
              },
            ],
          },
          {
            label: "Cartes d'égalité",
            guarded: true,
            children: [
              {
                label: 'Cartes / Departements',
                link: '-----',
                guarded: true,
              },
                {
                label: 'Cartes / Gups',
                link: '-----',
                guarded: true,
              },
            ],
          },
        ],
      },
      {
        label: 'Paramètres',
        icon: 'cog',
        guarded: true,
        children: [
          {
            label: 'Départements',
            link: 'staff/parametres/departements', 
            guarded: true,
          },
          {
            label: 'Communes',
           link: 'staff/parametres/communes', 
             guarded: true,
          },
         {
  label: 'Arrondissements',
  link: 'staff/parametres/arrondissements',
  guarded: true,
},
          {
            label: 'Quartiers/Villages',
  link: 'staff/parametres/quartiers-villages',
            guarded: true,
          },
          {
            label: 'GUPS',
  link: 'staff/parametres/gups',
            guarded: true,
          },
          {
            label: 'Centres de Santé',
            link: 'staff/parametres/centre-sante',
            guarded: true,
          },
          {
            label: 'Métiers',
            link: 'staff/parametres/metiers',
            guarded: true,
          },
          {
            label: 'Types Handicap',
            link: 'staff/parametres/types-handicaps',
            guarded: true,
          },
          {
            label: 'Taux Handicap',
            link: 'staff/parametres/taux-handicaps',
            guarded: true,
          },
          {
            label: 'Types Kit',
            link: 'staff/parametres/types-kits',
            guarded: true,
          },
          {
            label: 'Types Soin',
            link: 'staff/parametres/types-soins',
            guarded: true,
          },
          {
            label: 'Professions',
            link: 'staff/parametres/professions',
            guarded: true,
          },
          {
            label: 'Utilisateurs',
            link: 'staff/parametres/utilisateurs',
            guarded: true,
          },
          {
            label: 'Sessions',
            link: 'staff/parametres/sessions',
            guarded: true,
          },
        ],
      },

      {
        label: 'Documentation',
        link: '-----',
        icon: 'file-alt',
        guarded: true,
         children: [
          {
            label: 'Types de documents',
           link: '-----',
            guarded: true,
          },
          {
            label: 'Documents',
            link: '-----',
            guarded: true,
          },],
      },
    ];
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
        if (this.isMenuItemActive(child)) {
          return true;
        }
      }
    }

    return false;
  }

  logout(): void {
    this.cookieService.delete(GlobalConfig.token);
    this.cookieService.delete(GlobalConfig.user);
    localStorage.removeItem(GlobalConfig.permissions);
    sessionStorage.removeItem('level_chosen');

    this.messageService.add({
      severity: 'success',
      summary: 'Déconnexion',
      detail: 'Vous avez bien été déconnecté',
    });

    this.router.navigate([Paths.LOGIN]);
  }
}