import { useState } from 'react';
import { BookOpen, ExternalLink, FileText, Image, NotebookPen } from 'lucide-react';
import { api } from '../lib/api';
import { useDonnees } from '../lib/hooks';
import { dateCourte } from '../lib/format';
import { LIBELLE_TYPE_DOC, type TypeDocument } from '../lib/types';
import { EnTete, Erreur, Squelettes, Vide } from '../components/ui';

const ICONES = { reglement: BookOpen, compte_rendu: NotebookPen, affiche: Image, autre: FileText };
const FILTRES: (TypeDocument | 'tous')[] = ['tous', 'reglement', 'compte_rendu', 'affiche'];

export default function Documents() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.documents());
  const [filtre, setFiltre] = useState<TypeDocument | 'tous'>('tous');
  const liste = (donnees ?? []).filter((d) => filtre === 'tous' || d.type === filtre);

  return (
    <>
      <EnTete titre="Documents" retour sousTitre="Règlement, comptes rendus et affiches" />
      <div className="segments">
        {FILTRES.map((f) => <button key={f} className={filtre === f ? 'actif' : ''} onClick={() => setFiltre(f)}>{f === 'tous' ? 'Tous' : LIBELLE_TYPE_DOC[f]}</button>)}
      </div>
      <div className="menu-liste mt16">
        {chargement ? <div style={{ padding: 12 }}><Squelettes n={3} hauteur={52} /></div>
          : erreur ? <Erreur message={erreur} onReessayer={recharger} />
          : liste.length ? liste.map((d) => {
            const Icone = ICONES[d.type];
            return (
              <a key={d.id} href={d.lien} target="_blank" rel="noreferrer">
                <span className="raccourci-icone"><Icone size={18} /></span>
                <span className="flex1">
                  {d.titre}
                  <small>{LIBELLE_TYPE_DOC[d.type]}{d.date_doc ? ` · ${dateCourte(d.date_doc)}` : ''}</small>
                </span>
                <ExternalLink size={16} className="chevron" />
              </a>
            );
          }) : <Vide icone={FileText} titre="Aucun document" />}
      </div>
    </>
  );
}
