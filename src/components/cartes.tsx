import { useState } from 'react';
import { Check, Clock, MapPin, Megaphone, Star, User, X } from 'lucide-react';
import type { Annonce, Evenement, Projet } from '../lib/types';
import { LIBELLE_STATUT_PROJET, LIBELLE_TYPE_EVT } from '../lib/types';
import { AVEC_REPONSE } from '../lib/api';
import { dateLongue, fcfa, heure, pourcentage, relatif } from '../lib/format';
import { Barre, DatePastille } from './ui';
import { Mosquee } from './Mosquee';

const CLASSE_TYPE = { reunion: 'badge-vert', religieux: 'badge-or', collecte: 'badge-terre', sortie: 'badge-bleu' } as const;

export function CarteEvenement({ e, onRepondre, detail }: { e: Evenement; onRepondre?: (oui: boolean) => void; detail?: boolean }) {
  const passe = new Date(e.debut).getTime() < Date.now() - 3 * 3600 * 1000;
  const avecReponse = AVEC_REPONSE.includes(e.type);
  return (
    <article className="carte">
      <div className="ligne ligne-haut">
        <DatePastille iso={e.debut} passee={passe} />
        <div className="flex1">
          <div className="badges">
            <span className={`badge ${CLASSE_TYPE[e.type]}`}>{LIBELLE_TYPE_EVT[e.type]}</span>
            {!passe && <span className="badge">{relatif(e.debut)}</span>}
          </div>
          <h4 className="gras" style={{ marginTop: 6, fontSize: '1.02rem' }}>{e.titre}</h4>
          <p className="muted petit" style={{ marginTop: 2 }}>
            <Clock size={13} style={{ verticalAlign: -2 }} /> {detail ? `${dateLongue(e.debut)} à ` : ''}{heure(e.debut)}
            {e.lieu && <> · <MapPin size={13} style={{ verticalAlign: -2 }} /> {e.lieu}</>}
          </p>
        </div>
      </div>
      {detail && e.description && <p className="muted petit mt12">{e.description}</p>}
      {avecReponse && (
        <>
          {onRepondre && !passe && (
            <div className="rsvp">
              <button className={`oui${e.ma_reponse === true ? ' actif' : ''}`} onClick={() => onRepondre(true)} aria-pressed={e.ma_reponse === true}>
                <Check size={16} /> Je viens
              </button>
              <button className={`non${e.ma_reponse === false ? ' actif' : ''}`} onClick={() => onRepondre(false)} aria-pressed={e.ma_reponse === false}>
                <X size={16} /> Je ne viens pas
              </button>
            </div>
          )}
          <p className="tres-petit muted" style={{ marginTop: 8 }}>
            {e.nb_oui} {e.nb_oui > 1 ? 'personnes viennent' : 'personne vient'} · {e.nb_non} {e.nb_non > 1 ? 'absents' : 'absent'}
          </p>
        </>
      )}
    </article>
  );
}

export function CarteAnnonce({ a, apercu }: { a: Annonce; apercu?: boolean }) {
  const [ouverte, setOuverte] = useState(!apercu);
  const longue = a.texte.length > 160;
  return (
    <article className={`carte annonce${a.important ? ' annonce-importante' : ''}${!ouverte && longue ? ' repliee' : ''}`}>
      <div className="ligne-entre">
        <div className="badges">
          {a.important ? <span className="badge badge-or"><Star size={12} /> Important</span> : <span className="badge"><Megaphone size={12} /> Annonce</span>}
        </div>
        <span className="tres-petit muted">{relatif(a.publie_le)}</span>
      </div>
      <h4>{a.titre}</h4>
      <p className="petit">{a.texte}</p>
      <div className="ligne-entre mt8">
        {a.auteur_nom ? <span className="tres-petit muted"><User size={12} style={{ verticalAlign: -2 }} /> {a.auteur_nom}</span> : <span />}
        {longue && <button className="lien" onClick={() => setOuverte(!ouverte)}>{ouverte ? 'Réduire' : 'Lire la suite'}</button>}
      </div>
    </article>
  );
}

export function CarteProjet({ p, une }: { p: Projet; une?: boolean }) {
  const reste = p.montant_collecte - p.montant_depense;
  const classeStatut = p.statut === 'en_cours' ? 'badge-vert' : p.statut === 'termine' ? 'badge-bleu' : 'badge-or';
  return (
    <article className={`carte projet${une ? ' projet-une' : ''}`}>
      {une && <Mosquee className="projet-une-deco" />}
      <div className="badges">
        {une ? <span className="badge"><Star size={12} /> Projet à la une</span> : <span className={`badge ${classeStatut}`}>{LIBELLE_STATUT_PROJET[p.statut]}</span>}
      </div>
      <h4 style={{ marginTop: 8 }}>{p.nom}</h4>
      {p.description && <p className="muted petit" style={{ marginTop: 4 }}>{p.description}</p>}
      {p.objectif > 0 && (
        <>
          <Barre part={p.montant_collecte} total={p.objectif} />
          <div className="ligne-entre petit">
            <span><b>{fcfa(p.montant_collecte)}</b> <span className="muted">sur {fcfa(p.objectif)}</span></span>
            <b>{pourcentage(p.montant_collecte, p.objectif)} %</b>
          </div>
        </>
      )}
      {!une && (
        <div className="chiffres">
          <div className="chiffre"><span>Collecté</span><b>{fcfa(p.montant_collecte)}</b></div>
          <div className="chiffre"><span>Dépensé</span><b>{fcfa(p.montant_depense)}</b></div>
          <div className="chiffre"><span>En caisse</span><b>{fcfa(reste)}</b></div>
        </div>
      )}
      {!une && p.responsable && <p className="tres-petit muted mt12"><User size={12} style={{ verticalAlign: -2 }} /> Responsable : {p.responsable}</p>}
    </article>
  );
}
