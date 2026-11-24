import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Client Supabase, ou null tant que les accès ne sont pas renseignés (mode démonstration) */
export const supabase = url && cle && !url.includes('xxxx') ? createClient(url, cle) : null;

export const MODE_DEMO = supabase === null;
