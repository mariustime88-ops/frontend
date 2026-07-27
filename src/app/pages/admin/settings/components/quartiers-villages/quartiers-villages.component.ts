import { Component } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface QuartierVillage {
  id: string | number;
  libelle: string;
  arrondissement_id: string | number;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-quartiers-villages',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './quartiers-villages.component.html',
  styleUrl: './quartiers-villages.component.scss',
})
export class QuartiersVillagesComponent extends AbstractCrudComponent<QuartierVillage> {
  override resourceName: string = 'quartiers'; // Mettez bien 'quartiers' ici
  override modalId: string = 'quartiersVillagesModal';
  override deleteId: string = 'delete_quartiers_villages';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Nom du Quartier/Village',
      filterType: 'text',
    },
    {
      field: 'arrondissement.libelle', // Nom de la relation côté Laravel
      header: 'Arrondissement',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle'];
}