import { Component, OnInit, inject } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';

export interface Personne {
  id: number;
  code: string;
  npi: string;
  nomprenoms: string;
  age: number;
  date_naissance: string;
  statut: string;
  niveau_instruction: string;
  diplome_attestation: string;
  informations: string;
  contact: string;
  sexe: string;
  maison: string;
  isSalarie: boolean | number;
  isHandicap: boolean | number;
  departement_id: number | null;
  commune_id: number | null;
  arrondissement_id: number | null;
  quartier_id: number | null;
  profession_id: number | null;
  is_accompanied: boolean | number;
  nomprenoms_ac: string | null;
  contact_ac: string | null;
  lien: string | null;
  departement?: { id: number; libelle: string };
  commune?: { id: number; libelle: string };
  arrondissement?: { id: number; libelle: string };
  installation_accordee?: boolean;
  created_at?: string;
}

@Component({
  selector: 'app-demandeurs',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './demandeurs.component.html',
  styleUrl: './demandeurs.component.scss',
})
export class DemandeursComponent extends AbstractCrudComponent<Personne> implements OnInit {
  override resourceName: string = 'personnes';
  override modalId: string = 'personneModal';
  override deleteId: string = 'delete_personne';
  viewDetailsId: string = 'view_personne';

  protected apiHttp = inject(HttpClient);

  // Listes pour les filtres
  departementsList: any[] = [];
  communesFilterList: any[] = [];
  arrondissementsFilterList: any[] = [];
  sessionsList: any[] = [];
  years: number[] = [];

  // Listes pour le formulaire (cascade indépendante des filtres)
  communesFormList: any[] = [];
  arrondissementsFormList: any[] = [];
  quartiersFormList: any[] = [];
  professionsList: any[] = [];

  exporting: boolean = false;
  viewTarget: Personne | null = null;
openDropdownId: number | null = null;
dropdownItem: Personne | null = null;
dropdownPosition: { top: number; left: number } = { top: 0, left: 0 };
  searchFilters = {
    search: '',
    departement_id: '',
    commune_id: '',
    arrondissement_id: '',
    annee: '',
    session_id: '',
    appuye: '',
  };

