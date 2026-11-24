import { useMemo, useState } from 'react';
import { MessageCircle, Phone, Search, UserSearch } from 'lucide-react';
import { api } from '../lib/api';
import { useDonnees } from '../lib/hooks';
import { initiales, sansAccents, telephoneLisible } from '../lib/format';
import { LIBELLE_ROLE, type Membre } from '../lib/types';
import { EnTete, Erreur, Squelettes, Vide } from '../components/ui';

export default function Membres() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.annuaire());
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState<'tous' | 'bureau'>('tous');

  const groupes = useMemo(() => {
    const t = sansAccents(q.trim());
    const liste = (donnees ?? []).filter((m) =>
      (filtre === 'tous' || m.role !== 'membre') &&
      (!t || sansAccents(`${m.prenom} ${m.nom} ${m.quartier ?? ''} ${m.commission ?? ''}`).includes(t)));
    const g = new Map<string, Membre[]>();
    for (const m of liste) {
      const l = sansAccents(m.prenom[0] ?? '#').toUpperCase();
      g.set(l, [...(g.get(l) ?? []), m]);
    }
    return { total: liste.length, groupes: [...g.entries()] };
  }, [donnees, q, filtre]);

  return (
    <>
      <EnTete titre="Membres" retour sousTitre={donnees ? `${donnees.length} membres dans le Dahira` : 'Annuaire du Dahira'} />
      <div className="recherche">
        <Search size={18} />
        <input className="input" type="search" placeholder="Rechercher un nom, un quartier…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un membre" />
      </div>
      <div className="segments mt12">
        <button className={filtre === 'tous' ? 'actif' : ''} onClick={() => setFiltre('tous')}>Tous</button>
        <button className={filtre === 'bureau' ? 'actif' : ''} onClick={() => setFiltre('bureau')}>Bureau</button>
      </div>

      {chargement ? <div className="mt16"><Squelettes n={6} hauteur={64} /></div>
        : erreur ? <Erreur message={erreur} onReessayer={recharger} />
        : groupes.total === 0 ? <Vide icone={UserSearch} titre="Aucun membre trouvé" texte="Essayez un autre nom." />
        : groupes.groupes.map(([lettre, liste]) => (
          <section key={lettre}>
            <h4 className="lettre-groupe">{lettre}</h4>
            <div className="liste-membres">
              {liste.map((m) => (
                <div key={m.id} className="ligne">
                  <div className="avatar">{initiales(m.prenom, m.nom)}</div>
                  <div className="flex1">
                    <div className="gras tronque">{m.prenom} {m.nom}</div>
                    <div className="tres-petit muted tronque">
                      {[m.quartier, m.commission].filter(Boolean).join(' · ') || '—'}
                    </div>
                    {(m.role !== 'membre' || m.telephone) && (
                      <div className="badges" style={{ marginTop: 4 }}>
                        {m.role !== 'membre' && <span className="badge badge-or">{LIBELLE_ROLE[m.role]}</span>}
                        {m.telephone && <span className="tres-petit muted">{telephoneLisible(m.telephone)}</span>}
                      </div>
                    )}
                  </div>
                  {m.telephone && (
                    <div className="membre-actions">
                      <a href={`tel:+${m.telephone}`} aria-label={`Appeler ${m.prenom}`}><Phone size={17} /></a>
                      <a href={`https://wa.me/${m.telephone}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${m.prenom}`}><MessageCircle size={17} /></a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      <p className="pied mt16">Seuls les numéros des membres qui ont donné leur accord sont affichés.</p>
    </>
  );
}
