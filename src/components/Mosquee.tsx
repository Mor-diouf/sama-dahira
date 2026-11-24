import logo from '../assets/logo.webp';
import { DAHIRA } from '../config';

/**
 * Silhouette stylisée inspirée de la Grande Mosquée de Touba :
 * le grand minaret central (Lamp Fall), les coupoles et les minarets latéraux.
 */
export function Mosquee({ className, titre = 'Grande Mosquée' }: { className?: string; titre?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 150" role="img" aria-label={titre} fill="currentColor">
      {/* Croissant au sommet du grand minaret */}
      <path d="M120 2.5a5 5 0 1 0 3.4 8.7 4 4 0 1 1-3.4-8.7z" />
      {/* Grand minaret central */}
      <path d="M118.6 13h2.8l1.6 9h-6z" />
      <path d="M115.5 22h9l1 4h-11z" />
      <rect x="116" y="26" width="8" height="22" rx="1" />
      <path d="M113 48h14l-1.5 4h-11z" />
      <rect x="115" y="52" width="10" height="26" rx="1" />
      <path d="M112 78h16l-1.5 4h-13z" />
      {/* Coupole principale */}
      <path d="M86 100c0-18 15-27 34-29 19 2 34 11 34 29z" />
      {/* Coupoles secondaires */}
      <path d="M52 104c0-11 8-17 18-18 10 1 18 7 18 18z" />
      <path d="M152 104c0-11 8-17 18-18 10 1 18 7 18 18z" />
      {/* Minarets intermédiaires */}
      <path d="M78 44l3 9h-6z" />
      <rect x="76" y="53" width="5" height="47" rx="1" />
      <path d="M74 66h9v3h-9zM74 84h9v3h-9z" />
      <path d="M162 44l3 9h-6z" />
      <rect x="159" y="53" width="5" height="47" rx="1" />
      <path d="M157 66h9v3h-9zM157 84h9v3h-9z" />
      {/* Minarets extérieurs */}
      <path d="M30 60l2.6 8h-5.2z" />
      <rect x="28" y="68" width="4.5" height="40" rx="1" />
      <path d="M26 80h8.5v2.5H26z" />
      <path d="M210 60l2.6 8h-5.2z" />
      <rect x="207.5" y="68" width="4.5" height="40" rx="1" />
      <path d="M205.5 80h8.5v2.5h-8.5z" />
      {/* Corps du bâtiment avec arcades */}
      <path
        fillRule="evenodd"
        d="M20 104h200v34H20z
           M38 138v-14a6 6 0 0 1 12 0v14z
           M62 138v-14a6 6 0 0 1 12 0v14z
           M86 138v-14a6 6 0 0 1 12 0v14z
           M108 138v-17a12 12 0 0 1 24 0v17z
           M142 138v-14a6 6 0 0 1 12 0v14z
           M166 138v-14a6 6 0 0 1 12 0v14z
           M190 138v-14a6 6 0 0 1 12 0v14z"
      />
      <rect x="10" y="138" width="220" height="6" rx="2" />
    </svg>
  );
}

/** Logo officiel du Dahira (rond, fond transparent) */
export function Logo({ taille = 56, className }: { taille?: number; className?: string }) {
  return (
    <img
      src={logo}
      width={taille}
      height={taille}
      className={className ? `logo ${className}` : 'logo'}
      alt={`Logo du ${DAHIRA.nom}`}
      decoding="async"
    />
  );
}
