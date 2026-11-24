import { supabase, MODE_DEMO } from './supabase';
import * as demo from './demo';
import type {
  Annonce, Archive, Cotisation, DocumentDahira, Evenement, FicheMembreSaisie, InfoCotisation, Membre, MembreGestion, Projet,
  StatutCotisation, TypeDocument, TypeEvenement,
} from './types';
import { normaliserTelephone } from './format';

export interface NouvelleCotisation {
  montant: number;
  date_paiement: string;
  projet_id: string | null;
  moyen: string | null;
  reference: string | null;
  fichier: File | null;
}
export interface NouvelEvenement { titre: string; type: TypeEvenement; debut: string; lieu: string; description: string }
export interface NouveauProjet {
  id?: string; nom: string; description: string; responsable: string; statut: Projet['statut'];
  objectif: number; montant_depense: number; date_debut: string | null; date_fin: string | null; a_la_une: boolean;
}

/** Types d'événements pour lesquels on demande « Je viens / Je ne viens pas » */
export const AVEC_REPONSE: TypeEvenement[] = ['reunion', 'sortie'];

// Membre connecté : renseigné par le contexte d'authentification
let moi: Membre | null = null;
export const definirMembreCourant = (m: Membre | null) => { moi = m; };
const membreCourant = () => {
  if (!moi) throw new Error('Session expirée. Reconnectez-vous.');
  return moi;
};

export function messageErreur(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(msg)) return 'Numéro ou code incorrect.';
  if (/failed to fetch|network/i.test(msg)) return 'Pas de connexion internet. Réessayez.';
  if (/row-level security|permission denied/i.test(msg)) return "Vous n'avez pas le droit de faire cette action.";
  if (/rate limit|too many/i.test(msg)) return 'Trop de tentatives. Patientez quelques minutes.';
  if (/failed to send a request/i.test(msg)) return 'Pas de connexion internet. Réessayez.';
  return msg;
}

/* ===================================================================== */
/* Supabase                                                              */
/* ===================================================================== */
function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}
const sb = () => supabase!;

const COLONNES_GESTION = 'id,prenom,nom,telephone,quartier,commission,role,telephone_visible,date_adhesion,actif,user_id';

