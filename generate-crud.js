#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { program } = require("commander");
const prettier = require("prettier");

program
  .name("generate-crud")
  .description("Générateur de composants CRUD Angular")
  .version("1.0.0")
  .requiredOption(
    "-c, --config <path>",
    "Chemin vers le fichier de configuration YAML",
  )
  .option(
    "-o, --output <directory>",
    "Répertoire de sortie",
    "./src/app/components",
  )
  .parse(process.argv);

const options = program.opts();

// Lecture et validation du fichier de configuration
try {
  const configFile = fs.readFileSync(options.config, "utf8");
  const config = yaml.load(configFile);

  // Validation de la configuration
  validateConfig(config);

  // Génération des composants
  generateCrudComponent(config, options.output);

  console.log(`✅ Composant CRUD "${config.name}" généré avec succès!`);
} catch (error) {
  console.error(
    "❌ Erreur lors de la génération du composant CRUD:",
    error.message,
  );
  process.exit(1);
}

/**
 * Valide la structure du fichier de configuration
 * @param {Object} config Configuration CRUD
 */
function validateConfig(config) {
  // Vérification des champs obligatoires
  const requiredFields = ["name", "resourceName", "model"];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(
        `Le champ "${field}" est requis dans le fichier de configuration`,
      );
    }
  }

  // Vérification du modèle
  if (!Array.isArray(config.model) || config.model.length === 0) {
    throw new Error("Le modèle doit être un tableau non vide");
  }

  // Vérification que le modèle contient au moins un champ ID
  const hasIdField = config.model.some((field) => field.name === "id");
  if (!hasIdField) {
    throw new Error('Le modèle doit contenir un champ "id"');
  }

  // Vérification des colonnes
  if (!Array.isArray(config.columns) || config.columns.length === 0) {
    throw new Error(
      "Le tableau des colonnes est requis et ne peut pas être vide",
    );
  }

  // Construction d'un index des champs du modèle pour une validation plus facile
  const modelFieldsIndex = {};
  config.model.forEach((field) => {
    modelFieldsIndex[field.name] = field;
  });

  // Vérification que tous les champs de colonnes font référence à des champs existants du modèle
  for (const column of config.columns) {
    if (!column.field) {
      throw new Error("Chaque colonne doit avoir un champ 'field'");
    }

    // Gestion des propriétés imbriquées (ex: categorie.name)
    const fieldParts = column.field.split(".");
    const rootField = fieldParts[0];

    if (!modelFieldsIndex[rootField]) {
      throw new Error(
        `La colonne "${column.field}" fait référence à un champ racine "${rootField}" inexistant dans le modèle`,
      );
    }

    // Si c'est une propriété imbriquée, vérifier que l'objet parent a des propriétés définies
    if (fieldParts.length > 1) {
      const parentField = modelFieldsIndex[rootField];
      if (parentField.type !== "object" || !parentField.properties) {
        throw new Error(
          `La colonne "${column.field}" fait référence à une propriété imbriquée, mais "${rootField}" n'est pas défini comme un objet avec des propriétés`,
        );
      }

      // Vérifier que la propriété imbriquée existe
      const nestedProperty = fieldParts[1];
      if (!parentField.properties[nestedProperty]) {
        throw new Error(
          `La colonne "${column.field}" fait référence à une propriété "${nestedProperty}" qui n'existe pas dans l'objet "${rootField}"`,
        );
      }
    }

    if (!column.header) {
      throw new Error(
        `La colonne "${column.field}" doit avoir un en-tête (header)`,
      );
    }
  }

  // Vérification des champs de formulaire
  if (!Array.isArray(config.formFields) || config.formFields.length === 0) {
    throw new Error(
      "Les champs de formulaire sont requis et ne peuvent pas être vides",
    );
  }

  // Liste plate des noms de champs du modèle pour validation des champs de formulaire
  const modelFieldNames = config.model.map((field) => field.name);

  // Vérification que tous les champs de formulaire font référence à des champs existants du modèle
  for (const field of config.formFields) {
    if (!field.name || !modelFieldNames.includes(field.name)) {
      throw new Error(
        `Le champ de formulaire "${field.name}" fait référence à un champ inexistant dans le modèle`,
      );
    }
    if (!field.type) {
      throw new Error(
        `Le champ de formulaire "${field.name}" doit avoir un type`,
      );
    }
    if (!field.label) {
      throw new Error(
        `Le champ de formulaire "${field.name}" doit avoir un libellé (label)`,
      );
    }
  }

  // Vérification des filtres globaux
  if (config.filters) {
    if (!Array.isArray(config.filters)) {
      throw new Error("Les filtres doivent être un tableau");
    }
    for (const filter of config.filters) {
      // Pour les filtres, autoriser à la fois les champs simples et les propriétés imbriquées
      const fieldParts = filter.split(".");
      const rootField = fieldParts[0];

      if (!modelFieldNames.includes(rootField)) {
        throw new Error(
          `Le filtre "${filter}" fait référence à un champ racine inexistant dans le modèle`,
        );
      }

      if (fieldParts.length > 1) {
        const parentField = modelFieldsIndex[rootField];
        if (parentField.type !== "object" || !parentField.properties) {
          throw new Error(
            `Le filtre "${filter}" fait référence à une propriété imbriquée, mais "${rootField}" n'est pas défini comme un objet avec des propriétés`,
          );
        }

        const nestedProperty = fieldParts[1];
        if (!parentField.properties[nestedProperty]) {
          throw new Error(
            `Le filtre "${filter}" fait référence à une propriété "${nestedProperty}" qui n'existe pas dans l'objet "${rootField}"`,
          );
        }
      }
    }
  }
}

