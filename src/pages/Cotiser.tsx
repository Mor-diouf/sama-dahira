import { useState, type FormEvent } from 'react';
import { Check, Copy, HandCoins, Info, Paperclip, ReceiptText, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAction, useDonnees, useToast } from '../lib/hooks';
import { aujourdhuiISO, dateCourte, fcfa, telephoneLisible } from '../lib/format';
import { BadgeStatut, EnTete, Erreur, Feuille, Squelettes, Vide } from '../components/ui';

const MONTANTS = [1000, 2000, 5000, 10000, 25000];
const TAILLE_MAX = 5 * 1024 * 1024;

export default function Cotiser() {
  const toast = useToast();
  const { donnees, chargement, erreur, recharger } = useDonnees(async () => {
    const [numeros, projets, miennes] = await Promise.all([api.infosCotisation(), api.projets(), api.mesCotisations()]);
    return { numeros, projets: projets.filter((p) => p.statut !== 'termine'), miennes };
  });
  const [copie, setCopie] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const { executer, enCours } = useAction();

  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(aujourdhuiISO());
  const [projet, setProjet] = useState('');
  const [moyen, setMoyen] = useState('');
  const [reference, setReference] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);

  async function copier(numero: string) {
    try {
      await navigator.clipboard.writeText(telephoneLisible(numero).replace(/\s/g, ''));
      setCopie(numero);
      toast('Numéro copié');
      setTimeout(() => setCopie(null), 2000);
    } catch {
      toast('Copie impossible : notez le numéro à la main.', true);
    }
  }

  function ouvrir() {
    setMontant(''); setDate(aujourdhuiISO()); setProjet(donnees?.projets.find((p) => p.a_la_une)?.id ?? '');
    setMoyen(donnees?.numeros[0]?.operateur ?? ''); setReference(''); setFichier(null);
    setOuvert(true);
  }

  async function declarer(e: FormEvent) {
    e.preventDefault();
    const m = Number(montant.replace(/\s/g, ''));
    if (!m || m <= 0) return toast('Indiquez un montant valide.', true);
    if (fichier && fichier.size > TAILLE_MAX) return toast('La capture dépasse 5 Mo.', true);
    const ok = await executer(
      () => api.declarerCotisation({ montant: m, date_paiement: date, projet_id: projet || null, moyen: moyen || null, reference: reference.trim() || null, fichier }),
      'Merci ! Votre cotisation est en attente de confirmation.',
    );
    if (ok) { setOuvert(false); recharger(); }
  }

  async function annuler(id: string) {
    if (!confirm('Annuler cette déclaration ?')) return;
    if (await executer(() => api.annulerDeclaration(id), 'Déclaration annulée')) recharger();
  }

  const totalConfirme = (donnees?.miennes ?? []).filter((c) => c.statut === 'confirme').reduce((s, c) => s + c.montant, 0);

  return (
    <>
      <EnTete titre="Cotiser" sousTitre="Participez aux projets du Dahira" />
      {chargement ? <Squelettes n={2} hauteur={170} />
        : erreur ? <Erreur message={erreur} onReessayer={recharger} />
        : (
          <>
            <div className="pile">
              {donnees!.numeros.map((n) => (
                <div key={n.id} className="carte numero-carte">
                  <div className="operateur">{n.operateur}</div>
                  <div className="numero">{telephoneLisible(n.numero)}</div>
                  <div className="titulaire">Titulaire : {n.titulaire}</div>
                  <button className="btn btn-verre btn-petit" onClick={() => copier(n.numero)}>
                    {copie === n.numero ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier le numéro</>}
                  </button>
                </div>
              ))}
              {!donnees!.numeros.length && <div className="carte"><Vide icone={Info} titre="Numéros bientôt disponibles" texte="Le trésorier n'a pas encore publié les numéros officiels." /></div>}
            </div>

            <section className="section carte">
              <h3 className="gras" style={{ marginBottom: 6 }}>Comment ça marche</h3>
              <ol className="etapes">
                <li>Envoyez votre cotisation sur un des numéros officiels ci-dessus.</li>
                <li>Appuyez sur « J'ai cotisé » et indiquez le montant et le projet.</li>
                <li>Le trésorier vérifie le relevé du compte et confirme.</li>
                <li>Votre cotisation passe à « Confirmé » et compte dans le total du projet.</li>
              </ol>
              <button className="btn btn-or btn-bloc mt12" onClick={ouvrir}><HandCoins size={20} /> J'ai cotisé</button>
            </section>

            <section className="section">
              <div className="section-titre"><h3>Mes contributions</h3></div>
              {donnees!.miennes.length > 0 && (
                <div className="stats" style={{ marginBottom: 10 }}>
                  <div className="stat"><span>Confirmé</span><b>{fcfa(totalConfirme)}</b></div>
                  <div className="stat"><span>Déclarations</span><b>{donnees!.miennes.length}</b></div>
                </div>
              )}
              <div className="pile">
                {donnees!.miennes.length ? donnees!.miennes.map((c) => (
                  <div key={c.id} className="carte">
                    <div className="ligne-entre">
                      <b style={{ fontSize: '1.1rem' }}>{fcfa(c.montant)}</b>
                      <BadgeStatut statut={c.statut} />
                    </div>
                    <p className="petit muted mt8">
                      {c.projet_nom ?? 'Cotisation générale'} · {dateCourte(c.date_paiement)}{c.moyen ? ` · ${c.moyen}` : ''}
                    </p>
                    {c.statut === 'confirme' && c.confirme_par_nom && <p className="tres-petit muted">Confirmé par {c.confirme_par_nom}</p>}
                    {c.note && <p className="tres-petit muted">Note du trésorier : {c.note}</p>}
                    {c.statut === 'en_attente' && (
                      <button className="lien mt8" style={{ color: 'var(--terre-500)' }} onClick={() => annuler(c.id)}>
                        <Trash2 size={13} style={{ verticalAlign: -2 }} /> Annuler la déclaration
                      </button>
                    )}
                  </div>
                )) : <div className="carte"><Vide icone={ReceiptText} titre="Aucune cotisation pour l'instant" texte="Vos déclarations et leur statut apparaîtront ici." /></div>}
              </div>
            </section>
          </>
        )}

      <Feuille ouvert={ouvert} titre="J'ai cotisé" onFermer={() => setOuvert(false)}>
        <form onSubmit={declarer}>
          <label className="champ">
            <span>Montant envoyé (FCFA)</span>
            <input className="input" inputMode="numeric" placeholder="5 000" value={montant} onChange={(e) => setMontant(e.target.value.replace(/[^\d\s]/g, ''))} required />
          </label>
          <div className="badges" style={{ marginTop: -6, marginBottom: 14 }}>
            {MONTANTS.map((m) => (
              <button type="button" key={m} className="badge badge-or" style={{ border: 0, padding: '6px 10px' }} onClick={() => setMontant(String(m))}>{fcfa(m)}</button>
            ))}
          </div>
          <div className="deux-colonnes">
            <label className="champ"><span>Date</span><input className="input" type="date" value={date} max={aujourdhuiISO()} onChange={(e) => setDate(e.target.value)} required /></label>
            <label className="champ">
              <span>Moyen</span>
              <select className="select" value={moyen} onChange={(e) => setMoyen(e.target.value)}>
                {[...new Set(donnees?.numeros.map((n) => n.operateur))].map((o) => <option key={o}>{o}</option>)}
                <option value="Espèces">Espèces</option>
              </select>
            </label>
          </div>
          <label className="champ">
            <span>Projet concerné</span>
            <select className="select" value={projet} onChange={(e) => setProjet(e.target.value)}>
              <option value="">Cotisation générale</option>
              {donnees?.projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </label>
          <label className="champ">
            <span>Référence de la transaction (facultatif)</span>
            <input className="input" placeholder="Ex. : identifiant du SMS de confirmation" value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <label className="fichier" style={{ marginBottom: 16 }}>
            <Paperclip size={18} />
            <span className="tronque">{fichier ? fichier.name : 'Ajouter une capture du reçu (facultatif)'}</span>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
          </label>
          <button className="btn btn-or btn-bloc" disabled={enCours}>{enCours ? 'Envoi…' : 'Envoyer ma déclaration'}</button>
        </form>
      </Feuille>
    </>
  );
}
