/**
 * Données fictives du mode démonstration (utilisé tant que Supabase n'est pas configuré).
 * Les dates sont calculées à partir d'aujourd'hui pour que la démo reste toujours à jour.
 */
import type { Annonce, Archive, Cotisation, DocumentDahira, Evenement, InfoCotisation, Membre, Projet } from './types';

function dans(jours: number, h = 20, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
const jourISO = (jours: number) => dans(jours, 12).slice(0, 10);

// Générateur pseudo-aléatoire déterministe : la démo est identique à chaque ouverture
let graine = 7;
const alea = () => ((graine = (graine * 16807) % 2147483647) - 1) / 2147483646;
const choisir = <T,>(t: T[]) => t[Math.floor(alea() * t.length)];

const PRENOMS_H = ['Mamadou', 'Cheikh', 'Fallou', 'Modou', 'Serigne Saliou', 'Abdou', 'Moustapha', 'Ibrahima', 'Ousmane', 'Aliou', 'Babacar', 'Mor', 'Bassirou', 'Pape', 'Saliou', 'Massamba', 'Khadim', 'Lamine'];
const PRENOMS_F = ['Fatou', 'Aminata', 'Mame Diarra', 'Sokhna', 'Khady', 'Awa', 'Ndeye', 'Mariama', 'Bineta', 'Coumba', 'Astou', 'Seynabou', 'Mame Fama', 'Adja', 'Rokhaya'];
const NOMS = ['Diop', 'Ndiaye', 'Fall', 'Mbaye', 'Gueye', 'Sow', 'Faye', 'Sarr', 'Thiam', 'Cissé', 'Seck', 'Ba', 'Ndour', 'Lô', 'Mbacké', 'Kane', 'Diagne', 'Sène', 'Touré', 'Niang'];
const QUARTIERS = ['Parcelles Assainies', 'Médina', 'Guédiawaye', 'Pikine', 'Grand Yoff', 'Thiaroye', 'Keur Massar', 'Rufisque', 'Ouakam'];
const COMMISSIONS = ['Organisation', 'Finances', 'Culturelle (Kourel)', 'Communication', 'Sociale'];

export const DEMO_PROFILS = {
  membre: 'm-ibrahima',
  bureau: 'm-aminata',
  tresorier: 'm-modou',
} as const;

export const membres: Membre[] = [
  { id: 'm-ibrahima', prenom: 'Ibrahima', nom: 'Ndiaye', telephone: '221771112233', quartier: 'Parcelles Assainies', commission: 'Culturelle (Kourel)', role: 'membre', telephone_visible: true, date_adhesion: '2021-03-14' },
  { id: 'm-aminata', prenom: 'Aminata', nom: 'Sarr', telephone: '221762223344', quartier: 'Médina', commission: 'Communication', role: 'bureau', telephone_visible: true, date_adhesion: '2018-09-02' },
  { id: 'm-modou', prenom: 'Modou', nom: 'Fall', telephone: '221783334455', quartier: 'Grand Yoff', commission: 'Finances', role: 'tresorier', telephone_visible: true, date_adhesion: '2016-01-20' },
  { id: 'm-cheikh', prenom: 'Cheikh', nom: 'Mbacké', telephone: '221704445566', quartier: 'Médina', commission: 'Organisation', role: 'bureau', telephone_visible: true, date_adhesion: '2015-05-11' },
  { id: 'm-sokhna', prenom: 'Sokhna', nom: 'Gueye', telephone: '221775556677', quartier: 'Pikine', commission: 'Finances', role: 'controleur', telephone_visible: false, date_adhesion: '2017-11-30' },
];
for (let i = 0; i < 43; i++) {
  const femme = alea() < 0.45;
  const prenom = choisir(femme ? PRENOMS_F : PRENOMS_H);
  const tel = `2217${choisir(['0', '6', '7', '8'])}${String(Math.floor(alea() * 1e7)).padStart(7, '0')}`;
  membres.push({
    id: `m-${i}`,
    prenom,
    nom: choisir(NOMS),
    telephone: tel,
    quartier: choisir(QUARTIERS),
    commission: alea() < 0.7 ? choisir(COMMISSIONS) : null,
    role: 'membre',
    telephone_visible: alea() < 0.6,
    date_adhesion: `${2012 + Math.floor(alea() * 13)}-0${1 + Math.floor(alea() * 9)}-1${Math.floor(alea() * 9)}`,
  });
}

export const annonces: Annonce[] = [
  { id: 'a1', titre: 'Préparatifs du Grand Magal', texte: "Chers disciples, la commission Organisation lance les préparatifs du Grand Magal de Touba. Les cotisations pour le transport et la restauration sont ouvertes dès aujourd'hui.\n\nQue Serigne Touba agrée nos efforts.", important: true, auteur_nom: 'Cheikh Mbacké', publie_le: dans(-1, 9, 30) },
  { id: 'a2', titre: 'Kourel de jeudi : répétition générale', texte: 'Le kourel se réunit jeudi après la prière de Ichâ au local du Dahira. Les nouveaux membres de la commission culturelle sont les bienvenus.', important: false, auteur_nom: 'Aminata Sarr', publie_le: dans(-3, 18) },
  { id: 'a3', titre: 'Bilan de la journée de Set Setal', texte: "Merci aux 65 membres présents pour le nettoyage de la mosquée du quartier. Les photos sont disponibles dans l'onglet Archives.", important: false, auteur_nom: 'Aminata Sarr', publie_le: dans(-8, 11) },
  { id: 'a4', titre: 'Nouveaux numéros de cotisation', texte: "Le bureau a ouvert deux comptes officiels au nom du Dahira (Wave et Orange Money). Merci de n'utiliser que ces numéros, visibles dans l'onglet Cotiser.", important: true, auteur_nom: 'Modou Fall', publie_le: dans(-15, 10) },
];

export const projets: Omit<Projet, 'montant_collecte'>[] = [
  { id: 'p1', nom: 'Participation au Grand Magal', description: 'Transport en bus, hébergement et restauration des membres pour le Magal de Touba, plus la contribution du Dahira.', responsable: 'Cheikh Mbacké', statut: 'en_cours', objectif: 3500000, montant_depense: 450000, date_debut: jourISO(-30), date_fin: jourISO(60), a_la_une: true },
  { id: 'p2', nom: 'Bâches, chaises et sono', description: 'Équipement pour les cérémonies religieuses et les kourels : 200 chaises, 2 bâches et un système de sonorisation.', responsable: 'Modou Fall', statut: 'en_cours', objectif: 1800000, montant_depense: 0, date_debut: jourISO(-90), date_fin: jourISO(30), a_la_une: false },
  { id: 'p3', nom: 'Rénovation du local du Dahira', description: 'Peinture, carrelage et installation de ventilateurs.', responsable: 'Babacar Diop', statut: 'termine', objectif: 900000, montant_depense: 870000, date_debut: jourISO(-300), date_fin: jourISO(-200), a_la_une: false },
  { id: 'p4', nom: "Bourses d'études pour les jeunes", description: "Soutien scolaire et fournitures pour les enfants des membres en difficulté. Projet en cours d'étude par le bureau.", responsable: 'Sokhna Gueye', statut: 'idee', objectif: 1200000, montant_depense: 0, date_debut: null, date_fin: null, a_la_une: false },
];

export const evenements: Omit<Evenement, 'nb_oui' | 'nb_non' | 'ma_reponse'>[] = [
  { id: 'e1', titre: 'Réunion mensuelle du Dahira', type: 'reunion', debut: dans(4, 20, 30), lieu: 'Local du Dahira, Médina', description: "Ordre du jour : préparatifs du Magal, point financier, questions diverses." },
  { id: 'e2', titre: 'Soirée de Khassaïdes', type: 'religieux', debut: dans(9, 21), lieu: 'Mosquée des Parcelles, U17', description: 'Récital de Khassaïdes par le kourel du Dahira, suivi d\'une causerie.' },
  { id: 'e3', titre: 'Journée de collecte', type: 'collecte', debut: dans(14, 9), lieu: 'Marché HLM et Sandaga', description: 'Collecte pour le projet Grand Magal. Rendez-vous au local à 8h30.' },
  { id: 'e4', titre: 'Ziar à Touba', type: 'sortie', debut: dans(23, 6), lieu: 'Départ : rond-point Liberté 6', description: 'Visite pieuse à Touba. Bus de 60 places, merci de confirmer votre présence.' },
  { id: 'e5', titre: 'Réunion du bureau élargi', type: 'reunion', debut: dans(32, 20, 30), lieu: 'Local du Dahira, Médina', description: 'Bilan de la collecte et organisation du transport.' },
  { id: 'e6', titre: 'Set Setal de la mosquée', type: 'collecte', debut: dans(-8, 8), lieu: 'Mosquée du quartier', description: 'Journée de nettoyage.' },
  { id: 'e7', titre: 'Réunion mensuelle du Dahira', type: 'reunion', debut: dans(-26, 20, 30), lieu: 'Local du Dahira, Médina', description: null },
];

export const presences: { evenement_id: string; membre_id: string; reponse: boolean }[] = [];
for (const e of evenements.filter((x) => x.type === 'reunion' || x.type === 'sortie')) {
  for (const m of membres.slice(3)) if (alea() < 0.55) presences.push({ evenement_id: e.id, membre_id: m.id, reponse: alea() < 0.82 });
}

export const archives: Archive[] = [
  { id: 'r1', titre: 'Set Setal de la mosquée', annee: new Date().getFullYear(), resume: '65 membres mobilisés pour le nettoyage et la peinture de la mosquée du quartier.', lien_photos: 'https://drive.google.com', lien_compte_rendu: null },
  { id: 'r2', titre: 'Grand Magal de Touba', annee: new Date().getFullYear(), resume: '3 bus affrétés, 180 membres accompagnés. Contribution du Dahira remise au comité d\'organisation.', lien_photos: 'https://drive.google.com', lien_compte_rendu: 'https://drive.google.com' },
  { id: 'r3', titre: 'Inauguration du local rénové', annee: new Date().getFullYear() - 1, resume: 'Fin des travaux de rénovation du local, en présence des anciens du Dahira.', lien_photos: 'https://drive.google.com', lien_compte_rendu: 'https://drive.google.com' },
  { id: 'r4', titre: 'Grand Magal de Touba', annee: new Date().getFullYear() - 1, resume: '2 bus, 120 membres.', lien_photos: 'https://drive.google.com', lien_compte_rendu: null },
];

export const documents: DocumentDahira[] = [
  { id: 'd1', titre: 'Règlement intérieur du Dahira', type: 'reglement', lien: 'https://drive.google.com', date_doc: jourISO(-400) },
  { id: 'd2', titre: 'Compte rendu : réunion mensuelle', type: 'compte_rendu', lien: 'https://drive.google.com', date_doc: jourISO(-26) },
  { id: 'd3', titre: 'Compte rendu : assemblée générale', type: 'compte_rendu', lien: 'https://drive.google.com', date_doc: jourISO(-120) },
  { id: 'd4', titre: 'Affiche : Soirée de Khassaïdes', type: 'affiche', lien: 'https://drive.google.com', date_doc: jourISO(-2) },
];

export const infosCotisation: InfoCotisation[] = [
  { id: 'i1', numero: '700000001', operateur: 'Wave', titulaire: 'Dahira (compte officiel)' },
  { id: 'i2', numero: '770000002', operateur: 'Orange Money', titulaire: 'Dahira (compte officiel)' },
];

export const cotisations: Cotisation[] = [];
let n = 0;
for (const m of membres.slice(3)) {
  const k = Math.floor(alea() * 3);
  for (let j = 0; j < k; j++) {
    const p = choisir(['p1', 'p1', 'p2', 'p3']);
    cotisations.push({
      id: `c${n++}`, membre_id: m.id, montant: choisir([2000, 5000, 5000, 10000, 15000, 25000]),
      date_paiement: jourISO(-Math.floor(alea() * 60)), moyen: choisir(['Wave', 'Orange Money']), reference: null,
      projet_id: p, recu_path: null, statut: 'confirme', confirme_par_nom: 'Modou Fall', confirme_le: dans(-1), note: null, created_at: dans(-Math.floor(alea() * 60)),
    });
  }
}
// Gros donateurs pour que la démo montre des montants réalistes
for (const [p, montant] of [['p1', 1450000], ['p2', 820000], ['p3', 900000]] as const) {
  cotisations.push({ id: `c${n++}`, membre_id: 'm-cheikh', montant, date_paiement: jourISO(-20), moyen: 'Wave', reference: null, projet_id: p, recu_path: null, statut: 'confirme', confirme_par_nom: 'Modou Fall', confirme_le: dans(-19), note: 'Collecte groupée', created_at: dans(-20) });
}
cotisations.push(
  { id: `c${n++}`, membre_id: 'm-ibrahima', montant: 10000, date_paiement: jourISO(-2), moyen: 'Wave', reference: 'TX8F2K', projet_id: 'p1', recu_path: null, statut: 'en_attente', confirme_par_nom: null, confirme_le: null, note: null, created_at: dans(-2) },
  { id: `c${n++}`, membre_id: 'm-ibrahima', montant: 5000, date_paiement: jourISO(-35), moyen: 'Orange Money', reference: null, projet_id: 'p2', recu_path: null, statut: 'confirme', confirme_par_nom: 'Modou Fall', confirme_le: dans(-33), note: null, created_at: dans(-35) },
  { id: `c${n++}`, membre_id: 'm-4', montant: 15000, date_paiement: jourISO(-1), moyen: 'Wave', reference: 'WV-99812', projet_id: 'p1', recu_path: null, statut: 'en_attente', confirme_par_nom: null, confirme_le: null, note: null, created_at: dans(-1) },
  { id: `c${n++}`, membre_id: 'm-9', montant: 5000, date_paiement: jourISO(0), moyen: 'Orange Money', reference: null, projet_id: 'p2', recu_path: null, statut: 'en_attente', confirme_par_nom: null, confirme_le: null, note: null, created_at: dans(0, 9) },
);
