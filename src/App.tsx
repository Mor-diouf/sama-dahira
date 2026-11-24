import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { estBureau } from './lib/types';
import { Layout } from './components/Layout';
import { Logo } from './components/Mosquee';
import Connexion from './pages/Connexion';
import Accueil from './pages/Accueil';
import Membres from './pages/Membres';
import Annonces from './pages/Annonces';
import Projets from './pages/Projets';
import Calendrier from './pages/Calendrier';
import Archives from './pages/Archives';
import Cotiser from './pages/Cotiser';
import Documents from './pages/Documents';
import Plus from './pages/Plus';
import Bureau from './pages/Bureau';

export default function App() {
  const { membre, pret } = useAuth();

  if (!pret) {
    return (
      <div className="connexion" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Logo taille={120} />
      </div>
    );
  }
  if (!membre) return <Connexion />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="membres" element={<Membres />} />
        <Route path="annonces" element={<Annonces />} />
        <Route path="projets" element={<Projets />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="archives" element={<Archives />} />
        <Route path="cotiser" element={<Cotiser />} />
        <Route path="documents" element={<Documents />} />
        <Route path="plus" element={<Plus />} />
        {estBureau(membre) && <Route path="bureau" element={<Bureau />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
