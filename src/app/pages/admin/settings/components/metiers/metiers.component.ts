import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface Metier {
  id: number;
  code?: string;
  libelle: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-metiers',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './metiers.component.html',
  styleUrl: './metiers.component.scss',
})
export class MetiersComponent extends AbstractCrudComponent<Metier> implements OnInit {
  override resourceName: string = 'metiers';
  override modalId: string = 'metierModal';
  override deleteId: string = 'delete_metier';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Nom du métier',
      filterType: 'text',
    },
  ];
}