/**
 * Génère les fichiers du composant CRUD
 * @param {Object} config Configuration CRUD
 * @param {string} outputDir Répertoire de sortie
 */
function generateCrudComponent(config, outputDir) {
  // Création du répertoire du composant
  const componentName = kebabCase(config.name);

  // Traitement du chemin de sortie
  let componentDir;

  if (outputDir.endsWith(componentName)) {
    // Si le chemin inclut déjà le nom du composant
    componentDir = outputDir;
  } else {
    // Sinon, ajouter le nom du composant au chemin
    componentDir = path.join(outputDir, componentName);
  }

  // Vérifier si le répertoire existe déjà et arrêter le script si c'est le cas
  if (fs.existsSync(componentDir)) {
    console.error(
      `❌ Le composant "${componentName}" existe déjà dans le répertoire: ${path.resolve(componentDir)}`,
    );
    console.error(
      "Opération annulée pour éviter d'écraser des fichiers existants.",
    );
    process.exit(1);
  }

  // Créer le répertoire
  fs.mkdirSync(componentDir, { recursive: true });

  // Génération des fichiers
  generateTypeScriptFile(config, componentDir);
  generateHtmlFile(config, componentDir);
  generateScssFile(config, componentDir);

  // Affichage du chemin de génération
  console.log(`Composant généré dans: ${path.resolve(componentDir)}`);
}

/**
 * Génère le fichier TypeScript du composant avec support PrimeNG
 * @param {Object} config Configuration CRUD
 * @param {string} componentDir Répertoire du composant
 */
function generateTypeScriptFile(config, componentDir) {
  const componentName = kebabCase(config.name);
  const pascalName = pascalCase(config.name);
  const filePath = path.join(componentDir, `${componentName}.component.ts`);

  // Construction de l'interface du modèle
  const interfaceProperties = config.model
    .map((field) => {
      // Si c'est un multiselect, on définit le type comme un tableau
      const fieldType =
        field.type === "multiselect" ? `${field.type}[]` : field.type;

      return `  ${field.name}${field.required ? "" : "?"}: ${fieldType};`;
    })
    .join("\n");

  // Construction des colonnes
  const columnsDefinition = config.columns
    .map((column) => {
      const style = column.style
        ? `, style: ${JSON.stringify(column.style)}`
        : "";
      return `    {
      field: '${column.field}',
      header: '${column.header}',
      filterType: '${column.filterType || "text"}'${style}
    }`;
    })
    .join(",\n");

  // Construction des filtres globaux
  const globalFilterFields = config.filters
    ? `globalFilterFields = [${config.filters.map((f) => `'${f}'`).join(", ")}];`
    : `globalFilterFields = ['${config.columns[0].field}'];`;

  // Définition des options pour les champs de type select
  const selectFieldsDefinitions = config.formFields
    .filter(
      (field) =>
        (field.type === "select" || field.type === "multiselect") &&
        field.options,
    )
    .map((field) => {
      const optionsArray = JSON.stringify(field.options);
      return `  ${field.name}Options = ${optionsArray};`;
    })
    .join("\n");

  // Construction du contenu du fichier TypeScript
  const tsContent = `import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';

export interface ${pascalName} {
${interfaceProperties}
}

@Component({
  selector: 'app-${componentName}',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './${componentName}.component.html',
  styleUrl: './${componentName}.component.scss',
})
export class ${pascalName}Component extends AbstractCrudComponent<${pascalName}> implements OnInit {
  override resourceName: string = '${config.resourceName}';
  override modalId: string = '${camelCase(config.name)}Modal';
  override deleteId: string = 'delete_${camelCase(config.name)}';

  columns: Column[] = [
${columnsDefinition}
  ];

  ${globalFilterFields}
${selectFieldsDefinitions ? "\n" + selectFieldsDefinitions : ""}

}`;

  writeFormattedFile(filePath, tsContent, "typescript");
}

