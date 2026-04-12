import { LogoutButton } from "../../components/logout-button";
import { PanelNav } from "../../components/panel-nav";
import { UserSessionChip } from "../../components/user-session-chip";

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-stage">
      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="brand-block">
            <div className="brand-avatar">
              <span className="brand-avatar-text">UT</span>
            </div>
            <div className="brand-copy">
              <p className="brand-title">Uni Transport</p>
              <p className="brand-subtitle">Sistema Central</p>
            </div>
          </div>

          <PanelNav />
        </aside>

        <div className="app-main">
          <header className="app-header">
            <div>
              <p className="page-kicker">Universidad</p>
              <h1 className="page-title">Panel de Operaciones</h1>
            </div>
            <div className="header-actions">
              <UserSessionChip />
              <LogoutButton />
            </div>
          </header>

          <main className="page-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
