import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ChevronRight, Download, FileText, LogOut, Megaphone, ShieldCheck, Users } from 'lucide-react';
import { useAuth, useMoi } from '../lib/auth';
import { api } from '../lib/api';
import { useAction } from '../lib/hooks';
import { initiales, telephoneLisible } from '../lib/format';
import { estBureau, LIBELLE_ROLE } from '../lib/types';
import { DAHIRA } from '../config';
import { EnTete } from '../components/ui';

type InstallEvent = Event & { prompt: () => Promise<void> };

export default function Plus() {
  const moi = useMoi();
  const { deconnecter, majMembre } = useAuth();
  const { executer, enCours } = useAction();
  const [installation, setInstallation] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const f = (e: Event) => { e.preventDefault(); setInstallation(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  async function basculerVisibilite() {
    const v = !moi.telephone_visible;
    if (await executer(() => api.changerVisibilite(v), v ? 'Votre numéro est visible dans l\'annuaire' : 'Votre numéro est masqué')) majMembre({ telephone_visible: v });
  }

  return (
    <>
      <EnTete titre="Mon espace" sousTitre={DAHIRA.nom} />

      <div className="carte">
        <div className="ligne">
          <div className="avatar avatar-grand">{initiales(moi.prenom, moi.nom)}</div>
          <div className="flex1">
            <h2 style={{ fontFamily: 'var(--police-titre)', fontSize: '1.3rem' }}>{moi.prenom} {moi.nom}</h2>
            <div className="badges mt8">
              <span className="badge badge-or">{LIBELLE_ROLE[moi.role]}</span>
              {moi.commission && <span className="badge badge-vert">{moi.commission}</span>}
            </div>
            <p className="petit muted mt8">{[moi.quartier, telephoneLisible(moi.telephone)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <div className="separateur" />
        <label className="case" style={{ marginBottom: 0 }}>
          <input type="checkbox" checked={moi.telephone_visible} onChange={basculerVisibilite} disabled={enCours} />
          <span className="petit">J'accepte que mon numéro soit visible par les membres dans l'annuaire</span>
        </label>
      </div>

      <section className="section">
        <div className="menu-liste">
          <Link to="/membres"><span className="raccourci-icone"><Users size={18} /></span>Membres<ChevronRight size={18} className="chevron" /></Link>
          <Link to="/annonces"><span className="raccourci-icone"><Megaphone size={18} /></span>Annonces<ChevronRight size={18} className="chevron" /></Link>
          <Link to="/archives"><span className="raccourci-icone"><Archive size={18} /></span>Archives<ChevronRight size={18} className="chevron" /></Link>
          <Link to="/documents"><span className="raccourci-icone"><FileText size={18} /></span>Documents<ChevronRight size={18} className="chevron" /></Link>
        </div>
      </section>

      {estBureau(moi) && (
        <section className="section">
          <div className="menu-liste">
            <Link to="/bureau">
              <span className="raccourci-icone" style={{ background: 'var(--or-100)', color: 'var(--or-600)' }}><ShieldCheck size={18} /></span>
              <span className="flex1">Espace bureau<small>Publier, gérer les membres, les événements et les cotisations</small></span>
              <ChevronRight size={18} className="chevron" />
            </Link>
          </div>
        </section>
      )}

      <section className="section">
        <div className="menu-liste">
          {installation && (
            <button onClick={() => installation.prompt().then(() => setInstallation(null))}>
              <span className="raccourci-icone"><Download size={18} /></span>Installer l'application<ChevronRight size={18} className="chevron" />
            </button>
          )}
          <button onClick={() => confirm('Voulez-vous vous déconnecter ?') && deconnecter()}>
            <span className="raccourci-icone" style={{ background: 'var(--terre-100)', color: 'var(--terre-500)' }}><LogOut size={18} /></span>
            Se déconnecter
          </button>
        </div>
      </section>

      <div className="ornement" aria-hidden="true">✦</div>
      <p className="pied">{DAHIRA.nom} · version 1.0</p>
    </>
  );
}
