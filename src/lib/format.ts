const fmtNombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export const fcfa = (n: number | null | undefined) => `${fmtNombre.format(n ?? 0)} F`;

export const pourcentage = (part: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;

export const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

export const jourDuMois = (iso: string) => new Date(iso).getDate();

export const moisCourt = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

export const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** « Aujourd'hui », « Demain », « Dans 5 jours », « Il y a 3 jours »… */
export function relatif(iso: string) {
  const d = new Date(iso);
  const auj = new Date();
  const j = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(auj.getFullYear(), auj.getMonth(), auj.getDate()).getTime()) / 86400000,
  );
  if (j === 0) return "Aujourd'hui";
  if (j === 1) return 'Demain';
  if (j === -1) return 'Hier';
  if (j > 1) return `Dans ${j} jours`;
  return `Il y a ${-j} jours`;
}

export const initiales = (prenom: string, nom: string) =>
  `${prenom.trim()[0] ?? ''}${nom.trim()[0] ?? ''}`.toUpperCase();

/** Ramène un numéro sénégalais au format international sans « + » : 221771234567 */
export function normaliserTelephone(saisie: string) {
  let t = saisie.replace(/\D/g, '');
  if (t.startsWith('00')) t = t.slice(2);
  if (t.length === 9) t = `221${t}`;
  return t;
}

/** 221771234567 → 77 123 45 67 */
export function telephoneLisible(t: string | null) {
  if (!t) return '';
  const local = t.startsWith('221') && t.length === 12 ? t.slice(3) : t;
  return local.length === 9 ? local.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4') : local;
}

export const aujourdhuiISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
