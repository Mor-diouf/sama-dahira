export type Role = 'membre' | 'bureau' | 'tresorier' | 'controleur';
export type StatutProjet = 'idee' | 'en_cours' | 'termine';
export type TypeEvenement = 'reunion' | 'religieux' | 'collecte' | 'sortie';
export type StatutCotisation = 'en_attente' | 'confirme' | 'rejete';
export type TypeDocument = 'compte_rendu' | 'reglement' | 'affiche' | 'autre';

export interface Membre {
  id: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  quartier: string | null;
  commission: string | null;
  role: Role;
  telephone_visible: boolean;
  date_adhesion: string | null;
}

export interface Annonce {
  id: string;
  titre: string;
  texte: string;
  important: boolean;
  auteur_nom: string | null;
  publie_le: string;
}

export interface Projet {
  id: string;
  nom: string;
  description: string | null;
  responsable: string | null;
  statut: StatutProjet;
  objectif: number;
  montant_collecte: number;
  montant_depense: number;
  date_debut: string | null;
  date_fin: string | null;
  a_la_une: boolean;
}

export interface Evenement {
  id: string;
  titre: string;
  type: TypeEvenement;
  debut: string;
  lieu: string | null;
  description: string | null;
  nb_oui: number;
  nb_non: number;
  ma_reponse: boolean | null;
}

export interface Archive {
  id: string;
  titre: string;
  annee: number;
  resume: string | null;
  lien_photos: string | null;
  lien_compte_rendu: string | null;
}

export interface Cotisation {
  id: string;
  membre_id: string;
  membre_nom?: string;
  montant: number;
  date_paiement: string;
  moyen: string | null;
  reference: string | null;
  projet_id: string | null;
  projet_nom?: string | null;
  recu_path: string | null;
  statut: StatutCotisation;
  confirme_par_nom: string | null;
  confirme_le: string | null;
  note: string | null;
  created_at: string;
}

export interface InfoCotisation {
  id: string;
  numero: string;
  operateur: string;
  titulaire: string;
}

export interface DocumentDahira {
  id: string;
  titre: string;
  type: TypeDocument;
  lien: string;
  date_doc: string | null;
}

export const LIBELLE_ROLE: Record<Role, string> = {
  membre: 'Membre',
  bureau: 'Bureau',
  tresorier: 'Trésorier',
  controleur: 'Contrôleur',
};

export const LIBELLE_TYPE_EVT: Record<TypeEvenement, string> = {
  reunion: 'Réunion',
  religieux: 'Religieux',
  collecte: 'Collecte',
  sortie: 'Sortie',
};

export const LIBELLE_STATUT_PROJET: Record<StatutProjet, string> = {
  idee: 'Idée',
  en_cours: 'En cours',
  termine: 'Terminé',
};

export const LIBELLE_STATUT_COTI: Record<StatutCotisation, string> = {
  en_attente: 'En attente',
  confirme: 'Confirmé',
  rejete: 'Rejeté',
};

export const LIBELLE_TYPE_DOC: Record<TypeDocument, string> = {
  compte_rendu: 'Compte rendu',
  reglement: 'Règlement',
  affiche: 'Affiche',
  autre: 'Autre',
};

export const estBureau = (m: Membre | null) => !!m && m.role !== 'membre';
export const estTresorerie = (m: Membre | null) => !!m && (m.role === 'tresorier' || m.role === 'controleur');

/* ----- Gestion des membres par le bureau ----- */
export interface MembreGestion extends Membre {
  actif: boolean;
  /** false : fiche sans compte de connexion (le bouton « Nouveau code » en crée un) */
  a_un_compte: boolean;
}

export interface FicheMembreSaisie {
  prenom: string;
  nom: string;
  telephone: string;
  quartier: string;
  commission: string;
  role: Role;
}

const ROLES_TRESORERIE: Role[] = ['tresorier', 'controleur'];

/** Rôles qu'un membre du bureau peut attribuer (les mêmes règles sont vérifiées sur le serveur) */
export const rolesAttribuables = (moi: Membre): Role[] =>
  estTresorerie(moi) ? ['membre', 'bureau', 'tresorier', 'controleur'] : ['membre', 'bureau'];

/** Le bureau gère membres et bureau ; seule la trésorerie gère la trésorerie */
export const peutGerer = (moi: Membre, cible: Membre) => estTresorerie(moi) || !ROLES_TRESORERIE.includes(cible.role);
