import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '../lib/api';
import { useDonnees } from '../lib/hooks';
import { CarteAnnonce } from '../components/cartes';
import { EnTete, Erreur, Squelettes, Vide } from '../components/ui';

export default function Annonces() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.annonces());
  const [filtre, setFiltre] = useState<'toutes' | 'importantes'>('toutes');
  const liste = (donnees ?? []).filter((a) => filtre === 'toutes' || a.important);

  return (
    <>
      <EnTete titre="Annonces" retour sousTitre="Informations et actualités du Dahira" />
      <div className="segments">
        <button className={filtre === 'toutes' ? 'actif' : ''} onClick={() => setFiltre('toutes')}>Toutes</button>
        <button className={filtre === 'importantes' ? 'actif' : ''} onClick={() => setFiltre('importantes')}>Importantes</button>
      </div>
      <div className="pile mt16">
        {chargement ? <Squelettes n={3} hauteur={130} />
          : erreur ? <Erreur message={erreur} onReessayer={recharger} />
          : liste.length ? liste.map((a) => <CarteAnnonce key={a.id} a={a} apercu />)
          : <Vide icone={Megaphone} titre="Aucune annonce" texte="Les nouvelles du Dahira apparaîtront ici." />}
      </div>
    </>
  );
}
