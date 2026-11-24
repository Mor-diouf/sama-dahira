import { useState, type CSSProperties, type FormEvent } from 'react';
import photoMosquee from '../assets/grande-mosquee.jpg';
import { KeyRound, LogIn, Phone } from 'lucide-react';
import { useAuth, type ProfilDemo } from '../lib/auth';
import { messageErreur } from '../lib/api';
import { MODE_DEMO } from '../lib/supabase';
import { DAHIRA } from '../config';
import { Logo } from '../components/Mosquee';

const PROFILS: { id: ProfilDemo; libelle: string }[] = [
  { id: 'membre', libelle: 'Membre' },
  { id: 'bureau', libelle: 'Bureau' },
  { id: 'tresorier', libelle: 'Trésorier' },
];

export default function Connexion() {
  const { connecter } = useAuth();
  const [telephone, setTelephone] = useState('');
  const [code, setCode] = useState('');
  const [profil, setProfil] = useState<ProfilDemo>('membre');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      await connecter(telephone, code, profil);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="app">
      <div className="connexion">
        <div className="connexion-haut photo-mosquee" style={{ '--photo': `url(${photoMosquee})` } as CSSProperties}>
          <p className="bismillah" lang="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <Logo taille={124} className="logo-connexion" />
          <h1>{DAHIRA.nom}</h1>
          <p className="nom-arabe" lang="ar" dir="rtl">{DAHIRA.nomArabe}</p>
          <p>{DAHIRA.sousTitre}</p>
          <div className="connexion-espace" role="img" aria-label="Grande Mosquée de Touba" />
        </div>

        <form className="connexion-form" onSubmit={soumettre}>
          <h2>Bienvenue</h2>
          <p className="muted petit" style={{ marginBottom: 18 }}>
            Connectez-vous avec votre numéro de téléphone et le code reçu du bureau.
          </p>

          {MODE_DEMO && (
            <>
              <p className="petit gras" style={{ marginBottom: 8 }}>Démonstration : choisissez un profil</p>
              <div className="roles-demo">
                {PROFILS.map((p) => (
                  <button type="button" key={p.id} className={profil === p.id ? 'actif' : ''} onClick={() => setProfil(p.id)}>
                    {p.libelle}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="champ">
            <span><Phone size={14} style={{ verticalAlign: -2 }} /> Numéro de téléphone</span>
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67"
              value={telephone} onChange={(e) => setTelephone(e.target.value)} required={!MODE_DEMO} />
          </label>
          <label className="champ">
            <span><KeyRound size={14} style={{ verticalAlign: -2 }} /> Code d'accès</span>
            <input className="input" type="password" inputMode="numeric" autoComplete="current-password" placeholder="••••••"
              value={code} onChange={(e) => setCode(e.target.value)} required={!MODE_DEMO} />
          </label>

          {erreur && <p className="erreur-texte" role="alert">{erreur}</p>}

          <button className="btn btn-or btn-bloc" disabled={enCours}>
            <LogIn size={18} /> {enCours ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="pied mt16">{DAHIRA.aide}</p>
        </form>
      </div>
    </div>
  );
}