/**
 * Génère le fichier HTML du composant avec des composants PrimeNG
 * @param {Object} config Configuration CRUD
 * @param {string} componentDir Répertoire du composant
 */
function generateHtmlFile(config, componentDir) {
  const componentName = kebabCase(config.name);
  const filePath = path.join(componentDir, `${componentName}.component.html`);

  // Construction des champs du formulaire avec PrimeNG
  const formFields = config.formFields
    .map((field) => {
      const requiredAttr = field.required ? "required" : "";

      // Textarea avec PrimeNG
      if (field.type === "textarea") {
        return `
        <div class="field">
          <label for="${field.name}" class="font-semibold">${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""}  </label>
          <div class="mt-1">
            <textarea
              pTextarea
              [(ngModel)]="currentItem.${field.name}"
              name="${field.name}"
              placeholder="${field.placeholder || ""}"
              rows="4"
              validate
              ${requiredAttr}
              class="textarea-style"
            ></textarea>
          </div>
        </div>`;
      }
      // Dropdown/Select avec PrimeNG
      else if (field.type === "select" && field.options) {
        return `
        <div class="field">
          <label for="${field.name}" class="font-semibold">${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""} </label>
          <div class="mt-1">
            <p-dropdown
              [(ngModel)]="currentItem.${field.name}"
              name="${field.name}"
              [options]="${field.name}Options"
              optionLabel="label"
              optionValue="id"
              placeholder="${field.placeholder || `Sélectionnez ${field.label.toLowerCase()}`}"
              [filter]="true"
              [showClear]="true"
              appendTo="body"
              validate
              ${requiredAttr}
              styleClass="w-full"
              panelStyleClass="w-full"
            ></p-dropdown>
          </div>
        </div>`;
      }
      // Calendrier / Date avec PrimeNG
      else if (field.type === "date") {
        return `
        <div class="field">
          <label for="${field.name}" class="font-semibold">${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""} </label>
          <div class="mt-1">
            <p-calendar
              [(ngModel)]="currentItem.${field.name}"
              name="${field.name}"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              placeholder="${field.placeholder || "JJ/MM/AAAA"}"
              validate
              ${requiredAttr}
            ></p-calendar>
          </div>
        </div>`;
      }
      // Champ numérique avec PrimeNG
      else if (field.type === "number") {
        return `
        <div class="field">
          <label for="${field.name}" class="font-semibold">${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""} </label>
          <div class="mt-1">
            <p-inputNumber
              [(ngModel)]="currentItem.${field.name}"
              name="${field.name}"
              placeholder="${field.placeholder || ""}"
              validate
              ${requiredAttr}
              styleClass="w-full"
              class="input-style-border-0"
            ></p-inputNumber>
          </div>
        </div>`;
      } else if (field.type == "file") {
        return `
        <div class="field">
          <label for="${field.name}" class="font-semibold">${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""} </label>
          <div class="mt-1">
            <p-fileupload
              [(ngModel)]="currentItem.${field.name}"
              name="${field.name}"
              url="https://www.primefaces.org/cdn/api/upload.php"
              (onSelect)="onUpload($event)"
              (onClear)="onClear()"
              (onRemove)="onClear()"
              accept=".pdf,.jpeg,.jpg,.png"
              maxFileSize="1000000"
              ${requiredAttr}
              mode="advanced"
            >
              <ng-template #empty>
                <div>Glissez déposez un fichier ici</div>
              </ng-template>
            </p-fileupload>
          </div>
        </div>`;
      }

      // Toggle switch avec PrimeNG
      else if (
        field.type === "toggle" ||
        field.type === "switch" ||
        field.type === "boolean" ||
        field.type === "checkbox"
      ) {
        return `
        <div class="field flex items-center gap-2">
          <label for="${field.name}" class="font-semibold cursor-pointer" (click)="currentItem.${field.name} = !currentItem.${field.name}">
            ${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""}
          </label>
          <p-toggleswitch
            [(ngModel)]="currentItem.${field.name}"
            name="${field.name}"
            validate
            ${requiredAttr}
          >
            <ng-template #handle let-checked="checked">
              <i
                [ngClass]="[
                  '!text-xs',
                  'pi',
                  checked ? 'pi-check' : 'pi-times',
                ]"
              ></i>
            </ng-template>
          </p-toggleswitch>
        </div>`;
      } else if (field.type === "multiselect" && field.options) {
        return `
        <div class="field">
          <label for="${field.name}" class="font-semibold">${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""} </label>
          <div class="mt-1">
            <p-multiselect
              [(ngModel)]="currentItem.${field.name}"
              name="${field.name}"
              [options]="${field.name}Options"
              optionLabel="label"
              optionValue="id"
              placeholder="${field.placeholder || `Sélectionnez ${field.label.toLowerCase()}`}"
              [filter]="true"
              filterBy="label"
              [showClear]="true"
              appendTo="body"
              validate
              ${requiredAttr}
              styleClass="w-full"
              display="chip"
              class="input-style"

            >
              <ng-template let-item #item>
                <div class="flex items-center gap-2">
                  <div>{{ item.label }}</div>
                </div>
              </ng-template>
              <ng-template #header>
                <div class="font-medium px-3 py-2">Sélection disponible</div>
              </ng-template>
            </p-multiselect>
          </div>
        </div>`;
      }

      // Champ texte standard avec PrimeNG
      else {
        return `
        <div class="field">
          <label for="${field.name}" class="font-semibold">${field.label} ${field.required ? "<span class='text-red-700'>*</span>" : ""} </label>
          <div class="mt-1">
            <input
              pInputText
              type="text"
              [(ngModel)]="currentItem.${field.name}"
              name="${field.name}"
              placeholder="${field.placeholder || ""}"
              validate
              ${requiredAttr}
              class="input-style"
            />
          </div>
        </div>`;
      }
    })
    .join("");

  // Construction du contenu HTML avec PrimeNG
  const htmlContent = `<div>
  <div class="flex justify-end mb-3">
    <button
      class="btn bg-[var(--tw-main-blue)] text-white hover:bg-transparent hover:text-[var(--tw-main-blue)] outline outline-1 hover:outline-[#023E7A] justify-center text-sm transition-all duration-300"
      attr.data-modal-toggle="#{{ modalId }}"
      (click)="showAddForm()"
    >
      <i class="fas fa-plus-circle"></i>
      Ajouter
    </button>
  </div>
  <div class="card">
    <app-data-table
      title="Liste des ${config.name.toLowerCase()}"
      [data]="data"
      [columns]="columns"
      [loading]="loading"
      [globalFilterFields]="globalFilterFields"
      [rows]="5"
      [rowsPerPageOptions]="[5, 10, 25, 50]"
      [showActions]="true"
      (onEdit)="editItem($event)"
      (onDelete)="onDelete($event)"
      [defaultPaginator]="false"
      (onSearch)="search($event)"
      [modalId]="modalId"
      [deleteId]="deleteId"
      [loading]="processing"
      [hideView]="true"
    >
    </app-data-table>
    <div class="flex justify-center my-4">
      <app-custom-pagination
        [page]="filter.page"
        [totalItems]="filter.total"
        [limit]="filter.per_page"
        (pageChange)="changePage($event)"
      ></app-custom-pagination>
    </div>
  </div>
</div>

<div class="modal self-center" data-modal="true" [id]="modalId">
  <app-modal
    [title]="editMode ? 'Modifier un ${config.name.toLowerCase()}' : 'Ajouter un ${config.name.toLowerCase()}'"
  >
    <form #f="ngForm" validateForm [onValidSubmit]="onSubmit.bind(this)">
      <div class="modal-body p-5 overflow-auto max-h-[65vh]">
        <div class="space-y-4 gap-4">${formFields}
        </div>
      </div>
      <div class="modal-footer p-5 border-t border-gray-200">
        <div class="flex justify-end gap-4">
          <p-progressSpinner *ngIf="loading" [style]="{width: '40px', height: '40px'}"></p-progressSpinner>
          <p-button
            icon="fas fa-floppy-disk"
            label="Enregistrer"
            styleClass="p-button-success"
            [disabled]="loading"
            type="submit"
          ></p-button>
        </div>
      </div>
    </form>
  </app-modal>
</div>

<div class="modal self-center" data-modal="true" [id]="deleteId">
  <app-modal title="Supprimer un ${config.name.toLowerCase()}" [forDelete]="true">
    <div class="modal-body p-5 overflow-auto max-h-[65vh]">
      <p>
        Vous êtes sur le point de supprimer ${getArticle(config.name.toLowerCase())} ${config.name.toLowerCase()}
        <strong>{{ currentItem.${getDisplayField(config)} }}</strong
        >.
      </p>
      <p>Voulez-vous continuer ?</p>
    </div>
    <div class="modal-footer p-5 border-t border-gray-200">
      <div class="flex justify-end gap-4">
        <img
          *ngIf="loading"
          src="assets/images/loader.gif"
          width="40"
          alt="Chargement"
        />
        <button
          type="button"
          class="btn text-white bg-gray-800 hover:bg-white hover:text-gray-800 outline outline-1 hover:outline-gray-800 transition-all duration-300"
          data-modal-dismiss="true"
        >
          <i class="fas fa-times mr-2"></i>
          Annuler
        </button>
        <button
          type="button"
          class="btn text-white bg-red-800 hover:bg-white hover:text-red-800 outline outline-1 hover:outline-red-800 transition-all duration-300"
          (click)="deleteItem(currentItem)"
        >
          <i class="fas fa-trash mr-2"></i>
          Supprimer
        </button>
      </div>
    </div>
  </app-modal>
</div>

<p-toast></p-toast>`;

  writeFormattedFile(filePath, htmlContent, "html");
}

