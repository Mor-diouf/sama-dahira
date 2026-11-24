// Génère le logo rond et les icônes de l'application à partir de scripts/logo-source.jpg
// Le JPG a des coins noirs : on le découpe en cercle sur fond transparent.
import sharp from 'sharp';

const VERT = '#0B3B2C';
const chemin = (f) => new URL(f, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const source = chemin('./logo-source.jpg');

// 1. Repérer le cercle : premier pixel non noir depuis chaque bord, sur les axes centraux
const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const clair = (x, y) => { const i = (y * W + x) * 3; return data[i] + data[i + 1] + data[i + 2] > 60; };
const premier = (pas) => { let t = 0; while (!pas(t)) t++; return t; };
const gauche = premier((t) => clair(t, H >> 1));
const droite = W - 1 - premier((t) => clair(W - 1 - t, H >> 1));
const haut = premier((t) => clair(W >> 1, t));
const bas = H - 1 - premier((t) => clair(W >> 1, H - 1 - t));
const cx = (gauche + droite) / 2;
const cy = (haut + bas) / 2;
const r = Math.min(droite - gauche, bas - haut) / 2 - 3; // 3 px de marge pour ne garder aucun bord noir

// 2. Découpe carrée centrée sur le cercle, puis masque rond
const cote = Math.floor(r * 2);
const gaucheCrop = Math.max(0, Math.round(cx - r));
const hautCrop = Math.max(0, Math.round(cy - r));
const masque = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}"><circle cx="${cote / 2}" cy="${cote / 2}" r="${cote / 2}" fill="#fff"/></svg>`
);
const rond = await sharp(source)
  .extract({ left: gaucheCrop, top: hautCrop, width: cote, height: cote })
  .ensureAlpha()
  .composite([{ input: masque, blend: 'dest-in' }])
  .png()
  .toBuffer();

const taille = (n) => sharp(rond).resize(n, n, { kernel: 'lanczos3' });
const surFond = async (n, part, f) => {
  const logo = await taille(Math.round(n * part)).png().toBuffer();
  await sharp({ create: { width: n, height: n, channels: 4, background: VERT } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(chemin(f));
};

// 3. Logo affiché dans l'application (écran de connexion, accueil, chargement)
await taille(320).webp({ quality: 88 }).toFile(chemin('../src/assets/logo.webp'));

// 4. Icônes : favicon et icônes standard sur fond transparent
await taille(64).png().toFile(chemin('../public/favicon.png'));
await taille(192).png().toFile(chemin('../public/pwa-192.png'));
await taille(512).png().toFile(chemin('../public/pwa-512.png'));

// 5. Apple (pas de transparence) et "maskable" Android (le cercle tient dans la zone de sécurité de 80 %)
await surFond(180, 0.92, '../public/apple-touch-icon.png');
await surFond(512, 0.8, '../public/pwa-maskable-512.png');

console.log(`Cercle détecté : centre (${cx}, ${cy}), rayon ${r}. Logo et icônes générés.`);
