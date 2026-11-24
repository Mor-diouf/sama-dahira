import { useState } from 'react';
import { useMoi } from '../lib/auth';
import { estTresorerie } from '../lib/types';
import { EnTete } from '../components/ui';
import Tresorerie from './bureau/Tresorerie';
import GestionAnnonces from './bureau/GestionAnnonces';
import GestionEvenements from './bureau/GestionEvenements';
import GestionProjets from './bureau/GestionProjets';
import GestionContenus from './bureau/GestionContenus';
import GestionMembres from './bureau/GestionMembres';

type Onglet = 'cotisations' | 'annonces' | 'evenements' | 'projets' | 'contenus' | 'membres';

export default function Bureau() {
  const moi = useMoi();
  const tresorerie = estTresorerie(moi);
  const onglets: { id: Onglet; libelle: string }[] = [
    ...(tresorerie ? [{ id: 'cotisations' as const, libelle: 'Cotisations' }] : []),
    { id: 'annonces', libelle: 'Annonces' },
    { id: 'evenements', libelle: 'Événements' },
    { id: 'projets', libelle: 'Projets' },
    { id: 'contenus', libelle: 'Documents' },
    { id: 'membres', libelle: 'Membres' },
  ];
  const [onglet, setOnglet] = useState<Onglet>(onglets[0].id);

  return (
    <>
      <EnTete titre="Espace bureau" retour sousTitre={tresorerie ? 'Publication et trésorerie' : 'Publication des contenus'} />
      <div className="segments segments-grille">
        {onglets.map((o) => <button key={o.id} className={onglet === o.id ? 'actif' : ''} onClick={() => setOnglet(o.id)}>{o.libelle}</button>)}
      </div>
      <div className="mt16">
        {onglet === 'cotisations' && <Tresorerie />}
        {onglet === 'annonces' && <GestionAnnonces />}
        {onglet === 'evenements' && <GestionEvenements />}
        {onglet === 'projets' && <GestionProjets />}
        {onglet === 'contenus' && <GestionContenus tresorerie={tresorerie} />}
        {onglet === 'membres' && <GestionMembres />}
      </div>
    </>
  );
}
