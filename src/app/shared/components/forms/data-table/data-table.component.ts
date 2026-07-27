// data-table.component.ts
import {
  Component,
  ContentChildren,
  Input,
  QueryList,
  TemplateRef,
  ViewChild,
  AfterContentInit,
  Output,
  EventEmitter,
  ContentChild,
} from '@angular/core';
import { Table } from 'primeng/table';
import { ImportsModule } from '@app/cores/utils/imports';
import { CheckboxChangeEvent } from 'primeng/checkbox';

export interface Column {
  field: string;
  header: string;
  filterType?: 'text' | 'numeric' | 'date' | 'boolean' | 'custom' | 'none';
  filterField?: string;
  style?: { [key: string]: string };
  customTemplate?: boolean;
  templateName?: string;
  hidden?: boolean;
  dateFormat?: string;
  booleanConfig?: {
    trueText?: string;
    falseText?: string;
    trueClass?: string;
    falseClass?: string;
  };

  width?: 'narrow' | 'medium' | 'wide' | 'auto';
  priority?: number; // Plus le nombre est élevé, plus la colonne est importante
  hideOnMobile?: boolean; // Masquer sur mobile
  sticky?: boolean; // Pour fixer la colonne sur le côté droit comme la colonne actions

  formatter?: (rowData: any) => string; // Fonction qui prend les données de la ligne et retourne une chaîne formatée
  tdclass?: (rowData: any) => string;
  htmlFormatted?: boolean; // Indique si le résultat du formatter contient du HTML à rendre
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [ImportsModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements AfterContentInit {
  @ViewChild('dt') dt: Table | undefined;

  @Input() title: string = '';
  @Input() modalId: string = '';
  @Input() deleteId: string = '';
  @Input() viewId: string = '';
  @Input() viewTitle: string = 'Voir les détails';
  @Input() searchPlaceHolder: string = 'Rechercher...';
  @Input() defaultPaginator: boolean = true;
  @Input() data: any[] = [];
  @Input() columns: Column[] = [];
  @Input() loading: boolean = false;
  @Input() rows: number = 10;
  @Input() rowsPerPageOptions: number[] = [5, 10, 25, 50];
  @Input() globalFilterFields: string[] = [];
  @Input() defaultFilters: boolean = false;
  @Input() hideView: boolean = false;
  @Input() hideEdit: boolean = false;
  @Input() hideDelete: boolean = false;
  @Input() hideSearch: boolean = false;
  @Input() headerStyle: { [key: string]: string } = {
    'background-color': '#0B74DDFF',
  };
  @Input() showActions: boolean = true; // Visible par défaut
  @Input() actionTemplateName: string = 'defaultActions'; // Nom du template à utiliser
  @Input() getMoreActions: (row: any) => any[] = () => [];

  @Input() filters: { [key: string]: any } | null = null;

  // Configuration par défaut pour les valeurs booléennes
  @Input() defaultBooleanConfig: {
    trueText: string;
    falseText: string;
    trueClass: string;
    falseClass: string;
  } = {
    trueText: 'Oui',
    falseText: 'Non',
    trueClass: 'text-green-500 bg-green-100 py-1 px-2 rounded-md font-medium',
    falseClass:
      'text-orange-500 bg-orange-100 py-1 px-2 rounded-md font-medium',
  };

  // Format de date par défaut en français
  @Input() defaultDateFormat: string = 'dd/MM/yyyy';

  // Récupérer tous les templates nommés du composant parent
  @ContentChildren(TemplateRef) allTemplateRefs!: QueryList<TemplateRef<any>>;

  @Output() onView: EventEmitter<any> = new EventEmitter<any>();
  @Output() onEdit: EventEmitter<any> = new EventEmitter<any>();
  @Output() onDelete: EventEmitter<any> = new EventEmitter<any>();
  @Output() onSearch: EventEmitter<string> = new EventEmitter<string>();
  // Map pour stocker les templates par nom
  cellTemplates: Map<string, TemplateRef<any>> = new Map();

  @Input() selectionEnabled: boolean = true; // Activer/désactiver la fonctionnalité de sélection
  @Output() onSelectionChange: EventEmitter<any[]> = new EventEmitter<any[]>(); // Pour notifier les changements de sélection

  selectedItems: any[] = [];

  @Input() additionalActionsTemplate!: TemplateRef<any>;

  ngAfterContentInit(): void {
    // Récupérer tous les templates avec leurs références
    this.allTemplateRefs.forEach((template: any) => {
      const templateRefs = template._def.references;

      // Parcourir toutes les références de template et les ajouter à la map
      if (templateRefs) {
        Object.keys(templateRefs).forEach((refName) => {
          if (refName !== 'customFilter') {
            // Éviter de confondre avec les filtres personnalisés
            this.cellTemplates.set(refName, template);
          }
        });
      }
    });
  }

  getTemplate(templateName: string): TemplateRef<any> | null {
    return this.cellTemplates.get(templateName) || null;
  }

  getNestedProperty(obj: any, path: string): any {
    return path
      .split('.')
      .reduce((prev, curr) => (prev ? prev[curr] : null), obj);
  }

  onFilterInput(event: Event) {
    if (this.dt && this.defaultPaginator) {
      this.dt.filterGlobal(
        (event.target as HTMLInputElement).value,
        'contains',
      );
    } else {
      this.onSearch.emit((event.target as HTMLInputElement).value);
    }
  }

  clear(table: Table) {
    table.clear();
  }

  handleEdit(data: any) {
    this.onEdit.emit(data);
  }

  handleView(data: any) {
    this.onView.emit(data);
  }

  handleDelete(data: any) {
    this.onDelete.emit(data);
  }

  // Nouvelle méthode pour formater une valeur en fonction de son type
  formatCellValue(rowData: any, column: Column): string | null {
    const value = this.getNestedProperty(rowData, column.field);

    // Si la valeur est null ou undefined, on retourne directement null
    if (value === null || value === undefined) {
      return null;
    }

    return value;
  }

  // Méthode pour vérifier si une valeur est booléenne
  isBooleanValue(rowData: any, column: Column): boolean {
    return column.filterType === 'boolean';
  }

  // Méthode pour vérifier si une valeur est une date
  isDateValue(rowData: any, column: Column): boolean {
    return column.filterType === 'date';
  }

  // Méthode pour obtenir la classe CSS pour une valeur booléenne
  getBooleanClass(rowData: any, column: Column): string {
    const value = this.getNestedProperty(rowData, column.field);
    const config = column.booleanConfig || this.defaultBooleanConfig;

    return value
      ? config.trueClass || this.defaultBooleanConfig.trueClass
      : config.falseClass || this.defaultBooleanConfig.falseClass;
  }

  // Méthode pour obtenir le texte pour une valeur booléenne
  getBooleanText(rowData: any, column: Column): string {
    const value = this.getNestedProperty(rowData, column.field);
    const config = column.booleanConfig || this.defaultBooleanConfig;

    return value
      ? config.trueText || this.defaultBooleanConfig.trueText
      : config.falseText || this.defaultBooleanConfig.falseText;
  }

  // Méthode pour obtenir le format de date
  getDateFormat(column: Column): string {
    return column.dateFormat || this.defaultDateFormat;
  }

  isSelected(rowData: any): boolean {
    if (!this.selectedItems || this.selectedItems.length === 0) return false;
    return this.selectedItems.some(
      (item) => JSON.stringify(item) === JSON.stringify(rowData),
    );
  }

  toggleSelection(rowData: any, event: CheckboxChangeEvent): void {
    // Empêcher la propagation de l'événement si nécessaire
    if (event.originalEvent) {
      event.originalEvent.stopPropagation();
    }

    const index = this.selectedItems.findIndex(
      (item) => JSON.stringify(item) === JSON.stringify(rowData),
    );

    if (index !== -1) {
      // Désélectionner
      this.selectedItems.splice(index, 1);
    } else {
      // Sélectionner
      this.selectedItems.push(rowData);
    }

    this.onSelectionChange.emit(this.selectedItems);
  }

  toggleSelectAll(event: CheckboxChangeEvent): void {
    // Empêcher la propagation de l'événement si nécessaire
    if (event.originalEvent) {
      event.originalEvent.stopPropagation();
    }

    // Utilisez event.checked au lieu de checkbox.checked
    if (event.checked) {
      // Sélectionner tous les éléments
      this.selectedItems = [...this.data];
    } else {
      // Désélectionner tous les éléments
      this.selectedItems = [];
    }

    this.onSelectionChange.emit(this.selectedItems);
  }

  getRowNumber(rowIndex: number): number {
    if (!this.filters) return rowIndex + 1;
    const page = Math.max(1, this.filters['page'] ?? 1);
    const perPage = Math.max(1, this.filters['per_page'] ?? 10);
    return perPage * (page - 1) + rowIndex + 1;
  }

  isAllSelected(): boolean {
    return (
      this.data.length > 0 && this.selectedItems.length === this.data.length
    );
  }

  /**
   * Détermine la classe CSS à appliquer à une colonne en fonction de sa configuration
   */
  getColumnClass(column: Column): string {
    const classes: string[] = [];

    // Classe de largeur
    switch (column.width) {
      case 'narrow':
        classes.push('narrow-column');
        break;
      case 'medium':
        classes.push('medium-column');
        break;
      case 'wide':
        classes.push('wide-column');
        break;
      default:
        // Classe par défaut
        break;
    }

    // Masquer sur mobile si spécifié
    if (column.hideOnMobile) {
      classes.push('hidden-mobile');
    }

    return classes.join(' ');
  }

  /**
   * Calcule le nombre total de colonnes pour le colspan du message vide
   */
  getTotalColumns(): number {
    let total = 1; // Colonne # (numéro de ligne)

    // Ajouter la colonne de sélection si activée
    if (this.selectionEnabled) {
      total += 1;
    }

    // Ajouter les colonnes de données visibles
    total += this.columns.filter((col) => !col.hidden).length;

    // Ajouter la colonne actions si visible
    if (this.showActions) {
      total += 1;
    }

    return total;
  }


  /**
   * Détermine si une colonne doit être sticky (fixée)
   */
  isStickyColumn(column: Column): boolean {
    return column.sticky === true;
  }

  /**
   * Calcule la position right pour chaque colonne sticky
   * @param index L'index de la colonne sticky
   * @returns La valeur CSS de position
   */
  calculateStickyPosition(index: number): string {
    // Position de base, ajuster selon vos besoins
    // Espacement entre les colonnes sticky
    const spacing = 8; // en rem
    return `${spacing * index}rem`;
  }

  /**
   * Obtient les colonnes visibles triées par priorité
   */
  getVisibleColumns(): Column[] {
    return this.columns
      .filter((col) => !col.hidden)
      .sort((a, b) => {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        return priorityB - priorityA; // Tri décroissant
      });
  }

  /**
   * Vérifie si une colonne doit être masquée sur mobile
   */
  shouldHideOnMobile(column: Column): boolean {
    return column.hideOnMobile || false;
  }
}
