export default function ResumenPage() {
  return (
    <section className="dashboard-grid">
      <article className="panel-card panel-card-hero">
        <p className="panel-kicker">Hoy</p>
        <h2 className="panel-title">12 reservas activas</h2>
        <p className="panel-description">Operacion estable con 5 dispositivos en campo.</p>
      </article>

      <article className="panel-card">
        <p className="panel-kicker">Disponibilidad</p>
        <h3 className="panel-subtitle">Dispositivos listos</h3>
        <ul className="metric-list">
          <li>
            <span>Robots</span>
            <strong>8/10</strong>
          </li>
          <li>
            <span>Drones</span>
            <strong>4/6</strong>
          </li>
          <li>
            <span>Mantenimiento</span>
            <strong>2</strong>
          </li>
        </ul>
      </article>

      <article className="panel-card">
        <p className="panel-kicker">Estado</p>
        <h3 className="panel-subtitle">Flota en mantenimiento</h3>
        <p className="single-metric">2 equipos</p>
      </article>

      <article className="panel-card panel-card-wide clean-list">
        <div className="section-head">
          <p className="panel-kicker">Actividad</p>
          <a href="#" className="ghost-link">
            Ver todo
          </a>
        </div>
        <ul className="timeline-list">
          <li>
            <span>Reserva #84 aprobada</span>
            <small>hace 4 min</small>
          </li>
          <li>
            <span>Drone DR-201 en carga</span>
            <small>hace 12 min</small>
          </li>
          <li>
            <span>Bitacora cerrada en Bloque B</span>
            <small>hace 21 min</small>
          </li>
        </ul>
      </article>
    </section>
  );
}
