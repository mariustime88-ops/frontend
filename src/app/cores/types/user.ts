
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  name: string;
  telephone: string;
  statut: string;
  date_creation: string;
  // Nouvelles propriétés selon l'architecture refactorisée
  user_type_id?: number;
  validation_level?: number;
  linked_structure_id?: number;
  validator_group_id?: number;
  userType?: {
    id: number;
    code: string;
    name: string;
    description?: string;
    validation_level: number;
    is_active: boolean;
  };
  validationScopes?: Array<{
    id: number;
    scope_type_id: number;
    scope_entity_id?: number;
    is_active: boolean;
  }>;
  // Propriétés existantes maintenues pour compatibilité
  structure?: {
    id: number;
    nom: string;
    sigle: string;
    type_de_structure: string;
    is_partenaire: boolean;
  } | null;
  role?: {
    id: number;
    nom: string;
    description: string;
  } | null;
}
