import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Save, Sprout, Trash2 } from 'lucide-react';
import { api, type NouveauProjet } from '../../lib/api';
import { useAction, useDonnees } from '../../lib/hooks';
import { fcfa } from '../../lib/format';
import { LIBELLE_STATUT_PROJET, type Projet, type StatutProjet } from '../../lib/types';
import { Erreur, Feuille, Squelettes, Vide } from '../../components/ui';

const VIDE: NouveauProjet = { nom: '', description: '', responsable: '', statut: 'en_cours', objectif: 0, montant_depense: 0, date_debut: null, date_fin: null, a_la_une: false };

export default function GestionProjets() {
  const { donnees, chargement, erreur, recharger } = useDonnees(() => api.projets());
  const { executer, enCours } = useAction();
  const [edition, setEdition] = useState<NouveauProjet | null>(null);

  function editer(p?: Projet) {
    setEdition(p ? {
      id: p.id, nom: p.nom, description: p.description ?? '', responsable: p.responsable ?? '', statut: p.statut, objectif: p.objectif,
      montant_depense: p.montant_depense, date_debut: p.date_debut, date_fin: p.date_fin, a_la_une: p.a_la_une,
    } : { ...VIDE });
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (!edition) return;
    if (await executer(() => api.enregistrerProjet({ ...edition, date_debut: edition.date_debut || null, date_fin: edition.date_fin || null }), 'Projet enregistré')) {
      setEdition(null); recharger();
    }
  }

  async function supprimer(id: string) {
    if (confirm('Supprimer ce projet ? Les cotisations liées seront conservées sans projet.') && await executer(() => api.supprimerProjet(id), 'Projet supprimé')) {
      setEdition(null); recharger();
    }
  }

  const maj = <K extends keyof NouveauProjet>(k: K, v: NouveauProjet[K]) => setEdition((p) => (p ? { ...p, [k]: v } : p));

  return (
    <>
      <button className="btn btn-bloc" onClick={() => editer()}><Plus size={18} /> Nouveau projet</button>
      <div className="pile mt16">
        {chargement ? <Squelettes n={3} /> : erreur ? <Erreur message={erreur} onReessayer={recharger} />
          : donnees?.length ? donnees.map((p) => (
            <button key={p.id} className="carte carte-cliquable" onClick={() => editer(p)}>
              <div className="ligne-entre">
                <div className="flex1">
                  <div className="gras">{p.a_la_une ? '★ ' : ''}{p.nom}</div>
                  <div className="tres-petit muted">{LIBELLE_STATUT_PROJET[p.statut]} · collecté {fcfa(p.montant_collecte)} / {fcfa(p.objectif)} · dépensé {fcfa(p.montant_depense)}</div>
                </div>
                <Pencil size={16} className="muted" />
              </div>
            </button>
          )) : <Vide icone={Sprout} titre="Aucun projet" />}
      </div>

      <Feuille ouvert={!!edition} titre={edition?.id ? 'Modifier le projet' : 'Nouveau projet'} onFermer={() => setEdition(null)}>
        {edition && (
          <form onSubmit={enregistrer}>
            <label className="champ"><span>Nom</span><input className="input" value={edition.nom} onChange={(e) => maj('nom', e.target.value)} required /></label>
            <label className="champ"><span>Description</span><textarea className="textarea" style={{ minHeight: 80 }} value={edition.description} onChange={(e) => maj('description', e.target.value)} /></label>
            <div className="deux-colonnes">
              <label className="champ"><span>Responsable</span><input className="input" value={edition.responsable} onChange={(e) => maj('responsable', e.target.value)} /></label>
              <label className="champ">
                <span>Statut</span>
                <select className="select" value={edition.statut} onChange={(e) => maj('statut', e.target.value as StatutProjet)}>
                  {(Object.keys(LIBELLE_STATUT_PROJET) as StatutProjet[]).map((s) => <option key={s} value={s}>{LIBELLE_STATUT_PROJET[s]}</option>)}
                </select>
              </label>
              <label className="champ"><span>Objectif (F)</span><input className="input" inputMode="numeric" value={edition.objectif || ''} onChange={(e) => maj('objectif', Number(e.target.value.replace(/\D/g, '')))} /></label>
              <label className="champ"><span>Montant dépensé (F)</span><input className="input" inputMode="numeric" value={edition.montant_depense || ''} onChange={(e) => maj('montant_depense', Number(e.target.value.replace(/\D/g, '')))} /></label>
              <label className="champ"><span>Début</span><input className="input" type="date" value={edition.date_debut ?? ''} onChange={(e) => maj('date_debut', e.target.value)} /></label>
              <label className="champ"><span>Fin</span><input className="input" type="date" value={edition.date_fin ?? ''} onChange={(e) => maj('date_fin', e.target.value)} /></label>
            </div>
            <label className="case"><input type="checkbox" checked={edition.a_la_une} onChange={(e) => maj('a_la_une', e.target.checked)} /> Mettre à la une sur l'accueil</label>
            <p className="tres-petit muted" style={{ marginBottom: 14 }}>Le montant collecté est calculé automatiquement à partir des cotisations confirmées.</p>
            <button className="btn btn-bloc" disabled={enCours}><Save size={17} /> Enregistrer</button>
            {edition.id && <button type="button" className="btn btn-danger btn-bloc mt8" onClick={() => supprimer(edition.id!)}><Trash2 size={16} /> Supprimer le projet</button>}
          </form>
        )}
      </Feuille>
    </>
  );
}
