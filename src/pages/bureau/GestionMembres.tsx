import { useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, Copy, KeyRound, MessageCircle, Save, Search, ShieldAlert, UserCheck, UserPlus, UserSearch, UserX } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth, useMoi } from '../../lib/auth';
import { useAction, useDonnees, useToast } from '../../lib/hooks';
import { initiales, sansAccents, telephoneLisible } from '../../lib/format';
import { LIBELLE_ROLE, peutGerer, rolesAttribuables, type FicheMembreSaisie, type Membre, type MembreGestion } from '../../lib/types';
import { DAHIRA } from '../../config';
import { Erreur, Feuille, Squelettes, Vide } from '../../components/ui';

type Filtre = 'actifs' | 'bureau' | 'inactifs';
interface CodeAffiche { membre: Membre; code: string; nouveau: boolean }

const VIDE: FicheMembreSaisie = { prenom: '', nom: '', telephone: '', quartier: '', commission: '', role: 'membre' };

function messageAcces(m: Membre, code: string) {
  return `Assalamou alaykoum ${m.prenom}. Voici votre accès à l'application du ${DAHIRA.nom} : ${window.location.origin}\n`
    + `Numéro : ${telephoneLisible(m.telephone)}\nCode : ${code}\nGardez ce code pour vous.`;
}