  columns: Column[] = [
    { field: 'nomprenoms', header: 'Nom et Prénoms', filterType: 'text' },
    { field: 'departement.libelle', header: 'Département', filterType: 'text' },
    { field: 'age', header: 'Age', filterType: 'text' },
    { field: 'sexe', header: 'Sexe', filterType: 'text' },
    { field: 'npi', header: 'NPI', filterType: 'text' },
    {
      field: 'created_at',
      header: 'Date enreg.',
      filterType: 'text',
      formatter: (row: any) => this.formatDate(row.created_at),
    },
    {
      field: 'installation_accordee',
      header: 'Installation accordée',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) =>
        row.installation_accordee
          ? '<span class="badge-pill badge-pill-green">Oui</span>'
          : '',
    },
  ];

  globalFilterFields = ['nomprenoms', 'npi'];

  override ngOnInit(): void {
    super.ngOnInit();
    this.buildYearsRange();
    this.loadFilterLists();
  }

  private formatDate(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  // De 2015 à l'année la plus récente présente dans les enregistrements
  // (par défaut l'année en cours, tant qu'aucun enregistrement futur n'existe).
  private buildYearsRange(): void {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 2015; y--) {
      list.push(y);
    }
    this.years = list;
  }

 loadFilterLists(): void {
    // 1. Charger tous les départements
    this.resourceService
      .loadResource<any>('departements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.departementsList = res?.response?.data ?? []));

    // 2. Charger toutes les communes par défaut au démarrage
    this.resourceService
      .loadResource<any>('communes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.communesFilterList = res?.response?.data ?? []));

    // 3. Charger tous les arrondissements par défaut au démarrage
    this.resourceService
      .loadResource<any>('arrondissements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.arrondissementsFilterList = res?.response?.data ?? []));

    // 4. Charger toutes les sessions
    this.resourceService
      .loadResource<any>('diss_sessions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.sessionsList = res?.response?.data ?? []));
  }

  // --- Cascade des filtres ---
  onFilterDepartementChange(): void {
    this.searchFilters.commune_id = '';
    this.searchFilters.arrondissement_id = '';

    const params: any = { all: '1' };
    if (this.searchFilters.departement_id) {
      params.departement_id = this.searchFilters.departement_id;
    }

    // Charger les communes (filtrées par département si sélectionné, sinon toutes)
    this.resourceService
      .loadResource<any>('communes', { paginate: true, params })
      .subscribe((res: any) => (this.communesFilterList = res?.response?.data ?? []));

    // Mettre à jour les arrondissements
    this.loadFilterArrondissements();
  }

  onFilterCommuneChange(): void {
    this.searchFilters.arrondissement_id = '';
    this.loadFilterArrondissements();
  }

  private loadFilterArrondissements(): void {
    const params: any = { all: '1' };
    if (this.searchFilters.commune_id) {
      params.commune_id = this.searchFilters.commune_id;
    }

    this.resourceService
      .loadResource<any>('arrondissements', { paginate: true, params })
      .subscribe((res: any) => (this.arrondissementsFilterList = res?.response?.data ?? []));
  }
  applyFilters(): void {
    this.filter['search'] = this.searchFilters.search;
    this.filter['departement_id'] = this.searchFilters.departement_id;
    this.filter['commune_id'] = this.searchFilters.commune_id;
    this.filter['arrondissement_id'] = this.searchFilters.arrondissement_id;
    this.filter['annee'] = this.searchFilters.annee;
    this.filter['session_id'] = this.searchFilters.session_id;
    this.filter['appuye'] = this.searchFilters.appuye;
    this.data = [];
    this.loadData();
  }

 resetFilters(): void {
    this.searchFilters = {
      search: '',
      departement_id: '',
      commune_id: '',
      arrondissement_id: '',
      annee: '',
      session_id: '',
      appuye: '',
    };

    // Recharger toutes les communes et arrondissements d'origine au lieu de les vider
    this.resourceService
      .loadResource<any>('communes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.communesFilterList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('arrondissements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.arrondissementsFilterList = res?.response?.data ?? []));

    this.filter['search'] = '';
    this.filter['departement_id'] = '';
    this.filter['commune_id'] = '';
    this.filter['arrondissement_id'] = '';
    this.filter['annee'] = '';
    this.filter['session_id'] = '';
    this.filter['appuye'] = '';
    this.data = [];
    this.loadData();
  }
  // --- Cascade du formulaire d'ajout/modification ---
 // --- Cascade du formulaire d'ajout/modification ---
  onFormDepartementChange(): void {
    // Si on change le département, on réinitialise les niveaux inférieurs
    this.currentItem.commune_id = null;
    this.currentItem.arrondissement_id = null;
    this.currentItem.quartier_id = null;
    this.communesFormList = [];
    this.arrondissementsFormList = [];
    this.quartiersFormList = [];

    if (!this.currentItem.departement_id) return;

    this.resourceService
      .loadResource<any>('communes', {
        paginate: true,
        params: { all: '1', departement_id: this.currentItem.departement_id } as any,
      })
      .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));
  }

  onFormCommuneChange(): void {
    // Si on change la commune, on réinitialise les niveaux inférieurs
    this.currentItem.arrondissement_id = null;
    this.currentItem.quartier_id = null;
    this.arrondissementsFormList = [];
    this.quartiersFormList = [];

    if (!this.currentItem.commune_id) return;

    this.resourceService
      .loadResource<any>('arrondissements', {
        paginate: true,
        params: { all: '1', commune_id: this.currentItem.commune_id } as any,
      })
      .subscribe((res: any) => (this.arrondissementsFormList = res?.response?.data ?? []));
  }

  onFormArrondissementChange(): void {
    // Si on change l'arrondissement, on réinitialise le quartier
    this.currentItem.quartier_id = null;
    this.quartiersFormList = [];

    if (!this.currentItem.arrondissement_id) return;

    this.resourceService
      .loadResource<any>('quartiers', {
        paginate: true,
        params: { all: '1', arrondissement_id: this.currentItem.arrondissement_id } as any,
      })
      .subscribe((res: any) => (this.quartiersFormList = res?.response?.data ?? []));
  }

  override showAddForm(): void {
    super.showAddForm();
    this.communesFormList = [];
    this.arrondissementsFormList = [];
    this.quartiersFormList = [];
    this.currentItem = {
      id: 0,
      code: '',
      npi: '',
      nomprenoms: '',
      age: 0,
      date_naissance: '',
      statut: '',
      niveau_instruction: '',
      diplome_attestation: '',
      informations: '',
      contact: '',
      sexe: '',
      maison: '',
      isSalarie: 0,
      isHandicap: 0,
      departement_id: null,
      commune_id: null,
      arrondissement_id: null,
      quartier_id: null,
      profession_id: null,
      is_accompanied: 0,
      nomprenoms_ac: '',
      contact_ac: '',
      lien: '',
    };
    this.loadProfessions();
  }

  override editItem(item: Personne): void {
    super.editItem(item);
    this.loadProfessions();

    // 1. Charger les communes du département existant
    if (item.departement_id) {
      this.resourceService
        .loadResource<any>('communes', {
          paginate: true,
          params: { all: '1', departement_id: item.departement_id } as any,
        })
        .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));
    } else {
      this.communesFormList = [];
    }

    // 2. Charger les arrondissements de la commune existante
    if (item.commune_id) {
      this.resourceService
        .loadResource<any>('arrondissements', {
          paginate: true,
          params: { all: '1', commune_id: item.commune_id } as any,
        })
        .subscribe((res: any) => (this.arrondissementsFormList = res?.response?.data ?? []));
    } else {
      this.arrondissementsFormList = [];
    }

    // 3. Charger les quartiers de l'arrondissement existant
    if (item.arrondissement_id) {
      this.resourceService
        .loadResource<any>('quartiers', {
          paginate: true,
          params: { all: '1', arrondissement_id: item.arrondissement_id } as any,
        })
        .subscribe((res: any) => (this.quartiersFormList = res?.response?.data ?? []));
    } else {
      this.quartiersFormList = [];
    }
  }
  private loadProfessions(): void {
    this.resourceService
      .loadResource<any>('professions', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.professionsList = res?.response?.data ?? []));
  }
