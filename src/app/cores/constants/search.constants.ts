/**
 * Délai (en ms) d'attente après la dernière frappe dans une barre de recherche
 * avant de déclencher réellement la requête au backend.
 *
 * Utilisé par TOUS les composants (demandeurs, dossiernais, cartes, aides,
 * rendezvous, etudiantshands, demandesins, demandescre, etablissements) —
 * on ne change ce chiffre qu'ici, jamais dans un composant individuel.
 */
export const SEARCH_DEBOUNCE_MS = 3500;