export interface Indicateur {
  id: number;
  code: string;
  nom: string;
  description: string;
  type: 'pourcentage' | 'nombre' | 'boolean' | 'liste_multiple';
  unite_mesure?: string;
  formule_calcul: FormulaConfig;
  donnees_saisie_config: DonneesSaisieConfig[];
  thematique_id?: number;
  groupe_indicateur_id?: number;
  statut: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormulaConfig {
  type: 'direct' | 'formule' | 'aggregation' | 'conditionnel';
  expression: string;
  variables: { [key: string]: VariableConfig };
}

export interface DonneesSaisieConfig {
  id: string;
  source_type: 'donnee_saisie' | 'critere_saisie' | 'indicateur' | 'manuel';
  source_id: number;
  filtres: { [key: string]: any };
  poids: number;
  nom: string;
  valeur_actuelle?: number;
}

export interface VariableConfig {
  source: string;
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  filtres: { [key: string]: any };
}

export interface IndicateurValeur {
  id: number;
  indicateur_id: number;
  periode_saisie_id: number;
  valeur: number;
  valeur_details?: any;
  cible?: number;
  donnees_saisie_utilisees?: any;
  calcule_effectue_at?: string;
  created_at: string;
  updated_at: string;
}
