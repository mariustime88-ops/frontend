import { Beneficiaire } from '@app/pages/admin/benefeciaires/benefeciaire.model';
import { Arrondissement } from '@app/pages/admin/settings/components/arrondissements/arrondissements.component';
import { Classe } from '@app/pages/admin/settings/components/classes/classes.component';
import { Ecole } from '@app/pages/admin/settings/components/ecoles/ecoles.component';
import { Gups } from '@app/pages/admin/settings/components/gups/gups.component';
import { TypeHandicap } from '@app/pages/admin/settings/components/type-handicap/type-handicap.component';
import { TypePieceIdentite } from '@app/pages/admin/settings/components/type-piece-identite/type-piece-identite.component';
import { TypeStatutSocial } from '@app/pages/admin/settings/components/type-statut-social/type-statut-social.component';
import { Village } from '@app/pages/admin/settings/components/villages/villages.component';

export interface Fille {
  id: number;
  nom: string;
  prenoms: string;
  date_de_naissance: string;
  id_individu: string;
  estimation_date_de_naissance: string;
  numero_piece: string;
  numero_piece_etat_civil?: string;
  raison_modification: string;
  lien_tuteur: string;
  lien_authentifie: string;
  lien_is_authentifie?: boolean;
  document_lien_avec_le_tuteur: string;
  tuteur_adulte: string;
  raison_choix_tuteur: string;
  photo: string;
  created_by: string;
  updated_by: string;
  classe_id: number;
  ecole_id: number;
  type_handicap_id: number;
  type_piece_identite_id: number;
  type_statut_social_id: number;
  autre_document_officiel_id?: number;
  recensement_id: number;
  lien_tuteur_id?: number;
  type_raison_choix_tuteur_id?: number;
  recensement?: Menage;
  tuteur_id: number;
  classe?: Classe;
  ecole?: Ecole;
  beneficiaires?: Beneficiaire[];
  typePieceIdentite?: TypePieceIdentite;
  handicap?: TypeHandicap;
  handicaps?: number[] | any[];
  statutSocial?: TypeStatutSocial;
  tuteur?: Tuteur;
  // Champs pour les fichiers lors de l'upload
  preuve_lien_avec_tuteur_file?: any;
  file_photo_piece_etat_civil?: any;
  // URLs des documents
  piece_identite_url?: string;
  acte_naissance_url?: string;
  attestation_tutorat_url?: string;
  url_photo_piece_etat_civil?: string;
  url_photo_piece_lien_avec_tuteur?: string;
}

export interface Tuteur {
  id: number;
  nom: string;
  prenoms: string;
  nom_complet: string;
  date_de_naissance: string;
  sexe: string;
  telephone: string;
  telephone_momo: string;
  nom_compte_momo: string;
  numero_piece: string;
  recensement_id: number;
  recensement?: Menage;
  degre: string;
  filles: Fille[];
  // URL du document d'identité
  piece_identite_url?: string;
}

export interface Menage {
  id: number;
  date_recensement: string;
  village_id: number;
  arrondissement_id: number;
  gups_id: number;
  id_kobocollect?: string;
  enqueteur_id?: number;
  enqueteur?: Enqueteur;
  created_at?: string;
  updated_at?: string;
  village?: Village;
  arrondissement?: Arrondissement;
  gups?: Gups;
  tuteur?: Tuteur;
  filles?: Fille[];
}

export interface Enqueteur {
  id: number;
  code: string;
  nom: string;
  prenoms: string;
  created_by: number;
  updated_by: number;
  created_at: string | Date;
  updated_at: string | Date;
}
