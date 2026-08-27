import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { clearUserData } from '../lib/profile';
import '../styles/optimize.css';

type WorkspacePage = 'optimize' | 'jobs' | 'subscription';

export default function WorkspaceLayout({ activePage, children }: {
  activePage: WorkspacePage;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  async function signOut() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) clearUserData(user.id);
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div className="optimize">
      <div className="dashboardShell">
        <aside className="dashboardSidebar">
          <Link to="/" className="sidebarBrand">
            <img className="sidebarFlag" src="/flag.webp" alt="Swiss flag" />
            <strong>Apertus Job Agent</strong>
          </Link>

          <p className="sidebarLabel">Workspace</p>
          <nav className="sidebarNav">
            <NavLink to="/optimize" className={activePage === 'optimize' ? 'active' : undefined}>Optimize CV</NavLink>
            <NavLink to="/jobs" className={activePage === 'jobs' ? 'active' : undefined}>Find Job</NavLink>
            <NavLink to="/subscription" className={activePage === 'subscription' ? 'active' : undefined}>Subscription</NavLink>
          </nav>

          <div className="sidebarFooter">
            <button onClick={signOut}>Sign out</button>
          </div>
        </aside>

        <main className="dashboardMain">
          <div className="container">{children}</div>
        </main>
      </div>
    </div>
  );
}
