// Sama Dahira : gestion des membres par le bureau (Supabase Edge Function « gerer-membres »)
//
// Créer un compte ou changer un code demande la clé secrète : elle reste ici, sur le serveur,
// et n'est jamais envoyée au téléphone. La fonction vérifie elle-même qui appelle :
//   - bureau, trésorier, contrôleur : ajouter, modifier, désactiver des membres et du bureau ;
//   - seuls le trésorier et le contrôleur peuvent attribuer ou modifier les rôles de trésorerie ;
//   - personne ne peut modifier son propre rôle ni se désactiver.
//
// Actions (POST, corps JSON) :
//   { action: 'creer', prenom, nom, telephone, quartier?, commission?, role?, telephone_visible? }
//   { action: 'modifier', id, prenom, nom, telephone, quartier?, commission?, role }
//   { action: 'nouveau_code', id }
//   { action: 'activer', id, actif }
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const DOMAINE = Deno.env.get('AUTH_DOMAIN') || 'membres.sama-dahira.app';
const ROLES = ['membre', 'bureau', 'tresorier', 'controleur'] as const;
type Role = (typeof ROLES)[number];
const TRESORERIE: Role[] = ['tresorier', 'controleur'];
const COLONNES = 'id,prenom,nom,telephone,quartier,commission,role,telephone_visible,date_adhesion,actif,user_id';
const BANNI = '876000h'; // environ 100 ans

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class Refus extends Error {
  constructor(message: string, public statut = 400) { super(message); }
}

const repondre = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } });

interface FicheMembre {
  id: string; prenom: string; nom: string; telephone: string | null; quartier: string | null; commission: string | null;
  role: Role; telephone_visible: boolean; date_adhesion: string | null; actif: boolean; user_id: string | null;
}

const versClient = ({ user_id, ...m }: FicheMembre) => ({ ...m, a_un_compte: !!user_id });

function normaliserTelephone(saisie: unknown) {
  let t = String(saisie ?? '').replace(/\D/g, '');
  if (t.startsWith('00')) t = t.slice(2);
  if (t.length === 9) t = `221${t}`;
  if (t.length < 11 || t.length > 15) throw new Refus('Numéro de téléphone invalide. Exemple : 77 123 45 67.');
  return t;
}

const texte = (v: unknown, max = 80) => {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s ? s.slice(0, max) : null;
};

function nouveauCode() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 1_000_000).padStart(6, '0');
}

const email = (tel: string) => `${tel}@${DOMAINE}`;

async function trouverUtilisateur(admin: SupabaseClient, mail: string): Promise<User | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === mail);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Crée le compte de connexion, ou reprend un compte orphelin existant en lui donnant un nouveau code */
async function creerCompte(admin: SupabaseClient, tel: string, prenom: string, nom: string, code: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(tel), password: code, email_confirm: true, user_metadata: { prenom, nom },
  });
  if (!error) return data.user.id;
  const existant = await trouverUtilisateur(admin, email(tel));
  if (!existant) throw error;
  const { data: lie } = await admin.from('membres').select('id').eq('user_id', existant.id).maybeSingle();
  if (lie) throw new Refus('Ce numéro est déjà relié à un autre membre.');
  const maj = await admin.auth.admin.updateUserById(existant.id, { password: code, ban_duration: 'none' });
  if (maj.error) throw maj.error;
  return existant.id;
}

