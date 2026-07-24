import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface Commune {
  id: number;
  code: string;
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
  selector: 'app-communes',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './communes.component.html',
  styleUrl: './communes.component.scss',
})
export class CommunesComponent extends AbstractCrudComponent<Commune> implements OnInit {
  override resourceName: string = 'communes';
  override modalId: string = 'communesModal';
  override deleteId: string = 'delete_communes';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Nom de la commune',
      filterType: 'text',
    },
    {
      field: 'departement.libelle',
      header: 'Département',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle'];

  // Correspondance departement_id -> libelle, chargée une seule fois
  private departementsMap = new Map<number, string>();

  protected override onComponentInit(): void {
    this.resourceService
      .loadResource<any>('departements', {
        paginate: true,
        params: { all: '1' } as any,
      })
      .subscribe((res: any) => {
        const list = res?.response?.data ?? [];
        list.forEach((d: any) => this.departementsMap.set(d.id, d.libelle));
        this.mapDepartementLabels(this.data);
      });
  }

  protected override afterDataLoaded(items: Commune[]): void {
    this.mapDepartementLabels(items);
  }

  private mapDepartementLabels(items: Commune[]): void {
    items.forEach((item) => {
      item.departement = {
        id: item.departement_id,
        libelle:
          this.departementsMap.get(item.departement_id) ??
          String(item.departement_id),
      };
    });
  }
}
