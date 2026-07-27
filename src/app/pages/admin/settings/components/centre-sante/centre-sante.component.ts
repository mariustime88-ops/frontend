import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface CentreSante {
  id: number;
  code?: string;
  libelle: string;
  commune_id: number;
  commune?: {
    id: number;
    libelle: string;
  };
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-centre-sante',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './centre-sante.component.html',
  styleUrl: './centre-sante.component.scss',
})
export class CentreSanteComponent extends AbstractCrudComponent<CentreSante> implements OnInit {
  override resourceName: string = 'centre_santes'; // Vérifiez si votre route API est 'centres-sante' ou 'centre-sante'
  override modalId: string = 'centreSanteModal';
  override deleteId: string = 'delete_centre_sante';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Nom du centre de santé',
      filterType: 'text',
    },
    {
      field: 'commune.libelle',
      header: 'Commune',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle', 'commune.libelle'];

  protected override afterDataLoaded(items: CentreSante[]): void {
    items.forEach((item) => {
      if (item.commune_id && (!item.commune || !item.commune.libelle)) {
        item.commune = {
          id: item.commune_id,
          libelle: String(item.commune_id)
        };
      }
    });
  }
}