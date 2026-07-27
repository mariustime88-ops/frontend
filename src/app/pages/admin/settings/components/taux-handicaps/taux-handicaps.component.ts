import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface TauxHandicap {
  id: number;
  libelle: string;
  taux_incapacite: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-taux-handicaps',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './taux-handicaps.component.html',
  styleUrl: './taux-handicaps.component.scss',
})
export class TauxHandicapsComponent extends AbstractCrudComponent<TauxHandicap> implements OnInit {
  override resourceName: string = 'taux_handicaps';
  override modalId: string = 'tauxHandicapModal';
  override deleteId: string = 'delete_taux_handicap';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Taux de handicap',
      filterType: 'text',
    },
    {
      field: 'taux_incapacite',
      header: "Taux d'incapacité",
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle', 'taux_incapacite'];
}