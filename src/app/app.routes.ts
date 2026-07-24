import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';

import { Paths } from './paths';
import { LoginComponent } from './pages/admin/security/login/login.component';
import { CommunesComponent } from './pages/admin/settings/components/communes/communes.component';
import { DepartementsComponent } from './pages/admin/settings/components/departements/departements.component';
import { ArrondissementsComponent } from './pages/admin/settings/components/arrondissements/arrondissements.component';


const appRoutes: Routes = [
  {
    path: '',
    redirectTo: Paths.LOGIN,
    pathMatch: 'full',
  },
  {
    path: Paths.LOGIN,
    component: LoginComponent,
  },
  {
    path: Paths.DASHBOARD,
    component: DashboardComponent,
  },
  {
    path: Paths.COMMUNES,
    component: CommunesComponent,
  },
   {
    path: Paths.DEPARTEMENTS,
    component: DepartementsComponent,
  },
 {
    path: Paths.ARRONDISSEMENTS,
    component: ArrondissementsComponent,
  },
];

export const routes: Routes = [...appRoutes,];