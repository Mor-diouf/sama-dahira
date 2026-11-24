import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, MODE_DEMO } from './supabase';
import { definirMembreCourant } from './api';
import { membres as membresDemo, DEMO_PROFILS } from './demo';
import { normaliserTelephone } from './format';
import { DOMAINE_IDENTIFIANT } from '../config';
import type { Membre } from './types';

export type ProfilDemo = keyof typeof DEMO_PROFILS;

interface AuthCtx {
  membre: Membre | null;
  pret: boolean;
  connecter: (telephone: string, code: string, profilDemo?: ProfilDemo) => Promise<void>;
  deconnecter: () => Promise<void>;
  majMembre: (m: Partial<Membre>) => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const CLE_DEMO = 'sama-dahira-demo-profil';
const COLONNES = 'id,prenom,nom,telephone,quartier,commission,role,telephone_visible,date_adhesion';

async function chargerMembre(userId: string): Promise<Membre | null> {
  const { data, error } = await supabase!.from('membres').select(COLONNES).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Membre | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [membre, setMembre] = useState<Membre | null>(null);
  const [pret, setPret] = useState(false);

  const appliquer = useCallback((m: Membre | null) => {
    definirMembreCourant(m);
    setMembre(m);
  }, []);

  useEffect(() => {
    if (MODE_DEMO) {
      let id: string | null = null;
      try { id = localStorage.getItem(CLE_DEMO); } catch { /* stockage indisponible */ }
      appliquer(membresDemo.find((m) => m.id === id) ?? null);
      setPret(true);
      return;
    }
    supabase!.auth.getSession()
      .then(async ({ data }) => appliquer(data.session ? await chargerMembre(data.session.user.id) : null))
      .catch(() => appliquer(null))
      .finally(() => setPret(true));
    const { data: abo } = supabase!.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') appliquer(null);
    });
    return () => abo.subscription.unsubscribe();
  }, [appliquer]);

  const connecter = useCallback(async (telephone: string, code: string, profilDemo?: ProfilDemo) => {
    if (MODE_DEMO) {
      const id = DEMO_PROFILS[profilDemo ?? 'membre'];
      try { localStorage.setItem(CLE_DEMO, id); } catch { /* ignoré */ }
      appliquer(membresDemo.find((m) => m.id === id)!);
      return;
    }
    const tel = normaliserTelephone(telephone);
    if (tel.length < 11) throw new Error('Numéro de téléphone invalide.');
    const { data, error } = await supabase!.auth.signInWithPassword({ email: `${tel}@${DOMAINE_IDENTIFIANT}`, password: code.trim() });
    if (error) throw new Error(error.message);
    const m = await chargerMembre(data.user.id);
    if (!m) {
      await supabase!.auth.signOut();
      throw new Error("Ce compte n'est relié à aucun membre. Contactez le bureau.");
    }
    appliquer(m);
  }, [appliquer]);

  const deconnecter = useCallback(async () => {
    if (MODE_DEMO) {
      try { localStorage.removeItem(CLE_DEMO); } catch { /* ignoré */ }
    } else {
      await supabase!.auth.signOut();
    }
    appliquer(null);
  }, [appliquer]);

  const majMembre = useCallback((p: Partial<Membre>) => {
    setMembre((m) => {
      const n = m ? { ...m, ...p } : m;
      definirMembreCourant(n);
      return n;
    });
  }, []);

  return <Ctx.Provider value={{ membre, pret, connecter, deconnecter, majMembre }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth hors AuthProvider');
  return c;
}

/** À utiliser dans les pages protégées : le membre est forcément connecté */
export function useMoi(): Membre {
  return useAuth().membre!;
}