/** Appelle la fonction serveur « gerer-membres » (elle seule peut créer des comptes et des codes) */
async function appelGestion<T>(action: string, donnees: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().functions.invoke('gerer-membres', { body: { action, ...donnees } });
  if (!error) return data as T;
  const reponse = (error as { context?: Response }).context;
  if (reponse instanceof Response) {
    if (reponse.status === 404 && !reponse.headers.get('content-type')?.includes('json')) {
      throw new Error("La gestion des membres n'est pas encore installée sur Supabase (fonction « gerer-membres »).");
    }
    const corps = await reponse.json().catch(() => null) as { erreur?: string; message?: string } | null;
    if (corps?.erreur) throw new Error(corps.erreur);
    if (reponse.status === 404) throw new Error("La gestion des membres n'est pas encore installée sur Supabase (fonction « gerer-membres »).");
    if (reponse.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
  }
  throw new Error(error.message);
}

const apiSupabase = {
  async annuaire(): Promise<Membre[]> {
    return ok(await sb().rpc('annuaire')) as Membre[];
  },
  async annonces(limite?: number): Promise<Annonce[]> {
    let q = sb().from('annonces').select('*').order('publie_le', { ascending: false });
    if (limite) q = q.limit(limite);
    return ok(await q) as Annonce[];
  },
  async projets(): Promise<Projet[]> {
    const rows = ok(await sb().from('projets_bilan').select('*').order('a_la_une', { ascending: false }).order('created_at', { ascending: false })) as Projet[];
    return rows.map((p) => ({ ...p, objectif: Number(p.objectif), montant_collecte: Number(p.montant_collecte), montant_depense: Number(p.montant_depense) }));
  },
  async evenements(): Promise<Evenement[]> {
    const depuis = new Date();
    depuis.setFullYear(depuis.getFullYear() - 1);
    const evts = ok(await sb().from('evenements').select('id,titre,type,debut,lieu,description').gte('debut', depuis.toISOString()).order('debut')) as Omit<Evenement, 'nb_oui' | 'nb_non' | 'ma_reponse'>[];
    const ids = evts.filter((e) => AVEC_REPONSE.includes(e.type)).map((e) => e.id);
    if (!ids.length) return evts.map((e) => ({ ...e, nb_oui: 0, nb_non: 0, ma_reponse: null }));
    const [comptes, miennes] = await Promise.all([
      sb().from('presences_compte').select('*').in('evenement_id', ids),
      sb().from('presences').select('evenement_id,reponse').eq('membre_id', membreCourant().id).in('evenement_id', ids),
    ]);
    const c = new Map((ok(comptes) as { evenement_id: string; nb_oui: number; nb_non: number }[]).map((x) => [x.evenement_id, x]));
    const r = new Map((ok(miennes) as { evenement_id: string; reponse: boolean }[]).map((x) => [x.evenement_id, x.reponse]));
    return evts.map((e) => ({ ...e, nb_oui: Number(c.get(e.id)?.nb_oui ?? 0), nb_non: Number(c.get(e.id)?.nb_non ?? 0), ma_reponse: r.has(e.id) ? r.get(e.id)! : null }));
  },
  async repondrePresence(evenementId: string, reponse: boolean) {
    ok(await sb().from('presences').upsert({ evenement_id: evenementId, membre_id: membreCourant().id, reponse, repondu_le: new Date().toISOString() }, { onConflict: 'evenement_id,membre_id' }));
  },
  async presencesEvenement(evenementId: string): Promise<{ nom: string; reponse: boolean }[]> {
    const rows = ok(await sb().from('presences').select('reponse, membre:membres(prenom,nom)').eq('evenement_id', evenementId)) as unknown as { reponse: boolean; membre: { prenom: string; nom: string } | null }[];
    return rows.map((x) => ({ nom: x.membre ? `${x.membre.prenom} ${x.membre.nom}` : 'Membre', reponse: x.reponse })).sort((a, b) => a.nom.localeCompare(b.nom));
  },
  async archives(): Promise<Archive[]> {
    return ok(await sb().from('archives').select('*').order('annee', { ascending: false }).order('created_at', { ascending: false })) as Archive[];
  },
  async documents(): Promise<DocumentDahira[]> {
    return ok(await sb().from('documents').select('*').order('date_doc', { ascending: false, nullsFirst: false })) as DocumentDahira[];
  },
  async infosCotisation(): Promise<InfoCotisation[]> {
    return ok(await sb().from('infos_cotisation').select('id,numero,operateur,titulaire').eq('actif', true).order('ordre')) as InfoCotisation[];
  },
  async mesCotisations(): Promise<Cotisation[]> {
    const rows = ok(await sb().from('cotisations').select('*, projet:projets(nom)').eq('membre_id', membreCourant().id).order('created_at', { ascending: false })) as (Cotisation & { projet: { nom: string } | null })[];
    return rows.map(({ projet, ...c }) => ({ ...c, montant: Number(c.montant), projet_nom: projet?.nom ?? null }));
  },
  async declarerCotisation(d: NouvelleCotisation) {
    const m = membreCourant();
    let recu_path: string | null = null;
    if (d.fichier) {
      const { data: u } = await sb().auth.getUser();
      const ext = (d.fichier.name.split('.').pop() || 'jpg').toLowerCase();
      recu_path = `${u.user!.id}/${Date.now()}.${ext}`;
      ok(await sb().storage.from('recus').upload(recu_path, d.fichier, { contentType: d.fichier.type, upsert: false }));
    }
    ok(await sb().from('cotisations').insert({
      membre_id: m.id, montant: d.montant, date_paiement: d.date_paiement, projet_id: d.projet_id,
      moyen: d.moyen, reference: d.reference, recu_path,
    }));
  },
  async annulerDeclaration(id: string) {
    ok(await sb().from('cotisations').delete().eq('id', id).eq('statut', 'en_attente'));
  },
  async changerVisibilite(visible: boolean) {
    ok(await sb().rpc('changer_visibilite', { p_visible: visible }));
  },

  /* ----- Bureau ----- */
  async publierAnnonce(a: { titre: string; texte: string; important: boolean }) {
    const m = membreCourant();
    ok(await sb().from('annonces').insert({ ...a, auteur_id: m.id, auteur_nom: `${m.prenom} ${m.nom}` }));
  },
  async supprimerAnnonce(id: string) { ok(await sb().from('annonces').delete().eq('id', id)); },
  async creerEvenement(e: NouvelEvenement) { ok(await sb().from('evenements').insert(e)); },
  async supprimerEvenement(id: string) { ok(await sb().from('evenements').delete().eq('id', id)); },
  async enregistrerProjet(p: NouveauProjet) {
    const { id, ...valeurs } = p;
    if (valeurs.a_la_une) ok(await sb().from('projets').update({ a_la_une: false }).eq('a_la_une', true));
    if (id) ok(await sb().from('projets').update(valeurs).eq('id', id));
    else ok(await sb().from('projets').insert(valeurs));
  },
  async supprimerProjet(id: string) { ok(await sb().from('projets').delete().eq('id', id)); },
  async ajouterDocument(d: { titre: string; type: TypeDocument; lien: string; date_doc: string }) { ok(await sb().from('documents').insert(d)); },
  async supprimerDocument(id: string) { ok(await sb().from('documents').delete().eq('id', id)); },
  async ajouterArchive(a: { titre: string; annee: number; resume: string; lien_photos: string | null; lien_compte_rendu: string | null }) { ok(await sb().from('archives').insert(a)); },
  async supprimerArchive(id: string) { ok(await sb().from('archives').delete().eq('id', id)); },

  /* ----- Membres (bureau) ----- */
  async membresGestion(): Promise<MembreGestion[]> {
    const rows = ok(await sb().from('membres').select(COLONNES_GESTION).order('prenom').order('nom')) as (Omit<MembreGestion, 'a_un_compte'> & { user_id: string | null })[];
    return rows.map(({ user_id, ...m }) => ({ ...m, a_un_compte: !!user_id }));
  },
  async creerMembre(f: FicheMembreSaisie & { telephone_visible: boolean }): Promise<{ membre: MembreGestion; code: string }> {
    return appelGestion('creer', { ...f });
  },
  async modifierMembre(id: string, f: FicheMembreSaisie): Promise<MembreGestion> {
    return (await appelGestion<{ membre: MembreGestion }>('modifier', { id, ...f })).membre;
  },
  async nouveauCode(id: string): Promise<string> {
    return (await appelGestion<{ code: string }>('nouveau_code', { id })).code;
  },
  async activerMembre(id: string, actif: boolean): Promise<MembreGestion> {
    return (await appelGestion<{ membre: MembreGestion }>('activer', { id, actif })).membre;
  },

  /* ----- Trésorerie ----- */
  async toutesCotisations(statut?: StatutCotisation): Promise<Cotisation[]> {
    let q = sb().from('cotisations').select('*, membre:membres!cotisations_membre_fk(prenom,nom), projet:projets(nom)').order('created_at', { ascending: false }).limit(500);
    if (statut) q = q.eq('statut', statut);
    const rows = ok(await q) as (Cotisation & { membre: { prenom: string; nom: string } | null; projet: { nom: string } | null })[];
    return rows.map(({ membre, projet, ...c }) => ({ ...c, montant: Number(c.montant), membre_nom: membre ? `${membre.prenom} ${membre.nom}` : '?', projet_nom: projet?.nom ?? null }));
  },
  async validerCotisation(id: string, statut: StatutCotisation, note?: string) {
    ok(await sb().rpc('valider_cotisation', { p_id: id, p_statut: statut, p_note: note ?? null }));
  },
  async lienRecu(path: string): Promise<string> {
    const r = ok(await sb().storage.from('recus').createSignedUrl(path, 3600)) as { signedUrl: string };
    return r.signedUrl;
  },
  async modifierInfoCotisation(i: { id?: string; numero: string; operateur: string; titulaire: string }) {
    const { id, ...v } = i;
    if (id) ok(await sb().from('infos_cotisation').update(v).eq('id', id));
    else ok(await sb().from('infos_cotisation').insert(v));
  },
};

/* ===================================================================== */
/* Démonstration (en mémoire)                                            */
/* ===================================================================== */
const pause = () => new Promise((r) => setTimeout(r, 180));
const nouvelId = () => Math.random().toString(36).slice(2);
const nomMembre = (id: string) => {
  const m = demo.membres.find((x) => x.id === id);
  return m ? `${m.prenom} ${m.nom}` : '?';
};
const nomProjet = (id: string | null) => demo.projets.find((p) => p.id === id)?.nom ?? null;

// Démo : membres désactivés et contrôle des droits (mêmes règles que la fonction serveur)
const inactifsDemo = new Set<string>();
const versGestion = (m: Membre): MembreGestion => ({ ...m, actif: !inactifsDemo.has(m.id), a_un_compte: true });
const codeDemo = () => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
function controleDemo(f: { prenom: string; nom: string; telephone: string; role: Membre['role'] }, saufId?: string) {
  const moiDemo = membreCourant();
  if (moiDemo.role === 'membre') throw new Error('Action réservée aux membres du bureau.');
  if (!f.prenom.trim() || !f.nom.trim()) throw new Error('Le prénom et le nom sont obligatoires.');
  const tel = normaliserTelephone(f.telephone);
  if (tel.length < 11 || tel.length > 15) throw new Error('Numéro de téléphone invalide. Exemple : 77 123 45 67.');
  const doublon = demo.membres.find((m) => m.telephone === tel && m.id !== saufId);
  if (doublon) throw new Error(`Ce numéro est déjà celui de ${doublon.prenom} ${doublon.nom}.`);
  const tresorerie = (r: Membre['role']) => r === 'tresorier' || r === 'controleur';
  if (tresorerie(f.role) && !tresorerie(moiDemo.role)) throw new Error('Seuls le trésorier et le contrôleur peuvent attribuer ce rôle.');
  return tel;
}
function cibleDemo(id: string) {
  const m = demo.membres.find((x) => x.id === id);
  if (!m) throw new Error('Membre introuvable.');
  const r = membreCourant().role;
  if ((m.role === 'tresorier' || m.role === 'controleur') && r !== 'tresorier' && r !== 'controleur') {
    throw new Error('Seuls le trésorier et le contrôleur peuvent modifier un membre de la trésorerie.');
  }
  return m;
}

const apiDemo: typeof apiSupabase = {
  async annuaire() {
    await pause();
    const voitTout = membreCourant().role !== 'membre';
    return demo.membres
      .filter((m) => !inactifsDemo.has(m.id))
      .map((m) => ({ ...m, telephone: m.telephone_visible || voitTout || m.id === moi?.id ? m.telephone : null }))
      .sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`));
  },
  async annonces(limite?: number) {
    await pause();
    const t = [...demo.annonces].sort((a, b) => b.publie_le.localeCompare(a.publie_le));
    return limite ? t.slice(0, limite) : t;
  },
  async projets() {
    await pause();
    return demo.projets
      .map((p) => ({ ...p, montant_collecte: demo.cotisations.filter((c) => c.projet_id === p.id && c.statut === 'confirme').reduce((s, c) => s + c.montant, 0) }))
      .sort((a, b) => Number(b.a_la_une) - Number(a.a_la_une));
  },
  async evenements() {
    await pause();
    return [...demo.evenements].sort((a, b) => a.debut.localeCompare(b.debut)).map((e) => {
      const p = demo.presences.filter((x) => x.evenement_id === e.id);
      const mienne = p.find((x) => x.membre_id === moi?.id);
      return { ...e, nb_oui: p.filter((x) => x.reponse).length, nb_non: p.filter((x) => !x.reponse).length, ma_reponse: mienne ? mienne.reponse : null };
    });
  },
  async repondrePresence(evenementId, reponse) {
    await pause();
    const m = membreCourant();
    const p = demo.presences.find((x) => x.evenement_id === evenementId && x.membre_id === m.id);
    if (p) p.reponse = reponse;
    else demo.presences.push({ evenement_id: evenementId, membre_id: m.id, reponse });
  },
  async presencesEvenement(evenementId) {
    await pause();
    return demo.presences.filter((x) => x.evenement_id === evenementId).map((x) => ({ nom: nomMembre(x.membre_id), reponse: x.reponse })).sort((a, b) => a.nom.localeCompare(b.nom));
  },
  async archives() { await pause(); return [...demo.archives].sort((a, b) => b.annee - a.annee); },
  async documents() { await pause(); return [...demo.documents].sort((a, b) => (b.date_doc ?? '').localeCompare(a.date_doc ?? '')); },
  async infosCotisation() { await pause(); return demo.infosCotisation; },
  async mesCotisations() {
    await pause();
    const m = membreCourant();
    return demo.cotisations.filter((c) => c.membre_id === m.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((c) => ({ ...c, projet_nom: nomProjet(c.projet_id) }));
  },
  async declarerCotisation(d) {
    await pause();
    demo.cotisations.push({
      id: nouvelId(), membre_id: membreCourant().id, montant: d.montant, date_paiement: d.date_paiement, moyen: d.moyen, reference: d.reference,
      projet_id: d.projet_id, recu_path: d.fichier ? URL.createObjectURL(d.fichier) : null, statut: 'en_attente', confirme_par_nom: null, confirme_le: null, note: null, created_at: new Date().toISOString(),
    });
  },
  async annulerDeclaration(id) {
    await pause();
    const i = demo.cotisations.findIndex((c) => c.id === id && c.statut === 'en_attente');
    if (i >= 0) demo.cotisations.splice(i, 1);
  },
  async changerVisibilite(visible) {
    await pause();
    const m = demo.membres.find((x) => x.id === membreCourant().id);
    if (m) m.telephone_visible = visible;
  },
  async publierAnnonce(a) {
    await pause();
    const m = membreCourant();
    demo.annonces.push({ ...a, id: nouvelId(), auteur_nom: `${m.prenom} ${m.nom}`, publie_le: new Date().toISOString() });
  },
  async supprimerAnnonce(id) { await pause(); demo.annonces.splice(demo.annonces.findIndex((a) => a.id === id), 1); },
  async creerEvenement(e) { await pause(); demo.evenements.push({ ...e, id: nouvelId() }); },
  async supprimerEvenement(id) { await pause(); demo.evenements.splice(demo.evenements.findIndex((e) => e.id === id), 1); },
  async enregistrerProjet(p) {
    await pause();
    if (p.a_la_une) demo.projets.forEach((x) => { x.a_la_une = false; });
    if (p.id) Object.assign(demo.projets.find((x) => x.id === p.id)!, p);
    else demo.projets.push({ ...p, id: nouvelId() });
  },
  async supprimerProjet(id) { await pause(); demo.projets.splice(demo.projets.findIndex((p) => p.id === id), 1); },
  async ajouterDocument(d) { await pause(); demo.documents.push({ ...d, id: nouvelId() }); },
  async supprimerDocument(id) { await pause(); demo.documents.splice(demo.documents.findIndex((d) => d.id === id), 1); },
  async ajouterArchive(a) { await pause(); demo.archives.push({ ...a, id: nouvelId() }); },
  async supprimerArchive(id) { await pause(); demo.archives.splice(demo.archives.findIndex((a) => a.id === id), 1); },
  async toutesCotisations(statut) {
    await pause();
    return demo.cotisations
      .filter((c) => !statut || c.statut === statut)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => ({ ...c, membre_nom: nomMembre(c.membre_id), projet_nom: nomProjet(c.projet_id) }));
  },
  async validerCotisation(id, statut, note) {
    await pause();
    const m = membreCourant();
    const c = demo.cotisations.find((x) => x.id === id);
    if (!c) throw new Error('Cotisation introuvable');
    Object.assign(c, { statut, note: note ?? c.note, confirme_par_nom: statut === 'en_attente' ? null : `${m.prenom} ${m.nom}`, confirme_le: statut === 'en_attente' ? null : new Date().toISOString() });
  },
  async membresGestion() {
    await pause();
    return [...demo.membres].sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`)).map(versGestion);
  },
  async creerMembre(f) {
    await pause();
    const tel = controleDemo(f);
    const m: Membre = {
      id: nouvelId(), prenom: f.prenom.trim(), nom: f.nom.trim(), telephone: tel, quartier: f.quartier.trim() || null,
      commission: f.commission.trim() || null, role: f.role, telephone_visible: f.telephone_visible, date_adhesion: new Date().toISOString().slice(0, 10),
    };
    demo.membres.push(m);
    return { membre: versGestion(m), code: codeDemo() };
  },
  async modifierMembre(id, f) {
    await pause();
    const m = cibleDemo(id);
    if (id === membreCourant().id && f.role !== m.role) throw new Error('Vous ne pouvez pas changer votre propre rôle. Demandez à un autre membre du bureau.');
    const tel = controleDemo(f, id);
    Object.assign(m, { prenom: f.prenom.trim(), nom: f.nom.trim(), telephone: tel, quartier: f.quartier.trim() || null, commission: f.commission.trim() || null, role: f.role });
    return versGestion(m);
  },
  async nouveauCode(id) {
    await pause();
    const m = cibleDemo(id);
    if (inactifsDemo.has(m.id)) throw new Error("Ce membre est désactivé. Réactivez-le d'abord.");
    return codeDemo();
  },
  async activerMembre(id, actif) {
    await pause();
    const m = cibleDemo(id);
    if (id === membreCourant().id && !actif) throw new Error('Vous ne pouvez pas désactiver votre propre compte.');
    if (actif) inactifsDemo.delete(id); else inactifsDemo.add(id);
    return versGestion(m);
  },
  async lienRecu(path) { return path; },
  async modifierInfoCotisation(i) {
    await pause();
    if (i.id) Object.assign(demo.infosCotisation.find((x) => x.id === i.id)!, i);
    else demo.infosCotisation.push({ ...i, id: nouvelId() });
  },
};

export const api = MODE_DEMO ? apiDemo : apiSupabase;
