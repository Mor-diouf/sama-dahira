import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import photoMosquee from '../assets/grande-mosquee.jpg';
import { Logo } from '../components/Mosquee';
import { Archive, CalendarX2, FileText, Megaphone, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useMoi } from '../lib/auth';
import { useDonnees } from '../lib/hooks';
import { DAHIRA } from '../config';
import { CarteAnnonce, CarteEvenement, CarteProjet } from '../components/cartes';
import { Squelettes, Vide } from '../components/ui';

function salutation() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonne matinée';
  if (h < 18) return 'Bon après-midi';
  return 'Bonne soirée';
}

export default function Accueil() {
  const moi = useMoi();
  const { donnees, chargement } = useDonnees(async () => {
    const [evenements, annonces, projets] = await Promise.all([api.evenements(), api.annonces(2), api.projets()]);
    return {
      prochains: evenements.filter((e) => new Date(e.debut).getTime() > Date.now() - 3 * 3600 * 1000).slice(0, 3),
      annonces,
      une: projets.find((p) => p.a_la_une) ?? projets.find((p) => p.statut === 'en_cours'),
    };
  });

  return (
    <>
      <header className="entete heros photo-mosquee" style={{ '--photo': `url(${photoMosquee})` } as CSSProperties}>
        <p className="bismillah" lang="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <div className="heros-salut">
          <div>
            <small>Assalamou alaykoum · {salutation()}</small>
            <h2>{moi.prenom} {moi.nom}</h2>
            <p className="entete-sous" style={{ marginTop: 2 }}>{DAHIRA.nom} · {DAHIRA.ville}</p>
          </div>
          <Logo taille={58} />
        </div>
        <div className="heros-espace" role="img" aria-label="Grande Mosquée de Touba" />
      </header>

      <nav className="raccourcis" aria-label="Raccourcis">
        <Link to="/membres" className="raccourci"><span className="raccourci-icone"><Users size={20} /></span>Membres</Link>
        <Link to="/annonces" className="raccourci"><span className="raccourci-icone"><Megaphone size={20} /></span>Annonces</Link>
        <Link to="/archives" className="raccourci"><span className="raccourci-icone"><Archive size={20} /></span>Archives</Link>
        <Link to="/documents" className="raccourci"><span className="raccourci-icone"><FileText size={20} /></span>Documents</Link>
      </nav>

      <section className="section">
        <div className="section-titre"><h3>Prochaines dates</h3><Link to="/calendrier">Calendrier</Link></div>
        {chargement ? <Squelettes n={2} /> : donnees?.prochains.length ? (
          <div className="pile">{donnees.prochains.map((e) => <Link key={e.id} to="/calendrier" className="carte-cliquable"><CarteEvenement e={e} /></Link>)}</div>
        ) : <div className="carte"><Vide icone={CalendarX2} titre="Aucun événement prévu" /></div>}
      </section>

      {donnees?.une && (
        <section className="section">
          <Link to="/projets" className="carte-cliquable"><CarteProjet p={donnees.une} une /></Link>
        </section>
      )}

      <section className="section">
        <div className="section-titre"><h3>Dernières annonces</h3><Link to="/annonces">Tout voir</Link></div>
        {chargement ? <Squelettes n={2} hauteur={120} /> : donnees?.annonces.length ? (
          <div className="pile">{donnees.annonces.map((a) => <CarteAnnonce key={a.id} a={a} apercu />)}</div>
        ) : <div className="carte"><Vide icone={Megaphone} titre="Aucune annonce" /></div>}
      </section>

      <div className="ornement" aria-hidden="true">✦</div>
      <p className="pied">Que la paix soit sur le Dahira</p>
    </>
  );
}
