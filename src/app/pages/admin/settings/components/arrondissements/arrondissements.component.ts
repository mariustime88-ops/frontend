import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface Arrondissement {
  id: number;
  code: string;
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
  selector: 'app-arrondissements',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './arrondissements.component.html',
  styleUrl: './arrondissements.component.scss',
})
export class ArrondissementsComponent extends AbstractCrudComponent<Arrondissement> implements OnInit {
  override resourceName: string = 'arrondissements';
  override modalId: string = 'arrondissementsModal';
  override deleteId: string = 'delete_arrondissements';

  columns: Column[] = [
    {
      field: 'libelle',
      header: 'Libellé',
      filterType: 'text',
    },
    {
      field: 'commune.libelle',
      header: 'Communes',
      filterType: 'text',
    },
  ];

  globalFilterFields = ['libelle'];

  // Correspondance commune_id -> libelle, chargée une seule fois
  private communesMap = new Map<number, string>();

  protected override onComponentInit(): void {
    this.resourceService
      .loadResource<any>('communes', {
        paginate: true,
        params: { all: '1' } as any,
      })
      .subscribe((res: any) => {
        const list = res?.response?.data ?? [];
        list.forEach((c: any) => this.communesMap.set(c.id, c.libelle));
        this.mapCommuneLabels(this.data);
      });
  }

  protected override afterDataLoaded(items: Arrondissement[]): void {
    this.mapCommuneLabels(items);
  }

  private mapCommuneLabels(items: Arrondissement[]): void {
    items.forEach((item) => {
      item.commune = {
        id: item.commune_id,
        libelle:
          this.communesMap.get(item.commune_id) ?? String(item.commune_id),
      };
    });
  }
}