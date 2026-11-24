import { useState } from 'react';
import { Check, Paperclip, ReceiptText, RotateCcw, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAction, useDonnees, useToast } from '../../lib/hooks';
import { dateCourte, fcfa, relatif } from '../../lib/format';
import type { Cotisation, StatutCotisation } from '../../lib/types';
import { BadgeStatut, Erreur, Squelettes, Vide } from '../../components/ui';

export default function Tresorerie() {
  const [statut, setStatut] = useState<StatutCotisation>('en_attente');
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.toutesCotisations(), []);
  const { executer } = useAction();
  const toast = useToast();

  const toutes = donnees ?? [];
  const liste = toutes.filter((c) => c.statut === statut);
  const enAttente = toutes.filter((c) => c.statut === 'en_attente');
  const confirme = toutes.filter((c) => c.statut === 'confirme').reduce((s, c) => s + c.montant, 0);

  async function changer(c: Cotisation, nouveau: StatutCotisation) {
    let note: string | undefined;
    if (nouveau === 'rejete') {
      const n = prompt('Motif du rejet (visible par le membre) :', 'Paiement introuvable sur le relevé');
      if (n === null) return;
      note = n;
    }
    const messages = { confirme: 'Cotisation confirmée', rejete: 'Cotisation rejetée', en_attente: 'Remise en attente' };
    if (await executer(() => api.validerCotisation(c.id, nouveau, note), messages[nouveau])) recharger();
  }

  async function voirRecu(path: string) {
    try {
      window.open(await api.lienRecu(path), '_blank', 'noopener');
    } catch {
      toast("Impossible d'ouvrir le reçu", true);
    }
  }

  if (chargement) return <Squelettes n={3} hauteur={130} />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;

  return (
    <>
      <div className="stats">
        <div className="stat"><span>À vérifier</span><b>{enAttente.length}</b><span style={{ textTransform: 'none' }}>{fcfa(enAttente.reduce((s, c) => s + c.montant, 0))}</span></div>
        <div className="stat"><span>Total confirmé</span><b>{fcfa(confirme)}</b></div>
      </div>
      <div className="encadre mt12">
        <ReceiptText size={18} />
        <span>Comparez chaque déclaration avec le relevé Wave ou Orange Money avant de confirmer. Seules les cotisations confirmées comptent dans les totaux.</span>
      </div>
      <div className="segments mt16">
        <button className={statut === 'en_attente' ? 'actif' : ''} onClick={() => setStatut('en_attente')}>En attente ({enAttente.length})</button>
        <button className={statut === 'confirme' ? 'actif' : ''} onClick={() => setStatut('confirme')}>Confirmées</button>
        <button className={statut === 'rejete' ? 'actif' : ''} onClick={() => setStatut('rejete')}>Rejetées</button>
      </div>
      <div className="pile mt16">
        {liste.length ? liste.map((c) => (
          <article key={c.id} className="carte">
            <div className="ligne-entre">
              <div className="flex1">
                <div className="gras tronque">{c.membre_nom}</div>
                <div className="tres-petit muted">Déclaré {relatif(c.created_at).toLowerCase()}</div>
              </div>
              <b style={{ fontSize: '1.1rem' }}>{fcfa(c.montant)}</b>
            </div>
            <p className="petit muted mt8">
              {c.projet_nom ?? 'Cotisation générale'} · payé le {dateCourte(c.date_paiement)}{c.moyen ? ` · ${c.moyen}` : ''}
            </p>
            {c.reference && <p className="tres-petit muted">Référence : <b>{c.reference}</b></p>}
            {c.note && <p className="tres-petit muted">Note : {c.note}</p>}
            <div className="ligne-entre mt12">
              <BadgeStatut statut={c.statut} />
              {c.recu_path && <button className="lien" onClick={() => voirRecu(c.recu_path!)}><Paperclip size={13} style={{ verticalAlign: -2 }} /> Voir le reçu</button>}
            </div>
            {c.confirme_par_nom && c.statut !== 'en_attente' && <p className="tres-petit muted mt8">Par {c.confirme_par_nom}{c.confirme_le ? `, ${dateCourte(c.confirme_le)}` : ''}</p>}
            <div className="ligne mt12" style={{ gap: 8 }}>
              {c.statut === 'en_attente' ? (
                <>
                  <button className="btn btn-petit flex1" onClick={() => changer(c, 'confirme')}><Check size={16} /> Confirmer</button>
                  <button className="btn btn-danger btn-petit flex1" onClick={() => changer(c, 'rejete')}><X size={16} /> Rejeter</button>
                </>
              ) : (
                <button className="btn btn-clair btn-petit" onClick={() => changer(c, 'en_attente')}><RotateCcw size={15} /> Remettre en attente</button>
              )}
            </div>
          </article>
        )) : <Vide icone={ReceiptText} titre={statut === 'en_attente' ? 'Rien à vérifier' : 'Aucune cotisation'} texte={statut === 'en_attente' ? 'Toutes les déclarations ont été traitées.' : undefined} />}
      </div>
    </>
  );
}
