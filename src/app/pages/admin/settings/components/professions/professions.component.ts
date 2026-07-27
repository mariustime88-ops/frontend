import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface Profession {
  id: number;
  libelle: string;
  salarie: boolean | number;
  type_profession?: string; // Pour l'affichage dans le tableau
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-professions',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './professions.component.html',
  styleUrl: './professions.component.scss',
})
export class ProfessionsComponent extends AbstractCrudComponent<Profession> implements OnInit {
  override resourceName: string = 'professions';
  override modalId: string = 'professionsModal';
  override deleteId: string = 'delete_professions';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Nom de la profession',
      filterType: 'text',
    },
    {
      field: 'type_profession', // On pointe vers la propriété formatée
      header: 'Type profession',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle'];

  protected override afterDataLoaded(items: Profession[]): void {
    items.forEach((item) => {
      // Convertit le boolean/int en texte exact pour le tableau
      item.type_profession = item.salarie ? 'Salarié' : 'Non Salarié';
    });
  }
}