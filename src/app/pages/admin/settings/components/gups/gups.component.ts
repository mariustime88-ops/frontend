import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface Gups {
  id: number;
  code?: string;
  libelle: string;
  departement_id: number;
  departement?: {
    id: number;
    libelle: string;
  };
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-gups',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './gups.component.html',
  styleUrl: './gups.component.scss',
})
export class GupsComponent extends AbstractCrudComponent<Gups> implements OnInit {
  override resourceName: string = 'gups';
  override modalId: string = 'gupsModal';
  override deleteId: string = 'delete_gups';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Nom du GUPS',
      filterType: 'text',
    },
    {
      field: 'departement.libelle',
      header: 'Département',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle', 'departement.libelle'];

  // Intercepte les données dès qu'elles sont reçues de l'API pour sécuriser l'objet lié
  protected override afterDataLoaded(items: Gups[]): void {
    items.forEach((item) => {
      if (item.departement_id && (!item.departement || !item.departement.libelle)) {
        // Sécurité au cas où l'API renvoie l'ID plat sans l'objet
        item.departement = {
          id: item.departement_id,
          libelle: String(item.departement_id)
        };
      }
    });
  }
}