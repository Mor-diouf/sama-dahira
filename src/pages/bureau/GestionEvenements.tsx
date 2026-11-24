import { useState, type FormEvent } from 'react';
import { CalendarPlus, CalendarX2, Trash2, Users } from 'lucide-react';
import { api, AVEC_REPONSE } from '../../lib/api';
import { useAction, useDonnees } from '../../lib/hooks';
import { dateCourte, heure } from '../../lib/format';
import { LIBELLE_TYPE_EVT, type Evenement, type TypeEvenement } from '../../lib/types';
import { Erreur, Feuille, Squelettes, Vide } from '../../components/ui';

export default function GestionEvenements() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.evenements());
  const { executer, enCours } = useAction();
  const [titre, setTitre] = useState('');
  const [type, setType] = useState<TypeEvenement>('reunion');
  const [debut, setDebut] = useState('');
  const [lieu, setLieu] = useState('');
  const [description, setDescription] = useState('');
  const [presences, setPresences] = useState<{ evt: Evenement; liste: { nom: string; reponse: boolean }[] } | null>(null);

  async function creer(e: FormEvent) {
    e.preventDefault();
    const ok = await executer(() => api.creerEvenement({ titre: titre.trim(), type, debut: new Date(debut).toISOString(), lieu: lieu.trim(), description: description.trim() }), 'Événement ajouté au calendrier');
    if (ok) { setTitre(''); setDebut(''); setLieu(''); setDescription(''); recharger(); }
  }

  async function supprimer(id: string) {
    if (confirm('Supprimer cet événement ?') && await executer(() => api.supprimerEvenement(id), 'Événement supprimé')) recharger();
  }

  async function voirPresences(evt: Evenement) {
    await executer(async () => setPresences({ evt, liste: await api.presencesEvenement(evt.id) }));
  }

  const aVenir = (donnees ?? []).filter((e) => new Date(e.debut).getTime() > Date.now() - 86400000);

  return (
    <>
      <form className="carte" onSubmit={creer}>
        <h3 className="gras" style={{ marginBottom: 12 }}>Nouvel événement</h3>
        <label className="champ"><span>Titre</span><input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} required /></label>
        <div className="deux-colonnes">
          <label className="champ">
            <span>Type</span>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as TypeEvenement)}>
              {(Object.keys(LIBELLE_TYPE_EVT) as TypeEvenement[]).map((t) => <option key={t} value={t}>{LIBELLE_TYPE_EVT[t]}</option>)}
            </select>
          </label>
          <label className="champ"><span>Date et heure</span><input className="input" type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} required /></label>
        </div>
        <label className="champ"><span>Lieu</span><input className="input" value={lieu} onChange={(e) => setLieu(e.target.value)} /></label>
        <label className="champ"><span>Description</span><textarea className="textarea" style={{ minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        {AVEC_REPONSE.includes(type) && <p className="tres-petit muted" style={{ marginBottom: 12 }}>Les membres pourront répondre « Je viens / Je ne viens pas ».</p>}
        <button className="btn btn-bloc" disabled={enCours}><CalendarPlus size={17} /> Ajouter au calendrier</button>
      </form>

      <div className="section-titre" style={{ marginTop: 22 }}><h3>À venir</h3></div>
      {chargement ? <Squelettes n={2} /> : erreur ? <Erreur message={erreur} onReessayer={recharger} />
        : aVenir.length ? (
          <div className="menu-liste">
            {aVenir.map((e) => (
              <div key={e.id} className="ligne" style={{ padding: '12px 14px', borderBottom: '1px solid var(--bordure)' }}>
                <div className="flex1">
                  <div className="gras tronque">{e.titre}</div>
                  <div className="tres-petit muted">{LIBELLE_TYPE_EVT[e.type]} · {dateCourte(e.debut)} à {heure(e.debut)}</div>
                </div>
                {AVEC_REPONSE.includes(e.type) && (
                  <button className="btn btn-clair btn-petit" onClick={() => voirPresences(e)} aria-label="Voir les présences"><Users size={15} /> {e.nb_oui}</button>
                )}
                <button className="btn btn-danger btn-petit" onClick={() => supprimer(e.id)} aria-label="Supprimer"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        ) : <Vide icone={CalendarX2} titre="Aucun événement à venir" />}

      <Feuille ouvert={!!presences} titre="Réponses" onFermer={() => setPresences(null)}>
        {presences && (
          <>
            <p className="muted petit" style={{ marginBottom: 12 }}>{presences.evt.titre} · {dateCourte(presences.evt.debut)}</p>
            {(['oui', 'non'] as const).map((r) => {
              const l = presences.liste.filter((p) => p.reponse === (r === 'oui'));
              return (
                <div key={r} style={{ marginBottom: 16 }}>
                  <h4 className="gras" style={{ marginBottom: 6 }}>{r === 'oui' ? `Viennent (${l.length})` : `Ne viennent pas (${l.length})`}</h4>
                  <p className="petit muted">{l.length ? l.map((p) => p.nom).join(', ') : '—'}</p>
                </div>
              );
            })}
          </>
        )}
      </Feuille>
    </>
  );
}
