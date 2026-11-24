import { useState, type FormEvent } from 'react';
import { Archive, FilePlus2, Save, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAction, useDonnees } from '../../lib/hooks';
import { aujourdhuiISO, telephoneLisible } from '../../lib/format';
import { LIBELLE_TYPE_DOC, type InfoCotisation, type TypeDocument } from '../../lib/types';
import { Erreur, Squelettes } from '../../components/ui';

/** Documents, archives et (pour la trésorerie) numéros officiels de cotisation */
export default function GestionContenus({ tresorerie }: { tresorerie: boolean }) {
  const { donnees, chargement, erreur, recharger } = useDonnees(async () => {
    const [documents, archives, numeros] = await Promise.all([api.documents(), api.archives(), api.infosCotisation()]);
    return { documents, archives, numeros };
  });
  const { executer, enCours } = useAction();

  const [doc, setDoc] = useState({ titre: '', type: 'compte_rendu' as TypeDocument, lien: '', date_doc: aujourdhuiISO() });
  const [arch, setArch] = useState({ titre: '', annee: new Date().getFullYear(), resume: '', lien_photos: '', lien_compte_rendu: '' });

  async function ajouterDoc(e: FormEvent) {
    e.preventDefault();
    if (await executer(() => api.ajouterDocument(doc), 'Document ajouté')) { setDoc({ ...doc, titre: '', lien: '' }); recharger(); }
  }
  async function ajouterArchive(e: FormEvent) {
    e.preventDefault();
    const a = { ...arch, lien_photos: arch.lien_photos || null, lien_compte_rendu: arch.lien_compte_rendu || null };
    if (await executer(() => api.ajouterArchive(a), 'Archive ajoutée')) { setArch({ ...arch, titre: '', resume: '', lien_photos: '', lien_compte_rendu: '' }); recharger(); }
  }
  async function retirer(action: () => Promise<void>) {
    if (confirm('Supprimer cet élément ?') && await executer(action, 'Supprimé')) recharger();
  }

  if (chargement) return <Squelettes n={3} />;
  if (erreur) return <Erreur message={erreur} onReessayer={recharger} />;

  return (
    <>
      <form className="carte" onSubmit={ajouterDoc}>
        <h3 className="gras" style={{ marginBottom: 12 }}>Ajouter un document</h3>
        <label className="champ"><span>Titre</span><input className="input" value={doc.titre} onChange={(e) => setDoc({ ...doc, titre: e.target.value })} required /></label>
        <div className="deux-colonnes">
          <label className="champ">
            <span>Type</span>
            <select className="select" value={doc.type} onChange={(e) => setDoc({ ...doc, type: e.target.value as TypeDocument })}>
              {(Object.keys(LIBELLE_TYPE_DOC) as TypeDocument[]).map((t) => <option key={t} value={t}>{LIBELLE_TYPE_DOC[t]}</option>)}
            </select>
          </label>
          <label className="champ"><span>Date</span><input className="input" type="date" value={doc.date_doc} onChange={(e) => setDoc({ ...doc, date_doc: e.target.value })} /></label>
        </div>
        <label className="champ"><span>Lien (Google Drive, PDF…)</span><input className="input" type="url" placeholder="https://" value={doc.lien} onChange={(e) => setDoc({ ...doc, lien: e.target.value })} required /></label>
        <button className="btn btn-bloc" disabled={enCours}><FilePlus2 size={17} /> Ajouter</button>
      </form>
      <div className="menu-liste mt12">
        {donnees!.documents.map((d) => (
          <div key={d.id} className="ligne" style={{ padding: '10px 14px', borderBottom: '1px solid var(--bordure)' }}>
            <span className="flex1 tronque petit gras">{d.titre}</span>
            <button className="btn btn-danger btn-petit" onClick={() => retirer(() => api.supprimerDocument(d.id))} aria-label="Supprimer"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <form className="carte" style={{ marginTop: 22 }} onSubmit={ajouterArchive}>
        <h3 className="gras" style={{ marginBottom: 12 }}>Ajouter une archive</h3>
        <div className="deux-colonnes">
          <label className="champ"><span>Événement</span><input className="input" value={arch.titre} onChange={(e) => setArch({ ...arch, titre: e.target.value })} required /></label>
          <label className="champ"><span>Année</span><input className="input" type="number" value={arch.annee} onChange={(e) => setArch({ ...arch, annee: Number(e.target.value) })} required /></label>
        </div>
        <label className="champ"><span>Résumé</span><textarea className="textarea" style={{ minHeight: 70 }} value={arch.resume} onChange={(e) => setArch({ ...arch, resume: e.target.value })} /></label>
        <label className="champ"><span>Lien du dossier photos</span><input className="input" type="url" placeholder="https://drive.google.com/…" value={arch.lien_photos} onChange={(e) => setArch({ ...arch, lien_photos: e.target.value })} /></label>
        <label className="champ"><span>Lien du compte rendu</span><input className="input" type="url" placeholder="https://" value={arch.lien_compte_rendu} onChange={(e) => setArch({ ...arch, lien_compte_rendu: e.target.value })} /></label>
        <button className="btn btn-bloc" disabled={enCours}><Archive size={17} /> Ajouter</button>
      </form>
      <div className="menu-liste mt12">
        {donnees!.archives.map((a) => (
          <div key={a.id} className="ligne" style={{ padding: '10px 14px', borderBottom: '1px solid var(--bordure)' }}>
            <span className="flex1 tronque petit gras">{a.annee} · {a.titre}</span>
            <button className="btn btn-danger btn-petit" onClick={() => retirer(() => api.supprimerArchive(a.id))} aria-label="Supprimer"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {tresorerie && <NumerosOfficiels numeros={donnees!.numeros} onChange={recharger} />}
    </>
  );
}

function NumerosOfficiels({ numeros, onChange }: { numeros: InfoCotisation[]; onChange: () => void }) {
  const { executer, enCours } = useAction();
  const [lignes, setLignes] = useState(numeros.map((n) => ({ ...n, numero: telephoneLisible(n.numero) })));

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const ok = await executer(async () => {
      for (const l of lignes) await api.modifierInfoCotisation({ ...l, numero: l.numero.replace(/\D/g, '') });
    }, 'Numéros enregistrés');
    if (ok) onChange();
  }

  return (
    <form className="carte" style={{ marginTop: 22 }} onSubmit={enregistrer}>
      <h3 className="gras" style={{ marginBottom: 4 }}>Numéros officiels de cotisation</h3>
      <p className="tres-petit muted" style={{ marginBottom: 12 }}>Uniquement des comptes au nom du Dahira ou du bureau, jamais un compte personnel.</p>
      {lignes.map((l, i) => (
        <div key={l.id || i} className="deux-colonnes">
          <label className="champ"><span>Opérateur</span><input className="input" value={l.operateur} onChange={(e) => setLignes(lignes.map((x, j) => j === i ? { ...x, operateur: e.target.value } : x))} required /></label>
          <label className="champ"><span>Numéro</span><input className="input" inputMode="tel" value={l.numero} onChange={(e) => setLignes(lignes.map((x, j) => j === i ? { ...x, numero: e.target.value } : x))} required /></label>
          <label className="champ" style={{ gridColumn: '1 / -1' }}><span>Titulaire</span><input className="input" value={l.titulaire} onChange={(e) => setLignes(lignes.map((x, j) => j === i ? { ...x, titulaire: e.target.value } : x))} required /></label>
        </div>
      ))}
      {lignes.length < 3 && (
        <button type="button" className="btn btn-clair btn-petit" style={{ marginBottom: 14 }} onClick={() => setLignes([...lignes, { id: '', numero: '', operateur: '', titulaire: '' }])}>+ Ajouter un numéro</button>
      )}
      <button className="btn btn-bloc" disabled={enCours}><Save size={17} /> Enregistrer les numéros</button>
    </form>
  );
}
