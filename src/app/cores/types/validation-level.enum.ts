export enum ValidationLevel {
  ADMIN = 4,
  LEVEL_1 = 1, // Partenaire ou Point Focal N1
  LEVEL_2 = 2, // Point Focal N2
  LEVEL_3 = 3, // National
  SAISIR_ONLY = 0, // National
}

export enum UserTypeCode {
  ADMIN = 'admin',
  PARTENAIRE = 'partenaire',
  POINT_FOCAL_NIVEAU_1 = 'point_focal_niveau_1',
  POINT_FOCAL_NIVEAU_2 = 'point_focal_niveau_2',
  COMPILATEUR_NATIONAL = 'compilateur_national',
}

export const ValidationLevelLabels = {
  [ValidationLevel.ADMIN]: 'Administrateur',
  [ValidationLevel.LEVEL_1]: 'Niveau 1 (Partenaire/Point Focal)',
  [ValidationLevel.LEVEL_2]: 'Niveau 2 (Point Focal)',
  [ValidationLevel.LEVEL_3]: 'Niveau 3 (National)',
  [ValidationLevel.SAISIR_ONLY]: 'Saisir uniquement'
};

export const UserTypeLabels = {
  [UserTypeCode.ADMIN]: 'Administrateur',
  [UserTypeCode.PARTENAIRE]: 'Partenaire',
  [UserTypeCode.POINT_FOCAL_NIVEAU_1]: 'Point Focal Niveau 1',
  [UserTypeCode.POINT_FOCAL_NIVEAU_2]: 'Point Focal Niveau 2',
  [UserTypeCode.COMPILATEUR_NATIONAL]: 'Compilateur National',
};

// Fonctions utilitaires pour vérifier les niveaux d'utilisateur
export class ValidationLevelUtils {
  /**
   * Vérifie si l'utilisateur est un partenaire
   */
  static isPartenaire(userTypeCode?: string): boolean {
    return userTypeCode == UserTypeCode.PARTENAIRE;
  }

  /**
   * Vérifie si l'utilisateur est un point focal niveau 1
   */
  static isPointFocalN1(userTypeCode?: string): boolean {
    return userTypeCode === UserTypeCode.POINT_FOCAL_NIVEAU_1;
  }

  /**
   * Vérifie si l'utilisateur est un point focal niveau 2
   */
  static isPointFocalN2(userTypeCode?: string): boolean {
    return userTypeCode === UserTypeCode.POINT_FOCAL_NIVEAU_2;
  }

  /**
   * Vérifie si l'utilisateur est national
   */
  static isNational(userTypeCode?: string): boolean {
    return userTypeCode === UserTypeCode.COMPILATEUR_NATIONAL;
  }

  /**
   * Vérifie si l'utilisateur est admin
   */
  static isAdmin(userTypeCode?: string): boolean {
    return userTypeCode === UserTypeCode.ADMIN;
  }

  /**
   * Détermine si l'utilisateur doit être redirigé vers le dashboard partenaire
   */
  static shouldRedirectToPartnerDashboard(
    validationLevel: number,
    userTypeCode?: string,
  ): boolean {
    return (
      validationLevel == ValidationLevel.SAISIR_ONLY &&
      this.isPartenaire(userTypeCode)
    );
  }

  /**
   * Détermine si l'utilisateur doit être redirigé vers le dashboard admin
   */
  static shouldRedirectToAdminDashboard(validationLevel: number): boolean {
    return [
      ValidationLevel.ADMIN,
      ValidationLevel.LEVEL_1, // Point Focal N1
      ValidationLevel.LEVEL_2, // Point Focal N2
      ValidationLevel.LEVEL_3, // National
    ].includes(validationLevel);
  }

  /**
   * Obtient le label du niveau de validation
   */
  static getValidationLevelLabel(level: number): string {
    switch (level) {
      case ValidationLevel.ADMIN:
        return ValidationLevelLabels[ValidationLevel.ADMIN];
      case ValidationLevel.LEVEL_1:
        return ValidationLevelLabels[ValidationLevel.LEVEL_1];
      case ValidationLevel.LEVEL_2:
        return ValidationLevelLabels[ValidationLevel.LEVEL_2];
      case ValidationLevel.LEVEL_3:
        return ValidationLevelLabels[ValidationLevel.LEVEL_3];
      case ValidationLevel.SAISIR_ONLY:
        return ValidationLevelLabels[ValidationLevel.SAISIR_ONLY];
      default:
        return 'Inconnu';
    }
  }

  /**
   * Obtient le label du type d'utilisateur
   */
  static getUserTypeLabel(code?: string): string {
    if (!code) return 'Non défini';
    return UserTypeLabels[code as UserTypeCode] || 'Inconnu';
  }
}
