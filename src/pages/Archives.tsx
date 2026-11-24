import { Archive as IconeArchive, FileText, Images } from 'lucide-react';
import { api } from '../lib/api';
import { useDonnees } from '../lib/hooks';
import type { Archive } from '../lib/types';
import { EnTete, Erreur, Squelettes, Vide } from '../components/ui';

export default function Archives() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.archives());
  const parAnnee = new Map<number, Archive[]>();
  for (const a of donnees ?? []) parAnnee.set(a.annee, [...(parAnnee.get(a.annee) ?? []), a]);

  return (
    <>
      <EnTete titre="Archives" retour sousTitre="La mémoire du Dahira : événements, photos, comptes rendus" />
      {chargement ? <Squelettes n={3} hauteur={120} />
        : erreur ? <Erreur message={erreur} onReessayer={recharger} />
        : !donnees?.length ? <Vide icone={IconeArchive} titre="Aucune archive" />
        : [...parAnnee.entries()].map(([annee, liste]) => (
          <section key={annee} className="section">
            <div className="section-titre"><h3>{annee}</h3><span className="tres-petit muted">{liste.length} événement{liste.length > 1 ? 's' : ''}</span></div>
            <div className="pile">
              {liste.map((a) => (
                <article key={a.id} className="carte">
                  <h4 className="gras">{a.titre}</h4>
                  {a.resume && <p className="muted petit mt8">{a.resume}</p>}
                  {(a.lien_photos || a.lien_compte_rendu) && (
                    <div className="ligne mt12" style={{ gap: 8 }}>
                      {a.lien_photos && <a className="btn btn-clair btn-petit" href={a.lien_photos} target="_blank" rel="noreferrer"><Images size={16} /> Photos</a>}
                      {a.lien_compte_rendu && <a className="btn btn-clair btn-petit" href={a.lien_compte_rendu} target="_blank" rel="noreferrer"><FileText size={16} /> Compte rendu</a>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
