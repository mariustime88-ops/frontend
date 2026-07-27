import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { Paths } from './paths';
import { LoginComponent } from './pages/admin/security/login/login.component';
import { CommunesComponent } from './pages/admin/settings/components/communes/communes.component';
import { DepartementsComponent } from './pages/admin/settings/components/departements/departements.component';
import { ArrondissementsComponent } from './pages/admin/settings/components/arrondissements/arrondissements.component';
import { QuartiersVillagesComponent } from './pages/admin/settings/components/quartiers-villages/quartiers-villages.component';
import { GupsComponent } from './pages/admin/settings/components/gups/gups.component';
import { CentreSanteComponent } from './pages/admin/settings/components/centre-sante/centre-sante.component';
import { MetiersComponent } from './pages/admin/settings/components/metiers/metiers.component';
import { TypesHandicapsComponent } from './pages/admin/settings/components/types-handicaps/types-handicaps.component';
import { TauxHandicapsComponent } from './pages/admin/settings/components/taux-handicaps/taux-handicaps.component';
import { TypesKitsComponent } from './pages/admin/settings/components/types-kits/types-kits.component';
import { TypesSoinsComponent } from './pages/admin/settings/components/types-soins/types-soins.component';
import { ProfessionsComponent } from './pages/admin/settings/components/professions/professions.component';
import { UtilisateursComponent } from './pages/admin/settings/components/utilisateurs/utilisateurs.component';
import { SessionsComponent } from './pages/admin/settings/components/sessions/sessions.component';

export const routes: Routes = [
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
  {
    path: Paths.QUARTIERS_VILLAGES,
    component: QuartiersVillagesComponent,
  },
  {
    path: Paths.GUPS,
    component: GupsComponent,
  },
  {
    path: Paths.CENTRE_SANTE,
    component: CentreSanteComponent,
  },
 {
    path: Paths.METIERS,
    component: MetiersComponent ,
  },
  {
    path: Paths.TYPES_HANDICAPS,
    component: TypesHandicapsComponent  ,
  },{
    path: Paths.TAUX_HANDICAPS,
    component: TauxHandicapsComponent  ,
  },
  
  {
    path: Paths.TYPES_KITS,
   component: TypesKitsComponent,
  },
   {
   path: Paths.TYPES_SOINS,
    component: TypesSoinsComponent,
  },
   {
    path: Paths.PROFESSIONS,
    component: ProfessionsComponent,
  },
   {
    path: Paths.UTILISATEURS,
    component: UtilisateursComponent,
  },
   {
    path: Paths.SESSIONS,
    component: SessionsComponent,
  },
];