export default function GestionMembres() {
  const moi = useMoi();
  const { majMembre } = useAuth();
  const toast = useToast();
  const { donnees, chargement, erreur, recharger, setDonnees } = useDonnees(() => api.membresGestion());
  const { executer, enCours } = useAction();
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('actifs');
  const [ajout, setAjout] = useState(false);
  const [fiche, setFiche] = useState<MembreGestion | null>(null);
  const [code, setCode] = useState<CodeAffiche | null>(null);

  const tous = donnees ?? [];
  const compte = {
    actifs: tous.filter((m) => m.actif).length,
    bureau: tous.filter((m) => m.actif && m.role !== 'membre').length,
    inactifs: tous.filter((m) => !m.actif).length,
  };
  const liste = useMemo(() => {
    const t = sansAccents(q.trim());
    return (donnees ?? []).filter((m) =>
      (filtre === 'inactifs' ? !m.actif : m.actif && (filtre === 'actifs' || m.role !== 'membre')) &&
      (!t || sansAccents(`${m.prenom} ${m.nom} ${m.quartier ?? ''} ${m.commission ?? ''} ${m.telephone ?? ''}`).includes(t)));
  }, [donnees, q, filtre]);
  const suggestions = useMemo(() => ({
    quartiers: [...new Set(tous.map((m) => m.quartier).filter(Boolean))].sort() as string[],
    commissions: [...new Set(tous.map((m) => m.commission).filter(Boolean))].sort() as string[],
  }), [tous]);

  const remplacer = (m: MembreGestion) => {
    setDonnees((l) => (l ?? []).map((x) => (x.id === m.id ? m : x)));
    if (m.id === moi.id) majMembre(m);
  };

  async function creer(f: FicheMembreSaisie, telephone_visible: boolean) {
    await executer(async () => {
      const r = await api.creerMembre({ ...f, telephone_visible });
      setDonnees((l) => [...(l ?? []), r.membre].sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`)));
      setAjout(false);
      setCode({ membre: r.membre, code: r.code, nouveau: true });
    });
  }

  async function modifier(m: MembreGestion, f: FicheMembreSaisie) {
    await executer(async () => {
      remplacer(await api.modifierMembre(m.id, f));
      setFiche(null);
    }, 'Fiche enregistrée');
  }

  async function regenerer(m: MembreGestion) {
    const texte = m.a_un_compte
      ? `Créer un nouveau code pour ${m.prenom} ${m.nom} ? L'ancien code ne fonctionnera plus.`
      : `Créer le compte de connexion de ${m.prenom} ${m.nom} ?`;
    if (!confirm(texte)) return;
    await executer(async () => {
      const c = await api.nouveauCode(m.id);
      if (!m.a_un_compte) remplacer({ ...m, a_un_compte: true });
      setFiche(null);
      setCode({ membre: m, code: c, nouveau: !m.a_un_compte });
    });
  }

  async function basculer(m: MembreGestion) {
    const texte = m.actif
      ? `Désactiver ${m.prenom} ${m.nom} ? Il ou elle ne pourra plus se connecter et disparaîtra de l'annuaire. Son historique (cotisations, présences) est conservé.`
      : `Réactiver ${m.prenom} ${m.nom} ? Son ancien code fonctionnera de nouveau.`;
    if (!confirm(texte)) return;
    await executer(async () => {
      remplacer(await api.activerMembre(m.id, !m.actif));
      setFiche(null);
    }, m.actif ? 'Membre désactivé' : 'Membre réactivé');
  }

  async function copier(c: CodeAffiche) {
    try {
      await navigator.clipboard.writeText(messageAcces(c.membre, c.code));
      toast('Message copié');
    } catch {
      toast('Copie impossible : notez le code à la main.', true);
    }
  }

  return (
    <>
      <button className="btn btn-or btn-bloc" onClick={() => setAjout(true)}><UserPlus size={18} /> Ajouter un membre</button>

      <div className="recherche mt16">
        <Search size={18} />
        <input className="input" type="search" placeholder="Nom, quartier, numéro…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un membre" />
      </div>
      <div className="segments mt12">
        <button className={filtre === 'actifs' ? 'actif' : ''} onClick={() => setFiltre('actifs')}>Tous ({compte.actifs})</button>
        <button className={filtre === 'bureau' ? 'actif' : ''} onClick={() => setFiltre('bureau')}>Bureau ({compte.bureau})</button>
        <button className={filtre === 'inactifs' ? 'actif' : ''} onClick={() => setFiltre('inactifs')}>Désactivés ({compte.inactifs})</button>
      </div>

      <div className="mt16">
        {chargement ? <Squelettes n={5} hauteur={64} />
          : erreur ? <Erreur message={erreur} onReessayer={recharger} />
          : liste.length === 0 ? (
            <Vide icone={UserSearch} titre={q ? 'Aucun membre trouvé' : filtre === 'inactifs' ? 'Aucun membre désactivé' : 'Aucun membre'}
              texte={q ? 'Essayez un autre nom.' : filtre === 'inactifs' ? undefined : 'Ajoutez le premier membre avec le bouton ci-dessus.'} />
          ) : (
            <div className="liste-membres">
              {liste.map((m) => (
                <button key={m.id} className="ligne" onClick={() => setFiche(m)} aria-label={`Ouvrir la fiche de ${m.prenom} ${m.nom}`}>
                  <div className="avatar">{initiales(m.prenom, m.nom)}</div>
                  <div className="flex1">
                    <div className="gras tronque">{m.prenom} {m.nom}{m.id === moi.id && <span className="muted"> (vous)</span>}</div>
                    <div className="tres-petit muted tronque">{[telephoneLisible(m.telephone), m.quartier, m.commission].filter(Boolean).join(' · ') || '—'}</div>
                    {(m.role !== 'membre' || !m.a_un_compte) && (
                      <div className="badges" style={{ marginTop: 4 }}>
                        {m.role !== 'membre' && <span className="badge badge-or">{LIBELLE_ROLE[m.role]}</span>}
                        {!m.a_un_compte && <span className="badge badge-terre">Sans code</span>}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={18} className="chevron" />
                </button>
              ))}
            </div>
          )}
      </div>
      <p className="pied mt16">Seul le bureau voit cette liste. Les codes ne sont affichés qu'une fois, au moment où ils sont créés.</p>

      <datalist id="liste-quartiers">{suggestions.quartiers.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="liste-commissions">{suggestions.commissions.map((x) => <option key={x} value={x} />)}</datalist>

      <Feuille ouvert={ajout} titre="Nouveau membre" onFermer={() => setAjout(false)}>
        <FormulaireMembre moi={moi} initial={VIDE} enCours={enCours} creation onValider={creer} />
      </Feuille>

      <Feuille ouvert={!!fiche} titre="Fiche du membre" onFermer={() => setFiche(null)}>
        {fiche && (peutGerer(moi, fiche) ? (
          <>
            {!fiche.actif && <div className="encadre" style={{ marginBottom: 14 }}><UserX size={18} /> Ce membre est désactivé : il ne peut plus se connecter.</div>}
            <FormulaireMembre
              key={fiche.id}
              moi={moi}
              cible={fiche}
              enCours={enCours}
              initial={{ prenom: fiche.prenom, nom: fiche.nom, telephone: telephoneLisible(fiche.telephone), quartier: fiche.quartier ?? '', commission: fiche.commission ?? '', role: fiche.role }}
              onValider={(f) => modifier(fiche, f)}
            />
            <div className="separateur" />
            {fiche.actif && (
              <button className="btn btn-clair btn-bloc" disabled={enCours} onClick={() => regenerer(fiche)}>
                <KeyRound size={17} /> {fiche.a_un_compte ? 'Nouveau code' : 'Créer son code de connexion'}
              </button>
            )}
            {fiche.id !== moi.id && (
              <button className={`btn btn-bloc mt8 ${fiche.actif ? 'btn-danger' : 'btn-clair'}`} disabled={enCours} onClick={() => basculer(fiche)}>
                {fiche.actif ? <><UserX size={17} /> Désactiver ce membre</> : <><UserCheck size={17} /> Réactiver ce membre</>}
              </button>
            )}
          </>
        ) : (
          <div className="encadre"><ShieldAlert size={18} /> {fiche.prenom} {fiche.nom} fait partie de la trésorerie ({LIBELLE_ROLE[fiche.role]}). Seuls le trésorier et le contrôleur peuvent modifier sa fiche.</div>
        ))}
      </Feuille>

      <Feuille ouvert={!!code} titre={code?.nouveau ? 'Compte créé' : 'Nouveau code'} onFermer={() => setCode(null)}>
        {code && (
          <>
            <p className="muted petit">{code.membre.prenom} {code.membre.nom} · {telephoneLisible(code.membre.telephone)}</p>
            <div className="code-acces" aria-label={`Code : ${code.code.split('').join(' ')}`}>{code.code.slice(0, 3)} {code.code.slice(3)}</div>
            <div className="encadre" style={{ marginBottom: 16 }}>
              <ShieldAlert size={18} />
              <span>Ce code ne sera plus affiché. Envoyez-le maintenant, uniquement à cette personne. En cas d'oubli, créez un nouveau code depuis sa fiche.</span>
            </div>
            <a className="btn btn-or btn-bloc" href={`https://wa.me/${code.membre.telephone}?text=${encodeURIComponent(messageAcces(code.membre, code.code))}`} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Envoyer sur WhatsApp
            </a>
            <button className="btn btn-clair btn-bloc mt8" onClick={() => copier(code)}><Copy size={17} /> Copier le message</button>
          </>
        )}
      </Feuille>
    </>
  );
}

function FormulaireMembre({ moi, cible, initial, creation, enCours, onValider }: {
  moi: Membre;
  cible?: MembreGestion;
  initial: FicheMembreSaisie;
  creation?: boolean;
  enCours: boolean;
  onValider: (f: FicheMembreSaisie, telephoneVisible: boolean) => void;
}) {
  const [f, setF] = useState(initial);
  const [visible, setVisible] = useState(false);
  const champ = (k: keyof FicheMembreSaisie) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const moiMeme = cible?.id === moi.id;
  const roles = rolesAttribuables(moi);
  const options = roles.includes(f.role) ? roles : [f.role, ...roles];

  function valider(e: FormEvent) {
    e.preventDefault();
    onValider(f, visible);
  }

  return (
    <form onSubmit={valider}>
      <div className="deux-colonnes">
        <label className="champ"><span>Prénom</span><input className="input" value={f.prenom} onChange={champ('prenom')} autoComplete="off" required /></label>
        <label className="champ"><span>Nom</span><input className="input" value={f.nom} onChange={champ('nom')} autoComplete="off" required /></label>
      </div>
      <label className="champ">
        <span>Téléphone (sert à la connexion)</span>
        <input className="input" type="tel" inputMode="tel" placeholder="77 123 45 67" value={f.telephone} onChange={champ('telephone')} autoComplete="off" required />
      </label>
      <div className="deux-colonnes">
        <label className="champ"><span>Quartier</span><input className="input" list="liste-quartiers" value={f.quartier} onChange={champ('quartier')} autoComplete="off" /></label>
        <label className="champ"><span>Commission</span><input className="input" list="liste-commissions" value={f.commission} onChange={champ('commission')} autoComplete="off" /></label>
      </div>
      <label className="champ">
        <span>Rôle</span>
        <select className="select" value={f.role} onChange={(e) => setF((x) => ({ ...x, role: e.target.value as FicheMembreSaisie['role'] }))} disabled={moiMeme}>
          {options.map((r) => <option key={r} value={r}>{LIBELLE_ROLE[r]}</option>)}
        </select>
      </label>
      {moiMeme ? <p className="tres-petit muted" style={{ marginTop: -8, marginBottom: 14 }}>Vous ne pouvez pas changer votre propre rôle.</p>
        : roles.length === 2 && <p className="tres-petit muted" style={{ marginTop: -8, marginBottom: 14 }}>Les rôles Trésorier et Contrôleur sont attribués par la trésorerie.</p>}
      {creation && (
        <label className="case">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          <span className="petit">Le membre accepte que son numéro soit visible dans l'annuaire</span>
        </label>
      )}
      <button className="btn btn-or btn-bloc" disabled={enCours}>
        {creation ? <><UserPlus size={18} /> Créer le membre et son code</> : <><Save size={17} /> Enregistrer</>}
      </button>
    </form>
  );
}
