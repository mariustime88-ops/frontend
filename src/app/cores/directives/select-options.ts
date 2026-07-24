// options-source.directive.ts
import { Directive, Input, OnInit, Host, Optional, Self } from '@angular/core';
import { Dropdown } from 'primeng/dropdown';
import { MultiSelect } from 'primeng/multiselect';
import { OptionsProviderService } from '../providers/options-provider';

@Directive({
  selector: '[source]'
})
export class OptionsSourceDirective implements OnInit {
  @Input('source') optionsSourceName: string = '';
  @Input() optionLabel: string = 'label';
  @Input() optionValue: string = 'id';
  @Input() sourceType: 'static' | 'api' = 'static';
  @Input() apiRoute?: string;
  @Input() labelFormat?: string; // Nouveau paramètre pour le format du label

  constructor(
    private optionsProvider: OptionsProviderService,
    @Optional() @Host() @Self() private dropdown: Dropdown,
    @Optional() @Host() @Self() private multiSelect: MultiSelect
  ) {}

  ngOnInit() {
    if (!this.optionsSourceName) {
      console.warn('source: No source name provided');
      return;
    }

    // Récupération des options (statiques ou via API)
    this.optionsProvider.getOptions(this.optionsSourceName, this.sourceType, this.apiRoute).subscribe(options => {
      if (!options || !options.length) {
        return;
      }

      // Si un format de label est fourni, transformer les options
      let processedOptions = options;

      if (this.labelFormat) {
        // Créer une copie des options avec des labels formatés
        processedOptions = options.map(option => {
          // Formatage du label selon le modèle fourni
          const formattedLabel = this.formatLabel(option, this.labelFormat!);

          return {
            ...option,
            _formattedLabel: formattedLabel
          };
        });

        // Utiliser le label formaté
        this.optionLabel = '_formattedLabel';
      }

      // Appliquer les options au composant dropdown ou multiselect
      if (this.dropdown) {
        this.dropdown.options = processedOptions;
        this.dropdown.optionLabel = this.optionLabel;
        this.dropdown.optionValue = this.optionValue;
      } else if (this.multiSelect) {
        this.multiSelect.options = processedOptions;
        this.multiSelect.optionLabel = this.optionLabel;
        this.multiSelect.optionValue = this.optionValue;
      }
    });
  }

  /**
   * Formate un label en remplaçant les placeholders {propertyName} par les valeurs correspondantes
   */
  private formatLabel(item: any, format: string): string {
    return format.replace(/\{([^}]+)\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = item;
      for (const keyPart of keys) {
        value = value[keyPart] ?? '';
      }
      return value;
    });
  }
}