async function verifierNumeroLibre(admin: SupabaseClient, tel: string, saufId?: string) {
  let q = admin.from('membres').select('id,prenom,nom').eq('telephone', tel);
  if (saufId) q = q.neq('id', saufId);
  const { data } = await q.maybeSingle();
  if (data) throw new Refus(`Ce numéro est déjà celui de ${data.prenom} ${data.nom}.`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return repondre({ erreur: 'Méthode non autorisée' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Qui appelle ?
    const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = jeton ? await admin.auth.getUser(jeton) : { data: { user: null } };
    if (!auth.user) throw new Refus('Session expirée. Reconnectez-vous.', 401);

    const { data: moi } = await admin.from('membres').select(COLONNES).eq('user_id', auth.user.id).maybeSingle<FicheMembre>();
    if (!moi || !moi.actif || moi.role === 'membre') throw new Refus('Action réservée aux membres du bureau.', 403);
    const tresorerie = TRESORERIE.includes(moi.role);

    const corps = await req.json().catch(() => ({}));
    const action = String(corps.action ?? '');

    const lireRole = (v: unknown): Role => {
      const r = String(v ?? 'membre') as Role;
      if (!ROLES.includes(r)) throw new Refus('Rôle inconnu.');
      if (TRESORERIE.includes(r) && !tresorerie) throw new Refus('Seuls le trésorier et le contrôleur peuvent attribuer ce rôle.', 403);
      return r;
    };

    const chargerCible = async () => {
      const { data } = await admin.from('membres').select(COLONNES).eq('id', String(corps.id ?? '')).maybeSingle<FicheMembre>();
      if (!data) throw new Refus('Membre introuvable.', 404);
      if (TRESORERIE.includes(data.role) && !tresorerie) {
        throw new Refus('Seuls le trésorier et le contrôleur peuvent modifier un membre de la trésorerie.', 403);
      }
      return data;
    };

    // 2. Actions
    if (action === 'creer') {
      const prenom = texte(corps.prenom, 60);
      const nom = texte(corps.nom, 60);
      if (!prenom || !nom) throw new Refus('Le prénom et le nom sont obligatoires.');
      const tel = normaliserTelephone(corps.telephone);
      const role = lireRole(corps.role);
      await verifierNumeroLibre(admin, tel);

      const code = nouveauCode();
      const userId = await creerCompte(admin, tel, prenom, nom, code);
      const { data, error } = await admin.from('membres').insert({
        prenom, nom, telephone: tel, role, user_id: userId,
        quartier: texte(corps.quartier), commission: texte(corps.commission),
        telephone_visible: corps.telephone_visible === true,
      }).select(COLONNES).single<FicheMembre>();
      if (error) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
        throw error;
      }
      return repondre({ membre: versClient(data), code });
    }

    if (action === 'modifier') {
      const cible = await chargerCible();
      const prenom = texte(corps.prenom, 60);
      const nom = texte(corps.nom, 60);
      if (!prenom || !nom) throw new Refus('Le prénom et le nom sont obligatoires.');
      const tel = normaliserTelephone(corps.telephone);
      const role = cible.id === moi.id ? cible.role : lireRole(corps.role);
      if (cible.id === moi.id && corps.role && corps.role !== cible.role) {
        throw new Refus('Vous ne pouvez pas changer votre propre rôle. Demandez à un autre membre du bureau.', 403);
      }

      if (tel !== cible.telephone) {
        await verifierNumeroLibre(admin, tel, cible.id);
        if (cible.user_id) {
          const { error } = await admin.auth.admin.updateUserById(cible.user_id, { email: email(tel), email_confirm: true });
          if (error) throw new Refus(/already|exists|registered/i.test(error.message) ? 'Ce numéro est déjà utilisé par un autre compte.' : error.message);
        }
      }
      const { data, error } = await admin.from('membres').update({
        prenom, nom, telephone: tel, role, quartier: texte(corps.quartier), commission: texte(corps.commission),
      }).eq('id', cible.id).select(COLONNES).single<FicheMembre>();
      if (error) throw error;
      return repondre({ membre: versClient(data) });
    }

    if (action === 'nouveau_code') {
      const cible = await chargerCible();
      if (!cible.actif) throw new Refus("Ce membre est désactivé. Réactivez-le d'abord.");
      if (!cible.telephone) throw new Refus("Ajoutez d'abord un numéro de téléphone à ce membre.");
      const code = nouveauCode();
      if (cible.user_id) {
        const { error } = await admin.auth.admin.updateUserById(cible.user_id, { password: code });
        if (error) throw error;
      } else {
        const userId = await creerCompte(admin, cible.telephone, cible.prenom, cible.nom, code);
        const { error } = await admin.from('membres').update({ user_id: userId }).eq('id', cible.id);
        if (error) throw error;
      }
      return repondre({ code });
    }

    if (action === 'activer') {
      const cible = await chargerCible();
      const actif = corps.actif === true;
      if (cible.id === moi.id && !actif) throw new Refus('Vous ne pouvez pas désactiver votre propre compte.', 403);
      if (cible.user_id) {
        const { error } = await admin.auth.admin.updateUserById(cible.user_id, { ban_duration: actif ? 'none' : BANNI });
        if (error) throw error;
      }
      const { data, error } = await admin.from('membres').update({ actif }).eq('id', cible.id).select(COLONNES).single<FicheMembre>();
      if (error) throw error;
      return repondre({ membre: versClient(data) });
    }

    throw new Refus('Action inconnue.');
  } catch (e) {
    if (e instanceof Refus) return repondre({ erreur: e.message }, e.statut);
    console.error(e);
    return repondre({ erreur: e instanceof Error ? e.message : 'Erreur inattendue' }, 500);
  }
});
