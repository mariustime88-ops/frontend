import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface TypeHandicap {
  id: number;
  code?: string;
  libelle: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-types-handicaps',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './types-handicaps.component.html',
  styleUrl: './types-handicaps.component.scss',
})
export class TypesHandicapsComponent extends AbstractCrudComponent<TypeHandicap> implements OnInit {
  override resourceName: string = 'type_handicaps'; // Adaptez si votre route API est 'types-handicap' ou 'type_handicaps'
  override modalId: string = 'typeHandicapModal';
  override deleteId: string = 'delete_type_handicap';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Type de handicap',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle'];
}