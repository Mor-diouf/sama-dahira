import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CircleCheck, CircleX, Hourglass, RefreshCw, X, type LucideIcon } from 'lucide-react';
import { jourDuMois, moisCourt, pourcentage } from '../lib/format';
import { LIBELLE_STATUT_COTI, type StatutCotisation } from '../lib/types';

export function EnTete({ titre, sousTitre, retour, droite }: { titre: string; sousTitre?: string; retour?: boolean; droite?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="entete">
      <div className="entete-barre">
        {retour && (
          <button className="bouton-icone" onClick={() => nav(-1)} aria-label="Retour">
            <ChevronLeft size={22} />
          </button>
        )}
        <h1>{titre}</h1>
        {droite}
      </div>
      {sousTitre && <p className="entete-sous">{sousTitre}</p>}
    </header>
  );
}

export function Feuille({ ouvert, titre, onFermer, children }: { ouvert: boolean; titre: string; onFermer: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    document.addEventListener('keydown', echap);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', echap);
      document.body.style.overflow = '';
    };
  }, [ouvert, onFermer]);
  if (!ouvert) return null;
  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <div className="feuille-poignee" />
        <div className="feuille-titre">
          <h3>{titre}</h3>
          <button onClick={onFermer} aria-label="Fermer"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Vide({ icone: Icone, titre, texte }: { icone: LucideIcon; titre: string; texte?: string }) {
  return (
    <div className="vide">
      <Icone size={40} strokeWidth={1.5} />
      <h4>{titre}</h4>
      {texte && <p className="petit">{texte}</p>}
    </div>
  );
}

export function Squelettes({ n = 3, hauteur }: { n?: number; hauteur?: number }) {
  return (
    <div aria-busy="true" aria-label="Chargement">
      {Array.from({ length: n }, (_, i) => <div key={i} className="squelette" style={hauteur ? { height: hauteur } : undefined} />)}
    </div>
  );
}

export function Erreur({ message, onReessayer }: { message: string; onReessayer: () => void }) {
  return (
    <div className="vide">
      <CircleX size={40} strokeWidth={1.5} />
      <h4>Impossible de charger</h4>
      <p className="petit">{message}</p>
      <button className="btn btn-clair btn-petit mt12" onClick={onReessayer}><RefreshCw size={16} /> Réessayer</button>
    </div>
  );
}

export function Barre({ part, total }: { part: number; total: number }) {
  const p = pourcentage(part, total);
  return (
    <div className="barre" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${p}%` }} />
    </div>
  );
}

export function DatePastille({ iso, passee }: { iso: string; passee?: boolean }) {
  return (
    <div className={`date-pastille${passee ? ' passee' : ''}`}>
      <div className="jour">{jourDuMois(iso)}</div>
      <div className="mois">{moisCourt(iso)}</div>
    </div>
  );
}

export function BadgeStatut({ statut }: { statut: StatutCotisation }) {
  const map = {
    en_attente: { c: 'badge-or', I: Hourglass },
    confirme: { c: 'badge-vert', I: CircleCheck },
    rejete: { c: 'badge-terre', I: CircleX },
  }[statut];
  return <span className={`badge ${map.c}`}><map.I size={12} /> {LIBELLE_STATUT_COTI[statut]}</span>;
}
