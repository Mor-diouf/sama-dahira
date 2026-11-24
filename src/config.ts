/** Réglages du Dahira : modifiez librement ces textes */
export const DAHIRA = {
  nom: 'Dahira Tazawoudou Choubane',
  /** Nom en arabe, affiché sur l'écran de connexion */
  nomArabe: 'دائرة تزود الشباب',
  /** Nom court, affiché sous l'icône du téléphone (12 caractères maximum) */
  nomCourt: 'Tazawoudou',
  sousTitre: 'Dahira des disciples de Serigne Touba',
  ville: 'Touba Guédiawaye',
  /** Message affiché sous le formulaire de connexion */
  aide: "Vous n'avez pas de code ? Demandez-le à un membre du bureau.",
};

/**
 * Domaine technique utilisé pour transformer un numéro de téléphone en identifiant Supabase.
 * Il doit être identique dans scripts/import-membres.mjs. Aucun e-mail n'est envoyé.
 */
export const DOMAINE_IDENTIFIANT = import.meta.env.VITE_AUTH_DOMAIN || 'membres.sama-dahira.app';
