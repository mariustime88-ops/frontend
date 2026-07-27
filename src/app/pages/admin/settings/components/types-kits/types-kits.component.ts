import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface TypeKit {
  id: number;
  libelle: string;
  metier_id: number;
  metier?: {
    id: number;
    libelle: string;
  };
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-types-kits',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './types-kits.component.html',
  styleUrl: './types-kits.component.scss',
})
export class TypesKitsComponent extends AbstractCrudComponent<TypeKit> implements OnInit {
  override resourceName: string = 'type_kits';
  override modalId: string = 'typesKitsModal';
  override deleteId: string = 'delete_types_kits';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Nom du kit',
      filterType: 'text',
    },
    {
      field: 'metier.libelle',
      header: 'Métier',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle', 'metier.libelle'];

  protected override afterDataLoaded(items: TypeKit[]): void {
    items.forEach((item) => {
      if (item.metier_id && (!item.metier || !item.metier.libelle)) {
        item.metier = {
          id: item.metier_id,
          libelle: String(item.metier_id)
        };
      }
    });
  }
}