// Charger toutes les localisations par défaut pour le formulaire
  private loadAllFormLocations(): void {
    this.resourceService
      .loadResource<any>('communes', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.communesFormList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('arrondissements', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.arrondissementsFormList = res?.response?.data ?? []));

    this.resourceService
      .loadResource<any>('quartiers', { paginate: true, params: { all: '1' } as any })
      .subscribe((res: any) => (this.quartiersFormList = res?.response?.data ?? []));
  }
  // --- Voir détails ---
  showDetails(item: Personne): void {
    this.viewTarget = item;
  }

  // --- Menu "Faire une demande" ---
 toggleDropdown(item: Personne, event: MouseEvent): void {
    if (this.openDropdownId === item.id) {
      this.openDropdownId = null;
      this.dropdownItem = null;
      return;
    }
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeightEstimate = 220;

    this.dropdownPosition = {
      // Ouvre vers le HAUT : le bas du menu colle au-dessus du bouton
      top: rect.top + window.scrollY - menuHeightEstimate - 4,
      // Aligné à DROITE du bouton
      left: Math.min(rect.right + window.scrollX - menuWidth, window.innerWidth - menuWidth - 8),
    };
    this.openDropdownId = item.id;
    this.dropdownItem = item;
}

  closeDropdown(): void {
    this.openDropdownId = null;
    this.dropdownItem = null;
  }

  goToDemande(type: 'installation' | 'credit' | 'carte' | 'aide', item: Personne): void {
    this.closeDropdown();
    const routes: Record<string, string> = {
      installation: 'staff/demandes-installation',
      credit: 'staff/demandes-credit',
      carte: 'staff/cartes-egalite',
      aide: 'staff/aides-techniques',
    };
    this.router.navigate([routes[type]], { queryParams: { personne_id: item.id } });
  }

  ajouterSessionActive(item: Personne): void {
    this.closeDropdown();
    const url = `${environment.URL_API}/personnes/${item.id}/add-to-session`;
    this.apiHttp.patch<any>(url, {}).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ajouté',
          detail: `"${item.nomprenoms}" a été ajouté à la session active.`,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: "Impossible d'ajouter cette personne à la session active.",
        });
      },
    });
  }

  // --- Export Excel ---
  exportExcel(): void {
    if (this.exporting) return;
    this.exporting = true;

    const params = new URLSearchParams();
    Object.entries(this.filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });

    const url = `${environment.URL_API}/personnes/export?${params.toString()}`;

    this.apiHttp.get(url, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const link = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `demandeurs_${new Date().getTime()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(objectUrl);
      },
      error: (error: any) => {
        this.exporting = false;

        // Quand responseType est 'blob', une réponse d'erreur JSON de Laravel
        // arrive elle aussi comme un Blob (pas du JSON déjà parsé) : il faut
        // la relire manuellement en texte pour voir le vrai message.
        const errorBlob: Blob | undefined = error?.error instanceof Blob ? error.error : undefined;

        if (errorBlob) {
          const reader = new FileReader();
          reader.onload = () => {
            let detail = `Erreur ${error.status} lors de l'export.`;
            try {
              const parsed = JSON.parse(reader.result as string);
              detail = parsed.message || detail;
            } catch {
              // La réponse n'était pas du JSON, on garde le message générique.
            }
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur export',
              detail,
              life: 8000,
            });
          };
          reader.readAsText(errorBlob);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: `Erreur ${error?.status ?? ''} : impossible d'exporter la liste des demandeurs.`,
          });
        }
      },
    });
  }  }