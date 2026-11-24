#!/usr/bin/env node
/**
 * Import des membres et création de leurs codes d'accès.
 *
 * Utilisation :
 *   npm run import-membres -- scripts/membres.csv          → importe / met à jour les membres
 *   npm run import-membres -- --nouveau-code 771234567     → génère un nouveau code pour un membre
 *
 * Le fichier CSV (séparateur ; ou ,) doit avoir ces colonnes :
 *   prenom;nom;telephone;quartier;commission;role;telephone_visible;date_adhesion
 * role : membre, bureau, tresorier ou controleur. telephone_visible : oui / non.
 *
 * Les codes sont écrits dans membres-codes-AAAA-MM-JJ.csv, avec un lien WhatsApp prêt à envoyer.
 * Ce fichier est confidentiel : supprimez-le après distribution des codes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAINE = process.env.VITE_AUTH_DOMAIN || 'membres.sama-dahira.app';
const LIEN_APP = process.env.LIEN_APPLICATION || '';

if (!URL || !SERVICE) {
  console.error('Renseignez VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  process.exit(1);
}
const sb = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const normaliser = (t) => {
  let d = String(t ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9) d = `221${d}`;
  return d;
};
const email = (tel) => `${tel}@${DOMAINE}`;
const nouveauCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
const ROLES = ['membre', 'bureau', 'tresorier', 'controleur'];

function lireCsv(texte) {
  const lignes = texte.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const sep = lignes[0].includes(';') ? ';' : ',';
  const decouper = (l) => {
    const res = []; let cur = ''; let q = false;
    for (const c of l) {
      if (c === '"') q = !q;
      else if (c === sep && !q) { res.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    res.push(cur.trim());
    return res;
  };
  const entetes = decouper(lignes[0]).map((h) => h.toLowerCase());
  return lignes.slice(1).map((l) => Object.fromEntries(decouper(l).map((v, i) => [entetes[i], v])));
}

// Trouve un utilisateur Auth par e-mail (parcourt les pages)
async function trouverUtilisateur(mail) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === mail);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

function messageWhatsApp(prenom, tel, code) {
  const texte = `Assalamou alaykoum ${prenom}. Voici votre accès à l'application du Dahira${LIEN_APP ? ` (${LIEN_APP})` : ''} :\nNuméro : ${tel.slice(3)}\nCode : ${code}\nGardez ce code pour vous.`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(texte)}`;
}

async function ecrireCodes(lignes) {
  const nom = `membres-codes-${new Date().toISOString().slice(0, 10)}.csv`;
  const csv = ['prenom;nom;telephone;code;lien_whatsapp', ...lignes.map((l) => [l.prenom, l.nom, l.tel, l.code, l.lien].join(';'))].join('\n');
  await writeFile(nom, '﻿' + csv, 'utf8');
  console.log(`\n${lignes.length} code(s) écrits dans ${nom} (fichier confidentiel).`);
}

async function importer(fichier) {
  const membres = lireCsv(await readFile(fichier, 'utf8'));
  const codes = [];
  let crees = 0, maj = 0, erreurs = 0;

  for (const m of membres) {
    const tel = normaliser(m.telephone);
    const etiquette = `${m.prenom} ${m.nom} (${tel})`;
    try {
      if (!m.prenom || !m.nom || tel.length < 11) throw new Error('prénom, nom ou téléphone manquant');
      const role = ROLES.includes((m.role || '').toLowerCase()) ? m.role.toLowerCase() : 'membre';
      const fiche = {
        prenom: m.prenom, nom: m.nom, telephone: tel,
        quartier: m.quartier || null, commission: m.commission || null, role,
        telephone_visible: /^(oui|o|yes|1|true)$/i.test(m.telephone_visible || ''),
        ...(m.date_adhesion ? { date_adhesion: m.date_adhesion } : {}),
      };

      const { data: existant } = await sb.from('membres').select('id,user_id').eq('telephone', tel).maybeSingle();
      let userId = existant?.user_id ?? null;

      if (!userId) {
        const code = nouveauCode();
        const { data, error } = await sb.auth.admin.createUser({ email: email(tel), password: code, email_confirm: true, user_metadata: { prenom: m.prenom, nom: m.nom } });
        if (error) {
          // Le compte existe déjà côté Auth : on le relie sans changer son code
          const u = await trouverUtilisateur(email(tel));
          if (!u) throw error;
          userId = u.id;
        } else {
          userId = data.user.id;
          codes.push({ prenom: m.prenom, nom: m.nom, tel, code, lien: messageWhatsApp(m.prenom, tel, code) });
        }
      }

      const { error } = existant
        ? await sb.from('membres').update({ ...fiche, user_id: userId }).eq('id', existant.id)
        : await sb.from('membres').insert({ ...fiche, user_id: userId });
      if (error) throw error;
      existant ? maj++ : crees++;
      console.log(`✓ ${etiquette}`);
    } catch (e) {
      erreurs++;
      console.error(`✗ ${etiquette} : ${e.message}`);
    }
  }
  console.log(`\nTerminé : ${crees} créé(s), ${maj} mis à jour, ${erreurs} erreur(s).`);
  if (codes.length) await ecrireCodes(codes);
}

async function regenerer(telephone) {
  const tel = normaliser(telephone);
  const { data: m, error } = await sb.from('membres').select('prenom,nom,user_id').eq('telephone', tel).maybeSingle();
  if (error || !m?.user_id) throw new Error(`Aucun compte trouvé pour ${tel}`);
  const code = nouveauCode();
  const { error: e2 } = await sb.auth.admin.updateUserById(m.user_id, { password: code });
  if (e2) throw e2;
  console.log(`Nouveau code pour ${m.prenom} ${m.nom} : ${code}`);
  console.log(messageWhatsApp(m.prenom, tel, code));
}

const args = process.argv.slice(2);
try {
  if (args[0] === '--nouveau-code' && args[1]) await regenerer(args[1]);
  else if (args[0]) await importer(args[0]);
  else console.log('Usage : npm run import-membres -- fichier.csv   |   npm run import-membres -- --nouveau-code 771234567');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
