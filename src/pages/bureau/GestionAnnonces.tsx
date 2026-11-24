import { useState, type FormEvent } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAction, useDonnees } from '../../lib/hooks';
import { relatif } from '../../lib/format';
import { Erreur, Squelettes, Vide } from '../../components/ui';

export default function GestionAnnonces() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.annonces());
  const { executer, enCours } = useAction();
  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [important, setImportant] = useState(false);

  async function publier(e: FormEvent) {
    e.preventDefault();
    if (await executer(() => api.publierAnnonce({ titre: titre.trim(), texte: texte.trim(), important }), 'Annonce publiée')) {
      setTitre(''); setTexte(''); setImportant(false); recharger();
    }
  }

  async function supprimer(id: string) {
    if (confirm('Supprimer cette annonce ?') && await executer(() => api.supprimerAnnonce(id), 'Annonce supprimée')) recharger();
  }

  return (
    <>
      <form className="carte" onSubmit={publier}>
        <h3 className="gras" style={{ marginBottom: 12 }}>Nouvelle annonce</h3>
        <label className="champ"><span>Titre</span><input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} required maxLength={120} /></label>
        <label className="champ"><span>Texte</span><textarea className="textarea" value={texte} onChange={(e) => setTexte(e.target.value)} required /></label>
        <label className="case"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /> Marquer comme importante</label>
        <button className="btn btn-bloc" disabled={enCours}><Send size={17} /> Publier</button>
      </form>

      <div className="section-titre mt16" style={{ marginTop: 22 }}><h3>Annonces publiées</h3></div>
      {chargement ? <Squelettes n={2} /> : erreur ? <Erreur message={erreur} onReessayer={recharger} />
        : donnees?.length ? (
          <div className="menu-liste">
            {donnees.map((a) => (
              <div key={a.id} className="ligne" style={{ padding: '12px 14px', borderBottom: '1px solid var(--bordure)' }}>
                <div className="flex1">
                  <div className="gras tronque">{a.important ? '★ ' : ''}{a.titre}</div>
                  <div className="tres-petit muted">{relatif(a.publie_le)}{a.auteur_nom ? ` · ${a.auteur_nom}` : ''}</div>
                </div>
                <button className="btn btn-danger btn-petit" onClick={() => supprimer(a.id)} aria-label="Supprimer"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        ) : <Vide icone={Megaphone} titre="Aucune annonce" />}
    </>
  );
}
