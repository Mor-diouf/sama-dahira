import { useState } from 'react';
import { Sprout } from 'lucide-react';
import { api } from '../lib/api';
import { useDonnees } from '../lib/hooks';
import { fcfa } from '../lib/format';
import type { StatutProjet } from '../lib/types';
import { CarteProjet } from '../components/cartes';
import { EnTete, Erreur, Squelettes, Vide } from '../components/ui';

const FILTRES: { id: StatutProjet | 'tous'; libelle: string }[] = [
  { id: 'tous', libelle: 'Tous' },
  { id: 'en_cours', libelle: 'En cours' },
  { id: 'idee', libelle: 'Idées' },
  { id: 'termine', libelle: 'Terminés' },
];

export default function Projets() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.projets());
  const [filtre, setFiltre] = useState<StatutProjet | 'tous'>('tous');
  const liste = (donnees ?? []).filter((p) => filtre === 'tous' || p.statut === filtre);
  const collecte = (donnees ?? []).reduce((s, p) => s + p.montant_collecte, 0);
  const depense = (donnees ?? []).reduce((s, p) => s + p.montant_depense, 0);

  return (
    <>
      <EnTete titre="Projets" sousTitre="Avancement et transparence des comptes" />
      {donnees && (
        <div className="stats">
          <div className="stat"><span>Total collecté</span><b>{fcfa(collecte)}</b></div>
          <div className="stat"><span>Total dépensé</span><b>{fcfa(depense)}</b></div>
        </div>
      )}
      <div className="segments mt16">
        {FILTRES.map((f) => <button key={f.id} className={filtre === f.id ? 'actif' : ''} onClick={() => setFiltre(f.id)}>{f.libelle}</button>)}
      </div>
      <div className="pile mt16">
        {chargement ? <Squelettes n={3} hauteur={200} />
          : erreur ? <Erreur message={erreur} onReessayer={recharger} />
          : liste.length ? liste.map((p) => <CarteProjet key={p.id} p={p} />)
          : <Vide icone={Sprout} titre="Aucun projet" />}
      </div>
      <p className="pied mt16">Le montant collecté ne compte que les cotisations confirmées par le trésorier.</p>
    </>
  );
}
