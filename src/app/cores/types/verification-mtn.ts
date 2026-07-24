import { Fille, Tuteur } from "./global";

export interface VerificationMtn {
  id: number;
  numero: number;
  id_kobocollect: string;
  numero_momo: string;
  nom_momo: string;
  montant: number;
  statut: string;
  observation: string;
  date_verification: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  tuteur?: Tuteur;
  fille?: Fille;
  
  // Propriétés supplémentaires
  departement_id?: number;
  commune_id?: number;
  arrondissement_id?: number;
  ecole_id?: number;
  classe_id?: number;
}