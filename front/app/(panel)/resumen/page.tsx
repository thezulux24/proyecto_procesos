"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardOverview = {
  generatedAt: string;
  metrics: {
    activeReservations: number;
    activeServices: number;
    availableDevices: number;
    inServiceDevices: number;
    maintenanceDevices: number;
    robotAvailability: { available: number; total: number };
    droneAvailability: { available: number; total: number };
    cloudVideos: number;
  };
  activity: Array<{
    title: string;
    detail: string;
    timestamp: string;
  }>;
  videos: Array<{
    id: number;
    serviceLogId: number | null;
    cloudUrl: string;
    deviceName?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const fallbackOverview: DashboardOverview = {
  generatedAt: new Date().toISOString(),
  metrics: {
    activeReservations: 12,
    activeServices: 5,
    availableDevices: 12,
    inServiceDevices: 5,
    maintenanceDevices: 2,
    robotAvailability: { available: 8, total: 10 },
    droneAvailability: { available: 4, total: 6 },
    cloudVideos: 1,
  },
  activity: [
    {
      title: "Reserva #84 aprobada",
      detail: "hace 4 min",
      timestamp: new Date().toISOString(),
    },
    {
      title: "Drone DR-201 en carga",
      detail: "hace 12 min",
      timestamp: new Date().toISOString(),
    },
    {
      title: "Bitacora cerrada en Bloque B",
      detail: "hace 21 min",
      timestamp: new Date().toISOString(),
    },
  ],
  videos: [],
};

function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("auth_token") ?? "";
}

export default function ResumenPage() {
  const [overview, setOverview] = useState<DashboardOverview>(fallbackOverview);

  const heroText = useMemo(() => {
    return `Operacion estable con ${overview.metrics.inServiceDevices} dispositivos en campo.`;
  }, [overview.metrics.inServiceDevices]);

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;

    async function loadOverview() {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/dashboard/overview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("No fue posible cargar el resumen.");
        }

        const data = (await response.json()) as DashboardOverview;
        if (!cancelled) {
          setOverview(data);
        }

        source = new EventSource(`${API_URL}/dashboard/stream?token=${encodeURIComponent(token)}`);
        source.onmessage = (event) => {
          try {
            const nextOverview = JSON.parse(event.data) as DashboardOverview;
            if (!cancelled) {
              setOverview(nextOverview);
            }
          } catch {
            // Keep the last valid snapshot if the stream payload is not valid JSON.
          }
        };
      } catch {
        if (!cancelled) {
          setOverview(fallbackOverview);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
      if (source) {
        source.close();
      }
    };
  }, []);

  const robotAvailabilityLabel = `${overview.metrics.robotAvailability.available}/${overview.metrics.robotAvailability.total}`;
  const droneAvailabilityLabel = `${overview.metrics.droneAvailability.available}/${overview.metrics.droneAvailability.total}`;

  return (
    <section className="dashboard-grid">
      <article className="panel-card panel-card-hero">
        <p className="panel-kicker">Hoy</p>
        <h2 className="panel-title">{overview.metrics.activeReservations} reservas activas</h2>
        <p className="panel-description">{heroText}</p>
      </article>

      <article className="panel-card">
        <p className="panel-kicker">Disponibilidad</p>
        <h3 className="panel-subtitle">Dispositivos listos</h3>
        <ul className="metric-list">
          <li>
            <span>Robots</span>
            <strong>{robotAvailabilityLabel}</strong>
          </li>
          <li>
            <span>Drones</span>
            <strong>{droneAvailabilityLabel}</strong>
          </li>
          <li>
            <span>Mantenimiento</span>
            <strong>{overview.metrics.maintenanceDevices}</strong>
          </li>
        </ul>
      </article>

      <article className="panel-card">
        <p className="panel-kicker">Estado</p>
        <h3 className="panel-subtitle">Flota en mantenimiento</h3>
        <p className="single-metric">{overview.metrics.maintenanceDevices} equipos</p>
      </article>

      <article className="panel-card panel-card-wide clean-list">
        <div className="section-head">
          <p className="panel-kicker">Actividad</p>
          <a href="/bitacora" className="ghost-link">
            Ver todo
          </a>
        </div>
        <ul className="timeline-list">
          {overview.activity.map((item) => (
            <li key={`${item.title}-${item.timestamp}`}>
              <span>{item.title}</span>
              <small>{item.detail}</small>
            </li>
          ))}
        </ul>
      </article>

    </section>
  );
}
