// data-entry-accordion.types.ts

// Interface pour les colonnes dynamiques
export interface DataEntryColumn {
  field: string;        // Le champ à afficher (chemin d'accès à la propriété)
  header: string;       // Le titre de la colonne
  filterType?: string;  // Type de filtre (text, date, select, etc.)
  formatter?: (rowData: DataEntry, original?: any) => string; // Formatteur personnalisé pour afficher la valeur
  sortable?: boolean;   // Si la colonne est triable
  width?: string;       // Largeur de la colonne (ex: '100px', '10%')
  textAlign?: 'left' | 'center' | 'right'; // Alignement du texte
}

export interface DataValue {
  id: number;
  value: string;
  disaggregator_combination: any; // peut être string ou objet
  comments: string | null;
  entered_at: string;
  version: number;
}

export interface EntryState {
  id: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'TRANSMITTED' | 'VALIDATED' | 'REJECTED';
  rejection_reason: string | null;
  last_modified_at: string;
  last_modified_by: { id: number; name: string } | null;
}

export interface DataEntry {
  data_entry: {
    id: number;
    name: string;
    code: string;
    description: string;
    unit: string;
    data_type: string | null;
  };
  thematic_id: number;
  entry_state: EntryState;
  values: DataValue[];
  values_count: number;
  completion_status: string;
  completion_value: number;
  partner?: { id: number; name: string; code: string } | null;
}

export interface ThematicData {
  id: number;
  thematic: {
    id: number;
    name: string;
    code: string;
    color: string;
  };
  data_state_id: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'TRANSMITTED' | 'VALIDATED' | 'REJECTED';
  current_level: {
    id: number;
    name: string;
    code: string;
  };
  data_entries: DataEntry[];
  status_counts: {
    NOT_STARTED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    TRANSMITTED: number;
    VALIDATED: number;
    REJECTED: number;
  };
  completion_percentage: number;
  last_modified: string;
}

export interface DataEntriesResponse {
  success: boolean;
  message: string;
  data: {
    data: ThematicData[];
    summary: {
      total_thematics: number;
      total_entries: number;
      by_status: {
        not_started: number;
        in_progress: number;
        completed: number;
        transmitted: number;
        validated: number;
        rejected: number;
      };
      completion_rate: number;
    };
    period: {
      id: number;
      name: string;
    };
    filters_applied: {
      status: string | null;
      thematic_id: number | null;
    };
  };
  meta: {
    timestamp: string;
    version: string;
    environment: string;
  };
}

// Configuration pour le composant d'accordéon
export interface DataEntryAccordionConfig {
  title: string;
  subtitle?: string;
  // Options d'affichage
  showStatusFilters: boolean;
  showThematicFilter: boolean;
  showPeriodFilter: boolean;
  // Options des boutons
  showSaisirButton?: boolean;
  showTransmetButton?: boolean;
  showBatchValidationButton: boolean;
  showBatchRejectionButton: boolean;
  showVoirDonneesButton?: boolean;
  // Textes et couleurs personnalisés pour les boutons
  saisirButtonText?: string;          // Texte du bouton Saisir (défaut: "Saisir les données")
  saisirButtonColorClass?: string;    // Classe CSS de couleur pour le bouton Saisir (défaut: "bg-blue-500 hover:bg-blue-600")
  saisirButtonIcon?: string;          // Icône du bouton Saisir (défaut: "pi pi-pencil")
  transmetButtonText?: string;        // Texte du bouton Transmettre (défaut: "Transmettre tout")
  transmetButtonColorClass?: string;  // Classe CSS de couleur pour le bouton Transmettre (défaut: "bg-amber-500 hover:bg-amber-600")
  // Colonnes à afficher (deux options possibles)
  displayColumns?: string[]; // Liste des noms de colonnes prédéfinies à afficher (méthode simple)
  columns?: DataEntryColumn[]; // Définition personnalisée des colonnes (méthode avancée)
  // Actions personnalisées
  enableRowClick: boolean;
  // Mode d'utilisation (partenaire, validateur N1, N2, etc.)
  mode: 'PARTNER' | 'LEVEL_1' | 'LEVEL_2' | 'NATIONAL';
}
