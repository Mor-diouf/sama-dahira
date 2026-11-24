import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CalendarDays, HandCoins, House, LayoutGrid, Sprout } from 'lucide-react';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <main className="contenu">
        <Outlet />
      </main>
      <nav className="nav" aria-label="Navigation principale">
        <NavLink to="/" end><House size={22} />Accueil</NavLink>
        <NavLink to="/calendrier"><CalendarDays size={22} />Calendrier</NavLink>
        <NavLink to="/cotiser" aria-label="Cotiser">
          <span className="nav-centre"><HandCoins size={26} /></span>
          Cotiser
        </NavLink>
        <NavLink to="/projets"><Sprout size={22} />Projets</NavLink>
        <NavLink to="/plus"><LayoutGrid size={22} />Plus</NavLink>
      </nav>
    </div>
  );
}
