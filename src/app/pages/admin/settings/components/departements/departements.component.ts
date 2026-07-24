import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface Departement {
  id: number;
  code: string;
  libelle: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-departements',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './departements.component.html',
  styleUrl: './departements.component.scss',
})
export class DepartementsComponent extends AbstractCrudComponent<Departement> implements OnInit {
  override resourceName: string = 'departements';
  override modalId: string = 'departementsModal';
  override deleteId: string = 'delete_departements';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Libellé',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle', 'code'];
}