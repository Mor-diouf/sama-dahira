import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { messageErreur } from './api';

/** Charge des données asynchrones avec état de chargement, erreur et rechargement */
export function useDonnees<T>(charger: () => Promise<T>, deps: unknown[] = []) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const ref = useRef(charger);
  ref.current = charger;

  const recharger = useCallback(async () => {
    setErreur(null);
    try {
      setDonnees(await ref.current());
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    setChargement(true);
    recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { donnees, chargement, erreur, recharger, setDonnees };
}

/* ----- Notifications éphémères ----- */
type Toast = { texte: string; erreur?: boolean } | null;
const ToastCtx = createContext<(texte: string, erreur?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const minuteur = useRef<number>();
  const afficher = useCallback((texte: string, erreur?: boolean) => {
    window.clearTimeout(minuteur.current);
    setToast({ texte, erreur });
    minuteur.current = window.setTimeout(() => setToast(null), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={afficher}>
      {children}
      {toast && (
        <div className={`toast${toast.erreur ? ' erreur' : ''}`} role="status">
          {toast.erreur ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
          {toast.texte}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Exécute une action en affichant le résultat dans un toast */
export function useAction() {
  const toast = useToast();
  const [enCours, setEnCours] = useState(false);
  const executer = useCallback(async (action: () => Promise<unknown>, succes?: string) => {
    setEnCours(true);
    try {
      await action();
      if (succes) toast(succes);
      return true;
    } catch (e) {
      toast(messageErreur(e), true);
      return false;
    } finally {
      setEnCours(false);
    }
  }, [toast]);
  return { executer, enCours };
}
