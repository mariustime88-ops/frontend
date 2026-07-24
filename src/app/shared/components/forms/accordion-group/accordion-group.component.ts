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
import { ImportsModule } from '@app/cores/utils/imports';
import { Table } from 'primeng/table';

export interface AccordionGroupItem {
  groupKey: string;
  groupValue: string;
  items: any[];
  expanded?: boolean;
  count?: number;
}

export interface AccordionColumn {
  field: string;
  header: string;
  filterType?: 'text' | 'numeric' | 'date' | 'boolean' | 'custom';
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
  priority?: number;
  hideOnMobile?: boolean;
  sticky?: boolean;

  formatter?: (rowData: any) => string;
  tdclass?: (rowData: any) => string;
}

@Component({
  selector: 'app-accordion-group',
  standalone: true,
  imports: [ImportsModule],
  templateUrl: './accordion-group.component.html',
  styleUrls: ['./accordion-group.component.scss'],
})
export class AccordionGroupComponent implements AfterContentInit {
  @Input() title: string = '';
  @Input() groupBy: string = '';
  @Input() groupLabelField: string = '';
  @Input() countField: string = '';
  @Input() rawData: any[] = [];
  @Input() columns: AccordionColumn[] = [];
  @Input() loading: boolean = false;
  @Input() showActions: boolean = true;
  @Input() modalId: string = '';
  @Input() deleteId: string = '';
  @Input() viewId: string = '';
  @Input() hideView: boolean = false;
  @Input() hideEdit: boolean = false;
  @Input() hideDelete: boolean = false;
  @Input() defaultPaginator: boolean = true;
  @Input() searchPlaceHolder: string = 'Rechercher...';

  // Textes personnalisés pour le groupe
  @Input() groupLabelPrefix: string = '';
  @Input() groupLabelSuffix: string = '';
  @Input() descriptionTemplate: string = '';
  @Input() countLabelTemplate: string = '{count}';

  @Output() onView: EventEmitter<any> = new EventEmitter<any>();
  @Output() onEdit: EventEmitter<any> = new EventEmitter<any>();
  @Output() onDelete: EventEmitter<any> = new EventEmitter<any>();
  @Output() onGroupToggle: EventEmitter<AccordionGroupItem> =
    new EventEmitter<AccordionGroupItem>();
  @Output() onSearch: EventEmitter<string> = new EventEmitter<string>();

  @Input() additionalActionsTemplate!: TemplateRef<any>;
  @Input() headerActionsTemplate!: TemplateRef<any>;

  @Input() filters: { [key: string]: any } | null = null;

  groupedData: AccordionGroupItem[] = [];

  // Récupérer tous les templates nommés du composant parent
  @ContentChildren(TemplateRef) allTemplateRefs!: QueryList<TemplateRef<any>>;

  // Map pour stocker les templates par nom
  cellTemplates: Map<string, TemplateRef<any>> = new Map();

  // Format de date par défaut en français
  @Input() defaultDateFormat: string = 'dd/MM/yyyy';

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

  ngOnInit() {
    this.processData();
  }

  ngOnChanges() {
    this.processData();
  }

  ngAfterContentInit(): void {
    // Récupérer tous les templates avec leurs références
    this.allTemplateRefs.forEach((template: any) => {
      const templateRefs = template._def.references;

      // Parcourir toutes les références de template et les ajouter à la map
      if (templateRefs) {
        Object.keys(templateRefs).forEach((refName) => {
          if (refName !== 'customFilter') {
            this.cellTemplates.set(refName, template);
          }
        });
      }
    });
  }

  processData() {
    if (!this.rawData || !this.groupBy) return;

    console.log('Données brutes reçues:', this.rawData);

    // Grouper les données par le champ spécifié
    const groupedMap = new Map<string, any[]>();

    this.rawData.forEach((item) => {
      // Utiliser la valeur du champ groupBy pour grouper les éléments
      // Nous devons naviguer dans l'objet pour récupérer les propriétés imbriquées
      const groupValue = this.getNestedProperty(item, this.groupBy);

      if (!groupedMap.has(groupValue)) {
        groupedMap.set(groupValue, []);
      }

      // Si on a des filles, ce sont les éléments à utiliser
      if (item.filles && Array.isArray(item.filles)) {
        groupedMap.get(groupValue)?.push(...item.filles);
      } else {
        groupedMap.get(groupValue)?.push(item);
      }
    });

    console.log('Map des données groupées:', Array.from(groupedMap.entries()));

    // Convertir la Map en tableau d'objets AccordionGroupItem
    this.groupedData = Array.from(groupedMap.entries()).map(([key, items]) => {
      const firstItem = this.rawData.find(
        (item) => this.getNestedProperty(item, this.groupBy) === key,
      );

      const groupLabel =
        this.groupLabelField && firstItem
          ? this.getNestedProperty(firstItem, this.groupLabelField)
          : key;

      const count =
        this.countField && firstItem
          ? this.getNestedProperty(firstItem, this.countField) || items.length
          : items.length;

      return {
        groupKey: key,
        groupValue: groupLabel,
        items: items,
        expanded: false,
        count: count,
      };
    });

    console.log('Données groupées résultantes:', this.groupedData);
  }

