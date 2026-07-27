import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface TypeSoin {
  id: number;
  libelle: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-types-soins',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './types-soins.component.html',
  styleUrl: './types-soins.component.scss',
})
export class TypesSoinsComponent extends AbstractCrudComponent<TypeSoin> implements OnInit {
  override resourceName: string = 'type_soins'; // À adapter selon la route exacte de ton API backend
  override modalId: string = 'typesSoinsModal';
  override deleteId: string = 'delete_types_soins';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Type de soin',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle'];
}