/**
 * Génère le fichier SCSS du composant
 * @param {Object} config Configuration CRUD
 * @param {string} componentDir Répertoire du composant
 */
function generateScssFile(config, componentDir) {
  const componentName = kebabCase(config.name);
  const filePath = path.join(componentDir, `${componentName}.component.scss`);

  const scssContent = `// Styles spécifiques pour le composant ${componentName}
`;

  writeFormattedFile(filePath, scssContent, "scss");
}

/**
 * Écrit un fichier formaté avec prettier
 * @param {string} filePath Chemin du fichier
 * @param {string} content Contenu du fichier
 * @param {string} parser Parser prettier à utiliser
 */
function writeFormattedFile(filePath, content, parser) {
  try {
    const formattedContent = prettier.format(content, { parser });
    fs.writeFileSync(filePath, formattedContent);
  } catch (error) {
    console.warn(
      `Impossible de formater le fichier ${filePath}, écriture sans formatage.`,
    );
    fs.writeFileSync(filePath, content);
  }
}

/**
 * Détermine le champ à afficher dans les messages
 * @param {Object} config Configuration CRUD
 * @returns {string} Nom du champ à afficher
 */
function getDisplayField(config) {
  // Chercher un champ approprié à afficher dans l'ordre de préférence
  const preferredFields = [
    "nom",
    "libelle",
    "title",
    "name",
    "label",
    "description",
  ];

  for (const field of preferredFields) {
    if (config.model.some((f) => f.name === field)) {
      return field;
    }
  }

  // Si aucun champ préféré n'est trouvé, prendre le premier champ non-id
  const nonIdField = config.model.find((f) => f.name !== "id");
  return nonIdField ? nonIdField.name : "id";
}

