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

import { CartesComponent } from './pages/admin/base/components/cartes/cartes.component';
import { DemandeursComponent } from './pages/admin/base/components/demandeurs/demandeurs.component';
import { EtudiantshandsComponent } from './pages/admin/base/components/etudiantshands/etudiantshands.component';
import { DemandescreComponent } from './pages/admin/base/components/demandescre/demandescre.component';
import { DemandesinsComponent } from './pages/admin/base/components/demandesins/demandesins.component';
import { EtablissementsComponent } from './pages/admin/base/components/etablissements/etablissements.component';
import { RendezvousComponent } from './pages/admin/base/components/rendezvous/rendezvous.component';
import { AidesComponent } from './pages/admin/base/components/aides/aides.component';

import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';

import { ProfileComponent } from './pages/admin/profile/profile.component';
//import { DepartementssComponent } from './pages/admin/statistiques/demandeurs/components/communess/departementss.component';
//import { SexesComponent } from './pages/admin/statisques/sexes/components/sexes/sexes.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';
//import { DossiernaisComponent } from './pages/admin/base/components/dossiernais/dossiernais.component';


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
 {
  path: Paths.DEMANDEURS,
  component: DemandeursComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.DEMANDEURS_SESSION,
  component: DemandeursComponent,
  data: { sessionScoped: true },
},
 {
  path: Paths.ETUDIANTSHANDS,
  component: EtudiantshandsComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.ETUDIANTSHANDS_SESSION,
  component: EtudiantshandsComponent,
  data: { sessionScoped: true },
},
{
  path: Paths.CARTES,
  component: CartesComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.CARTES_SESSION,
  component: CartesComponent,
  data: { sessionScoped: true },
},
  {
  path: Paths.DEMANDESCRE,
  component: DemandescreComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.DEMANDESCRE_SESSION,
  component: DemandescreComponent,
  data: { sessionScoped: true },
},
 {
  path: Paths.DEMANDESINS,
  component: DemandesinsComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.DEMANDESINS_SESSION,
  component: DemandesinsComponent,
  data: { sessionScoped: true },
},
  {
  path: Paths.DOSSIERNAIS,
  component: DossiernaisComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.DOSSIERNAIS_SESSION,
  component: DossiernaisComponent,
  data: { sessionScoped: true },
},
 {
  path: Paths.AIDES,
  component: AidesComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.AIDES_SESSION,
  component: AidesComponent,
  data: { sessionScoped: true },
},
 {
  path: Paths.ETABLISSEMENTS,
  component: EtablissementsComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.ETABLISSEMENTS_SESSION,
  component: EtablissementsComponent,
  data: { sessionScoped: true },
},
  {
  path: Paths.RENDEZVOUS,
  component: RendezvousComponent,
  data: { sessionScoped: false },
},
{
  path: Paths.RENDEZVOUS_SESSION,
  component: RendezvousComponent,
  data: { sessionScoped: true },
},
  {
    path: Paths.DEMANDEURS,
    component: DemandeursComponent,
  },
   {
    path: 'staff/profile',
    component: ProfileComponent,
  },


];