  toggleGroup(group: AccordionGroupItem) {
    group.expanded = !group.expanded;
    this.onGroupToggle.emit(group);
  }

  getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return null;

    return path
      .split('.')
      .reduce((prev, curr) => (prev ? prev[curr] : null), obj);
  }

  getTemplate(templateName: string): TemplateRef<any> | null {
    return this.cellTemplates.get(templateName) || null;
  }

  formatCellValue(rowData: any, column: AccordionColumn): string | null {
    // Si une fonction de formatage est fournie, l'utiliser
    if (column.formatter) {
      return column.formatter(rowData);
    }

    // Sinon récupérer la valeur
    const value = this.getNestedProperty(rowData, column.field);

    // Si la valeur est null ou undefined, on retourne directement null
    if (value === null || value === undefined) {
      return null;
    }

    return value;
  }

  // Méthode pour formater le compteur en fonction du modèle
  formatCount(count: number): string {
    return this.countLabelTemplate.replace('{count}', count.toString());
  }

  // Méthode pour traiter le descriptionTemplate avec des variables
  formatDescriptionTemplate(group: AccordionGroupItem): string {
    if (!this.descriptionTemplate) return '';

    let template = this.descriptionTemplate;

    // Remplacer les variables disponibles
    template = template.replace('{groupValue}', group.groupValue || group.groupKey);
    template = template.replace('{groupKey}', group.groupKey);
    template = template.replace('{count}', (group.count || group.items.length).toString());
    template = template.replace('{itemsCount}', group.items.length.toString());

    return template;
  }

  // Méthode pour vérifier si une valeur est booléenne
  isBooleanValue(_rowData: any, column: AccordionColumn): boolean {
    return column.filterType === 'boolean';
  }

  // Méthode pour vérifier si une valeur est une date
  isDateValue(_rowData: any, column: AccordionColumn): boolean {
    return column.filterType === 'date';
  }

  // Méthode pour obtenir la classe CSS pour une valeur booléenne
  getBooleanClass(rowData: any, column: AccordionColumn): string {
    const value = this.getNestedProperty(rowData, column.field);
    const config = column.booleanConfig || this.defaultBooleanConfig;

    return value
      ? config.trueClass || this.defaultBooleanConfig.trueClass
      : config.falseClass || this.defaultBooleanConfig.falseClass;
  }

  // Méthode pour obtenir le texte pour une valeur booléenne
  getBooleanText(rowData: any, column: AccordionColumn): string {
    const value = this.getNestedProperty(rowData, column.field);
    const config = column.booleanConfig || this.defaultBooleanConfig;

    return value
      ? config.trueText || this.defaultBooleanConfig.trueText
      : config.falseText || this.defaultBooleanConfig.falseText;
  }

  // Méthode pour obtenir le format de date
  getDateFormat(column: AccordionColumn): string {
    return column.dateFormat || this.defaultDateFormat;
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

  /**
   * Détermine la classe CSS à appliquer à une colonne en fonction de sa configuration
   */
  getColumnClass(column: AccordionColumn): string {
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
   * Détermine si une colonne doit être sticky (fixée)
   */
  isStickyColumn(column: AccordionColumn): boolean {
    return column.sticky === true;
  }

  /**
   * Calcule la position right pour chaque colonne sticky
   */
  calculateStickyPosition(index: number): string {
    // Position de base, ajuster selon vos besoins
    const spacing = 8; // en rem
    return `${spacing * index}rem`;
  }

  /**
   * Obtient les colonnes visibles triées par priorité
   */
  getVisibleColumns(): AccordionColumn[] {
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
  shouldHideOnMobile(column: AccordionColumn): boolean {
    return column.hideOnMobile || false;
  }

  onFilterInput(event: Event) {
    this.onSearch.emit((event.target as HTMLInputElement).value);
  }

  /**
   * Méthode pour actualiser les données (appelée depuis le template)
   */
  refreshData() {
    // Émettre un événement pour permettre au parent de recharger les données
    this.onSearch.emit(''); // Émettre une recherche vide pour déclencher un rafraîchissement
  }
}
