import {
  Component,
  EnvironmentInjector,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { AdminLayoutComponent } from '@app/layouts/admin-layout/admin-layout.component';
import {
  TabOption,
  TabsComponent,
} from '@app/shared/components/tabs/tabs.component';

// Import des composants CRUD
import { CommunesComponent } from '../components/communes/communes.component';

@Component({
  selector: 'app-referentiels',
  imports: [
    AdminLayoutComponent,
    TabsComponent,
    CommunesComponent,
  ],
  templateUrl: './partenaires-territoires.component.html',
  styleUrl: './partenaires-territoires.component.scss',
})
export class PartenairesTerritoiresComponent {
  activeTab: string = 'structures';

  options: TabOption[] = [
    {
      label: 'Partenaires',
      value: 'structures',
    },
    {
      label: 'Départements',
      value: 'departements',
    },
    {
      label: 'Communes',
      value: 'communes',
    },
  ];

  @ViewChild('structures', { static: true })
  structures!: TemplateRef<any>;

  @ViewChild('departements', { static: true })
  departements!: TemplateRef<any>;

  @ViewChild('communes', { static: true })
  communes!: TemplateRef<any>;

  templates: { [key: string]: TemplateRef<any> } = {};

  constructor(private injector: EnvironmentInjector) {}

  ngAfterViewInit() {
    this.templates = {
      structures: this.structures,
      departements: this.departements,
      communes: this.communes,
    };
  }

  onTabChanged(tab: string) {
    this.activeTab = tab;
  }
}
