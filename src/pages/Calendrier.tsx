import { useMemo, useState } from 'react';
import { CalendarX2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAction, useDonnees } from '../lib/hooks';
import { memeJour } from '../lib/format';
import { LIBELLE_TYPE_EVT, type Evenement, type TypeEvenement } from '../lib/types';
import { CarteEvenement } from '../components/cartes';
import { EnTete, Erreur, Squelettes, Vide } from '../components/ui';

const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const TYPES: TypeEvenement[] = ['reunion', 'religieux', 'collecte', 'sortie'];

export default function Calendrier() {
  const { donnees, chargement, erreur, recharger, setDonnees } = useDonnees(() => api.evenements());
  const { executer } = useAction();
  const [vue, setVue] = useState<'liste' | 'mois'>('liste');
  const [mois, setMois] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [jour, setJour] = useState<Date>(() => new Date());

  async function repondre(e: Evenement, oui: boolean) {
    const avant = donnees;
    // Mise à jour immédiate de l'écran, puis enregistrement
    setDonnees((d) => d?.map((x) => {
      if (x.id !== e.id) return x;
      const nb_oui = x.nb_oui - (x.ma_reponse === true ? 1 : 0) + (oui ? 1 : 0);
      const nb_non = x.nb_non - (x.ma_reponse === false ? 1 : 0) + (oui ? 0 : 1);
      return { ...x, ma_reponse: oui, nb_oui, nb_non };
    }) ?? null);
    const reussi = await executer(() => api.repondrePresence(e.id, oui), oui ? 'Présence confirmée, à bientôt !' : 'Absence notée, merci.');
    if (!reussi) setDonnees(avant);
  }

  const aVenir = useMemo(() => (donnees ?? []).filter((e) => new Date(e.debut).getTime() > Date.now() - 3 * 3600 * 1000), [donnees]);

  const cases = useMemo(() => {
    const debut = new Date(mois);
    debut.setDate(1 - ((mois.getDay() + 6) % 7)); // lundi précédent
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(debut);
      d.setDate(debut.getDate() + i);
      return { d, evts: (donnees ?? []).filter((e) => memeJour(new Date(e.debut), d)) };
    });
  }, [mois, donnees]);
  const evtsDuJour = (donnees ?? []).filter((e) => memeJour(new Date(e.debut), jour));

  return (
    <>
      <EnTete titre="Calendrier" sousTitre="Réunions, événements religieux, collectes et sorties" />
      <div className="segments">
        <button className={vue === 'liste' ? 'actif' : ''} onClick={() => setVue('liste')}>À venir</button>
        <button className={vue === 'mois' ? 'actif' : ''} onClick={() => setVue('mois')}>Vue du mois</button>
      </div>

      {chargement ? <div className="mt16"><Squelettes n={3} hauteur={140} /></div>
        : erreur ? <Erreur message={erreur} onReessayer={recharger} />
        : vue === 'liste' ? (
          <div className="pile mt16">
            {aVenir.length ? aVenir.map((e) => <CarteEvenement key={e.id} e={e} detail onRepondre={(oui) => repondre(e, oui)} />)
              : <Vide icone={CalendarX2} titre="Aucun événement à venir" />}
          </div>
        ) : (
          <>
            <div className="carte mt16">
              <div className="mois-entete">
                <button onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} aria-label="Mois précédent"><ChevronLeft size={18} /></button>
                <h4>{mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} aria-label="Mois suivant"><ChevronRight size={18} /></button>
              </div>
              <div className="grille-mois">
                {JOURS.map((j) => <div key={j} className="jsem">{j}</div>)}
                {cases.map(({ d, evts }) => {
                  const classes = [
                    d.getMonth() !== mois.getMonth() && 'hors',
                    memeJour(d, new Date()) && 'aujourdhui',
                    memeJour(d, jour) && 'choisi',
                  ].filter(Boolean).join(' ');
                  return (
                    <button key={d.toISOString()} className={classes} onClick={() => setJour(d)} aria-label={d.toLocaleDateString('fr-FR')}>
                      {d.getDate()}
                      <span className="points">{evts.slice(0, 3).map((e) => <i key={e.id} className={`type-${e.type}`} />)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="legende">
                {TYPES.map((t) => <span key={t}><i className={`type-${t}`} />{LIBELLE_TYPE_EVT[t]}</span>)}
              </div>
            </div>
            <div className="section-titre mt16" style={{ marginTop: 20 }}>
              <h3 style={{ textTransform: 'capitalize' }}>{jour.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            </div>
            <div className="pile">
              {evtsDuJour.length ? evtsDuJour.map((e) => <CarteEvenement key={e.id} e={e} detail onRepondre={(oui) => repondre(e, oui)} />)
                : <p className="muted petit">Aucun événement ce jour-là.</p>}
            </div>
          </>
        )}
    </>
  );
}