/**
 * Détermine l'article à utiliser avant un nom
 * @param {string} word Mot
 * @returns {string} Article approprié (le/la/l')
 */
function getArticle(word) {
  const firstLetter = word.charAt(0).toLowerCase();
  const vowels = [
    "a",
    "e",
    "i",
    "o",
    "u",
    "é",
    "è",
    "ê",
    "à",
    "â",
    "î",
    "ô",
    "û",
    "ù",
    "ÿ",
  ];

  if (vowels.includes(firstLetter)) {
    return "l'";
  }

  // Règle simple pour le genre (à améliorer)
  const femininEndings = [
    "e",
    "ion",
    "té",
    "ure",
    "ance",
    "ence",
    "esse",
    "ie",
    "erie",
  ];
  const isFeminin = femininEndings.some((ending) => word.endsWith(ending));

  return isFeminin ? "la" : "le";
}

/**
 * Convertit une chaîne en kebab-case
 * @param {string} str Chaîne à convertir
 * @returns {string} Chaîne en kebab-case
 */
function kebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Convertit une chaîne en PascalCase
 * @param {string} str Chaîne à convertir
 * @returns {string} Chaîne en PascalCase
 */
function pascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (s) => s.toUpperCase());
}

/**
 * Convertit une chaîne en camelCase
 * @param {string} str Chaîne à convertir
 * @returns {string} Chaîne en camelCase
 */
function camelCase(str) {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
